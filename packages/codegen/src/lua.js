/**
 * Prints a planned widget as a LuaJIT module, from the same plan the JavaScript is printed from. JavaScript's meaning
 * is kept exactly, or the generator refuses with the reason: `null` and `undefined` are `nil` (so a field is absent
 * when it is null, an array never holds either, and `in` is only read where the field can't be null); arrays are
 * 1-based tables, every index shifted; numbers are doubles in both, `%` is `math.fmod`, `Math.max`/`min` keep
 * JavaScript's `NaN` and `-0` in local functions; strings are UTF-8 bytes, so only operations that mean the same on
 * bytes as on UTF-16 (equality, `startsWith`, `endsWith`, `includes`, concatenation) are taken.
 *
 * A step's result is two return values (state, effects). The effects table is the module's own, emptied by the next
 * call: the caller reads it before calling again.
 */

import ts from 'typescript'

import { effectsOf, factoryKnown } from './effects.js'
import { capital } from './normalize.js'
import { elementOf, fieldsOf, hasNull, hasUndefined, isNumber, isString, membersOf, tupleOf } from './types.js'
import { within } from './widths.js'

/** @import { Binding, Constant, Expr, Fn, Pattern, Stmt } from './ir.js' */
/** @import { Call, Effects } from './effects.js' */
/** @import { Plan } from './plan.js' */
/** @import { Range } from './widths.js' */

const KEYWORDS = new Set([
  'and',
  'break',
  'do',
  'else',
  'elseif',
  'end',
  'false',
  'for',
  'function',
  'goto',
  'if',
  'in',
  'local',
  'nil',
  'not',
  'or',
  'repeat',
  'return',
  'then',
  'true',
  'until',
  'while',
])
const NAME = /^[A-Za-z_]\w*$/u

/** Helpers a module defines when it uses them: where JavaScript's operation is not Lua's */
const HELPERS = {
  includes: [
    '-- Array.prototype.includes: SameValueZero, so NaN is found',
    'local function includes(list, value)',
    '  for i = 1, #list do',
    '    local item = list[i]',
    '    if item == value or (item ~= item and value ~= value) then return true end',
    '  end',
    '  return false',
    'end',
  ],
  indexOf: [
    '-- Array.prototype.indexOf: the 0-based index of the first item === value, or -1',
    'local function index_of(list, value)',
    '  for i = 1, #list do',
    '    if list[i] == value then return i - 1 end',
    '  end',
    '  return -1',
    'end',
  ],
  max: [
    '-- Math.max of two: NaN if either is, and +0 over -0',
    'local function max(a, b)',
    '  if a > b then return a end',
    '  if b > a then return b end',
    '  if a ~= a then return a end',
    '  if b ~= b then return b end',
    '  if a == 0 then return a + b end',
    '  return a',
    'end',
  ],
  min: [
    '-- Math.min of two: NaN if either is, and -0 over +0',
    'local function min(a, b)',
    '  if a < b then return a end',
    '  if b < a then return b end',
    '  if a ~= a then return a end',
    '  if b ~= b then return b end',
    '  if a == 0 then return -(-a - b) end',
    '  return a',
    'end',
  ],
  slice: [
    '-- An index as Array.prototype.slice takes it: truncated (NaN 0), from the end if negative, clamped to the list',
    'local function slice_index(index, count)',
    '  if index ~= index then return 0 end',
    '  if index < 0 then',
    '    index = math.ceil(index) + count',
    '    return index < 0 and 0 or index',
    '  end',
    '  index = math.floor(index)',
    '  return index > count and count or index',
    'end',
    '',
    '-- Array.prototype.slice(from, to): 0-based; to nil is the end',
    'local function slice(list, from, to)',
    '  local count = #list',
    '  local first = slice_index(from, count)',
    '  local last = to == nil and count or slice_index(to, count)',
    '  local out = {}',
    '  for i = first + 1, last do out[i - first] = list[i] end',
    '  return out',
    'end',
  ],
  int32: [
    '-- ToInt32, as a JavaScript bitwise operator converts its operands: truncated, NaN and infinities 0, modulo 2^32',
    'local function int32(x)',
    '  local fast = bit.tobit(x)',
    '  if fast == x then return fast end',
    '  if x ~= x or x == math.huge or x == -math.huge then return 0 end',
    '  if x < 0 then x = math.ceil(x) else x = math.floor(x) end',
    '  return bit.tobit(x % 4294967296)',
    'end',
  ],
  includesIn: [
    '-- Whether list.slice(from, to) includes value (SameValueZero, as includes), without making the slice',
    'local function includes_in(list, value, from, to)',
    '  local count = #list',
    '  local last = to == nil and count or slice_index(to, count)',
    '  for i = slice_index(from, count) + 1, last do',
    '    local item = list[i]',
    '    if item == value or (item ~= item and value ~= value) then return true end',
    '  end',
    '  return false',
    'end',
  ],
  trunc: [
    '-- Math.trunc',
    'local function trunc(x)',
    '  if x >= 0 then return math.floor(x) end',
    '  return math.ceil(x)',
    'end',
  ],
}

/**
 * A reason the generator can't translate something exactly
 */
class RefusedError extends Error {
  /**
   * @param {string} message - Why, and where
   */
  constructor(message) {
    super(message)
    this.name = 'RefusedError'
  }
}

/**
 * Refuses, naming the place
 * @param {Expr | Stmt} node - Where
 * @param {string} message - Why
 * @returns {never} Never
 */
function refuse(node, message) {
  const file = node.at.getSourceFile()
  const { character, line } = file.getLineAndCharacterOfPosition(node.at.getStart())
  const where = `${file.fileName.split('/').slice(-3).join('/')}:${String(line + 1)}:${String(character + 1)}`
  throw new RefusedError(`${where}: ${message}`)
}

/** int32's range */
const INT32 = { hi: 2 ** 31 - 1, int: true, lo: -(2 ** 31) }

/** Integers LuaJIT's bit operations take as JavaScript's ToInt32 does: modulo 2^32 */
const EXACT_BITS = { hi: 2 ** 51, int: true, lo: -(2 ** 51) }

/**
 * @param {Expr} value - An expression
 * @returns {boolean} Whether it is the literal 0
 */
function isZero(value) {
  return value.kind === 'literal' && value.value === 0
}

/**
 * Prints a planned widget as Lua, or gives why it can't
 * @param {Plan} planned - The plan
 * @param {ts.TypeChecker} checker - The checker
 * @param {Readonly<{ header: string, ranges: ReadonlyMap<ts.Node, Range> }>} imports - The module's header (a child widget is the module generated beside it)
 * @param {ReadonlyMap<string, Effects>} others - The effects of every widget generated, by name
 * @returns {Readonly<{ lua: string }> | Readonly<{ refused: readonly string[] }>} The module, or the reasons
 */
function printLua(planned, checker, imports, others) {
  try {
    return { lua: luaModule(planned, checker, imports, others) }
  } catch (error) {
    if (error instanceof RefusedError) {
      return { refused: [error.message] }
    }
    throw error
  }
}

/**
 * The module's source
 * @param {Plan} planned - The plan
 * @param {ts.TypeChecker} checker - The checker
 * @param {Readonly<{ header: string, ranges: ReadonlyMap<ts.Node, Range> }>} imports - The module's header
 * @param {ReadonlyMap<string, Effects>} others - The effects of every widget generated, by name
 * @returns {string} The source
 */
function luaModule(planned, checker, imports, others) {
  const { widget } = planned
  const effects = effectsOf(planned, factoryKnown(planned))
  /** @type {Map<number, string>} */
  const names = new Map()
  /** @type {Set<string>} */
  const taken = new Set([
    'M',
    'bit',
    'host',
    ...Object.keys(HELPERS),
    'index_of',
    'slice_index',
    'same',
    'HERE',
    'EFFECTS',
    'counted',
    'current',
    'upward',
    'stopped',
    'prevented',
    'own_host',
    'deferred',
    'defer_host',
    'to_child',
    'sync_props',
    'deliver_in',
    'deliver',
    'start',
    widget.name,
    ...(widget.composite?.children ?? []).flatMap((child) =>
      ['_host', '_from', '_paths', '_synced'].map((end) => `${snake(child.name)}${end}`),
    ),
  ])
  /** @type {Set<keyof typeof HELPERS>} */
  const helpers = new Set()

  /**
   * A module-level name
   * @param {Fn | Constant} owner - What it names
   * @returns {string} The name
   */
  const nameOf = (owner) => {
    const known = names.get(owner.id)
    if (known !== undefined) {
      return known
    }
    const base = snake(owner.module === widget.module ? owner.name : `${prefixOf(owner.module)}${capital(owner.name)}`)
    let name = KEYWORDS.has(base) ? `${base}_` : base
    for (let count = 2; taken.has(name); count += 1) {
      name = `${base}${String(count)}`
    }
    taken.add(name)
    names.set(owner.id, name)
    return name
  }
  for (const fn of planned.fns) {
    nameOf(fn)
  }
  for (const constant of planned.constants) {
    nameOf(constant)
  }

  /** @type {Map<Binding, string>} */
  let locals = new Map()
  /** @type {Set<string>} */
  let used = new Set()
  let temps = 0

  /**
   * A local's name, unique in its function
   * @param {Binding} binding - The local
   * @returns {string} Its name
   */
  const localName = (binding) => {
    const known = locals.get(binding)
    if (known !== undefined) {
      return known
    }
    const base = KEYWORDS.has(snake(binding.name)) ? `${snake(binding.name)}_` : snake(binding.name)
    let name = base
    for (let count = 2; used.has(name) || taken.has(name); count += 1) {
      name = `${base}${String(count)}`
    }
    used.add(name)
    locals.set(binding, name)
    return name
  }

  /**
   * A new local's name
   * @param {string} base - What it holds
   * @returns {string} A name not used in the function
   */
  const temp = (base) => {
    temps += 1
    let name = base
    for (let count = 2; used.has(name) || taken.has(name); count += 1) {
      name = `${base}${String(count)}`
    }
    used.add(name)
    return name
  }

  /**
   * Checks a type can be held in Lua exactly: no array of a type with `nil` among its values
   * @param {ts.Type} type - The type
   * @param {Expr} at - Where
   * @returns {void}
   */
  const checkHoles = (type, at) => {
    const element = elementOf(checker, type)
    if (element !== null && (hasNull(element) || hasUndefined(element))) {
      refuse(
        at,
        `an array of ${checker.typeToString(element)}: null in a Lua table is a hole, which # and ipairs stop at`,
      )
    }
    const tuple = tupleOf(checker, checker.getNonNullableType(type))
    if (tuple?.some((one) => hasNull(one) || hasUndefined(one)) === true) {
      refuse(at, 'a tuple holding null, as data: null in a Lua table is a hole')
    }
  }

  /**
   * Whether a type's values can be `false` or `nil`, so `a and b or c` can't choose `b`
   * @param {ts.Type} type - The type
   * @returns {boolean} Whether they can
   */
  const falsy = (type) => {
    const members = membersOf(type).flatMap((one) => {
      if ((one.flags & (ts.TypeFlags.TypeParameter | ts.TypeFlags.Substitution)) === 0) {
        return [one]
      }
      const constraint = checker.getBaseConstraintOfType(one)
      return constraint === undefined || constraint === one ? [checker.getUnknownType()] : membersOf(constraint)
    })
    return members.some(
      (one) =>
        (one.flags &
          (ts.TypeFlags.BooleanLike |
            ts.TypeFlags.Null |
            ts.TypeFlags.Undefined |
            ts.TypeFlags.Unknown |
            ts.TypeFlags.Any)) !==
        0,
    )
  }

  /**
   * Whether a function returns a tuple, which Lua returns as several values
   * @param {Fn} fn - The function
   * @returns {boolean} Whether it does
   */
  const returnsTuple = (fn) => {
    const plannedFn = planned.planned.get(fn) ?? fn
    if (plannedFn.out !== null) {
      return false
    }
    return tupleOf(checker, checker.getReturnTypeOfSignature(fn.type)) !== null
  }

  /**
   * Prints an expression; statements it needs first go to `pre`
   * @param {Expr} value - The expression
   * @param {string[]} pre - Lines before, at the current indent
   * @param {string} indent - The indent
   * @returns {string} The expression
   */
  const expr = (value, pre, indent) => {
    switch (value.kind) {
      case 'literal': {
        if (value.value === null) {
          return 'nil'
        }
        if (typeof value.value === 'string') {
          return quote(value.value)
        }
        if (typeof value.value === 'number') {
          return numberText(value.value)
        }
        return String(value.value)
      }
      case 'undefined': {
        return 'nil'
      }
      case 'local': {
        return localName(value.binding)
      }
      case 'constant': {
        return nameOf(value.constant)
      }
      case 'function': {
        return nameOf(value.fn)
      }
      case 'field': {
        return field(value, pre, indent)
      }
      case 'index': {
        const object = operand(value.object, pre, indent)
        if (value.index.kind === 'literal' && typeof value.index.value === 'number') {
          return `${object}[${numberText(value.index.value + 1)}]`
        }
        if (!isNumber(value.index.type)) {
          refuse(value, 'an index that is not a number')
        }
        const index = isPure(value.index) ? operand(value.index, pre, indent) : held(value.index, 'index', pre, indent)
        const indexRange = imports.ranges.get(value.index.at)
        if (indexRange !== undefined && indexRange.int && indexRange.lo >= 0) {
          return `${object}[${index} + 1]`
        }
        if (!falsy(checker.getNonNullableType(value.type))) {
          return `(${index} >= 0 and ${object}[${index} + 1] or nil)`
        }
        const name = temp('item')
        pre.push(`${indent}local ${name}`, `${indent}if ${index} >= 0 then ${name} = ${object}[${index} + 1] end`)
        return name
      }
      case 'record': {
        return record(value, pre, indent)
      }
      case 'array': {
        checkHoles(value.type, value)
        return array(value, pre, indent)
      }
      case 'call': {
        if (returnsTuple(value.fn)) {
          refuse(value, 'a call returning a tuple used as a value: Lua returns it as several values')
        }
        return `${nameOf(value.fn)}(${args(value.args, pre, indent)})`
      }
      case 'builtin': {
        return builtin(value, pre, indent)
      }
      case 'method': {
        return method(value, pre, indent)
      }
      case 'unary': {
        if (value.op === '!') {
          return `not ${operand(value.operand, pre, indent)}`
        }
        if (value.op === '+') {
          return operand(value.operand, pre, indent)
        }
        return `-${operand(value.operand, pre, indent)}`
      }
      case 'binary': {
        return binary(value, pre, indent)
      }
      case 'logical': {
        return logical(value, pre, indent)
      }
      case 'conditional': {
        return conditional(value, pre, indent)
      }
      case 'has': {
        for (const one of membersOf(checker.getNonNullableType(value.object.type))) {
          const prop = one.getProperty(value.name)
          if (prop !== undefined) {
            const propType = checker.getTypeOfSymbol(prop)
            if (hasNull(propType) || hasUndefined(propType)) {
              refuse(
                value,
                `\`'${value.name}' in\` where the field may be null: an absent and a nil field are one in Lua`,
              )
            }
          }
        }
        return `${operand(value.object, pre, indent)}${member(value.name)} ~= nil`
      }
      case 'template': {
        const parts = value.parts.map((part) => {
          if (typeof part === 'string') {
            return quote(part)
          }
          if (!isString(part.type)) {
            refuse(part, 'a number in a template: Lua writes numbers differently (tostring)')
          }
          return operand(part, pre, indent)
        })
        return parts.length === 0 ? '""' : parts.join(' .. ')
      }
      case 'regex': {
        return refuse(value, 'a regular expression: Lua patterns are not JavaScript regular expressions')
      }
      case 'lambda': {
        return refuse(value, 'a function value outside an array method')
      }
      default: {
        throw new Error('unreachable')
      }
    }
  }

  /**
   * An expression, parenthesized unless it is an atom
   * @param {Expr} value - The expression
   * @param {string[]} pre - Lines before
   * @param {string} indent - The indent
   * @returns {string} The operand
   */
  const operand = (value, pre, indent) => {
    const text = expr(value, pre, indent)
    return /^[\w.[\]"]+$/u.test(text) || /^[\w.]+\([^()]*\)$/u.test(text) ? text : `(${text})`
  }

  /**
   * Arguments, each evaluated in order before what a later one needs first
   * @param {readonly Expr[]} values - The arguments
   * @param {string[]} pre - Lines before
   * @param {string} indent - The indent
   * @returns {string} The arguments
   */
  const args = (values, pre, indent) => ordered(values, pre, indent).join(', ')

  /**
   * Expressions evaluated left to right: when a later one needs statements first, earlier calls are held in locals
   * @param {readonly Expr[]} values - The expressions
   * @param {string[]} pre - Lines before
   * @param {string} indent - The indent
   * @returns {string[]} Their texts
   */
  const ordered = (values, pre, indent) => {
    /** @type {string[]} */
    const texts = []
    for (const value of values) {
      /** @type {string[]} */
      const own = []
      const text = expr(value, own, indent)
      if (own.length > 0) {
        texts.forEach((earlier, at) => {
          if (/\(/u.test(earlier)) {
            const name = temp('value')
            pre.push(`${indent}local ${name} = ${earlier}`)
            texts[at] = name
          }
        })
      }
      pre.push(...own)
      texts.push(text)
    }
    return texts
  }

  /**
   * A field read; `.length` of an array is `#`
   * @param {Expr & { kind: 'field' }} value - The read
   * @param {string[]} pre - Lines before
   * @param {string} indent - The indent
   * @returns {string} The read
   */
  const field = (value, pre, indent) => {
    const objectType = checker.getNonNullableType(value.object.type)
    if (
      value.name === 'length' &&
      (checker.isArrayType(objectType) ||
        checker.isTupleType(objectType) ||
        (value.object.kind === 'local' && localName(value.object.binding) === 'host'))
    ) {
      if (value.object.kind === 'local' && localName(value.object.binding) === 'host') {
        return 'counted'
      }
      checkHoles(objectType, value.object)
      return `#${operand(value.object, pre, indent)}`
    }
    if (value.name === 'length' && isString(objectType)) {
      refuse(value, "a string's length: JavaScript counts UTF-16 units, Lua bytes")
    }
    const object = operand(value.object, pre, indent)
    if (value.optional) {
      const held = /^[\w.[\]"]+$/u.test(object) ? object : temp('held')
      if (held !== object) {
        pre.push(`${indent}local ${held} = ${object}`)
      }
      if (!falsy(checker.getNonNullableType(value.type))) {
        return `(${held} ~= nil and ${held}${member(value.name)} or nil)`
      }
      const name = temp('read')
      pre.push(`${indent}local ${name}`, `${indent}if ${held} ~= nil then ${name} = ${held}${member(value.name)} end`)
      return name
    }
    return `${object}${member(value.name)}`
  }

  /**
   * A record literal: a table, or a copy of the spread ones with the fields set after
   * @param {Expr & { kind: 'record' }} value - The literal
   * @param {string[]} pre - Lines before
   * @param {string} indent - The indent
   * @returns {string} The record
   */
  const record = (value, pre, indent) => {
    if (value.entries.every((entry) => entry.kind === 'field')) {
      /** @type {Map<string, string>} */
      const fields = new Map()
      const texts = ordered(
        value.entries.map((entry) => entry.value),
        pre,
        indent,
      )
      value.entries.forEach((entry, at) => {
        fields.set(entry.name, texts[at] ?? 'nil')
      })
      const parts = [...fields].filter(([, text]) => text !== 'nil').map(([name, text]) => `${key(name)} = ${text}`)
      return parts.length === 0 ? '{}' : `{ ${parts.join(', ')} }`
    }
    const name = temp('copy')
    const texts = ordered(
      value.entries.map((entry) => entry.value),
      pre,
      indent,
    )
    pre.push(`${indent}local ${name} = {}`)
    value.entries.forEach((entry, at) => {
      const text = texts[at] ?? 'nil'
      if (entry.kind === 'field') {
        pre.push(`${indent}${name}${member(entry.name)} = ${text}`)
        return
      }
      if (at > 0) {
        if (!isExact(entry.value)) {
          refuse(
            entry.value,
            'a spread after another of a record that may hold fields its type does not: a null one would not override',
          )
        }
      }
      pre.push(`${indent}for k, v in pairs(${text}) do ${name}[k] = v end`)
      if (at > 0) {
        for (const one of fieldsOf(checker, entry.value.type)) {
          pre.push(`${indent}${name}${member(one)} = ${text}${member(one)}`)
        }
      }
    })
    return name
  }

  /**
   * An array literal: a table, or one built item by item where it spreads
   * @param {Expr & { kind: 'array' }} value - The literal
   * @param {string[]} pre - Lines before
   * @param {string} indent - The indent
   * @returns {string} The array
   */
  const array = (value, pre, indent) => {
    if (value.items.every((item) => !item.spread)) {
      const texts = ordered(
        value.items.map((item) => item.value),
        pre,
        indent,
      )
      return texts.length === 0 ? '{}' : `{ ${texts.join(', ')} }`
    }
    const name = temp('list')
    const size = temp('size')
    pre.push(`${indent}local ${name}, ${size} = {}, 0`)
    for (const item of value.items) {
      if (!item.spread) {
        const text = expr(item.value, pre, indent)
        pre.push(`${indent}${size} = ${size} + 1`, `${indent}${name}[${size}] = ${text}`)
        continue
      }
      const source = item.value
      if (source.kind === 'method' && source.name === 'slice' && source.args.length <= 2) {
        helpers.add('slice')
        const list = held(source.object, 'list', pre, indent)
        const [from, to] = source.args.map((arg) => held(arg, 'bound', pre, indent))
        const count = temp('count')
        const first = temp('first')
        const last = temp('last')
        pre.push(
          `${indent}local ${count} = #${list}`,
          `${indent}local ${first} = slice_index(${from ?? '0'}, ${count})`,
          `${indent}local ${last} = ${to === undefined ? count : `slice_index(${to}, ${count})`}`,
          `${indent}for i = ${first} + 1, ${last} do`,
          `${indent}  ${size} = ${size} + 1`,
          `${indent}  ${name}[${size}] = ${list}[i]`,
          `${indent}end`,
        )
        continue
      }
      const list = held(source, 'list', pre, indent)
      pre.push(
        `${indent}for i = 1, #${list} do`,
        `${indent}  ${size} = ${size} + 1`,
        `${indent}  ${name}[${size}] = ${list}[i]`,
        `${indent}end`,
      )
    }
    return name
  }

  /**
   * A Math function or `String`
   * @param {Expr & { kind: 'builtin' }} value - The call
   * @param {string[]} pre - Lines before
   * @param {string} indent - The indent
   * @returns {string} The call
   */
  const builtin = (value, pre, indent) => {
    const texts = ordered(value.args, pre, indent)
    switch (value.name) {
      case 'Math.max':
      case 'Math.min': {
        const helper = value.name === 'Math.max' ? 'max' : 'min'
        helpers.add(helper)
        if (texts.length === 0) {
          return value.name === 'Math.max' ? '-math.huge' : 'math.huge'
        }
        return texts.slice(1).reduce((acc, text) => `${helper}(${acc}, ${text})`, texts[0] ?? '')
      }
      case 'Math.floor':
      case 'Math.ceil':
      case 'Math.abs':
      case 'Math.sqrt': {
        return `math.${value.name.slice(5)}(${texts.join(', ')})`
      }
      case 'Math.trunc': {
        helpers.add('trunc')
        return `trunc(${texts.join(', ')})`
      }
      case 'includesIn': {
        helpers.add('slice')
        helpers.add('includesIn')
        return `includes_in(${texts.join(', ')})`
      }
      case 'String': {
        const [arg] = value.args
        if (arg === undefined || !isString(arg.type)) {
          refuse(value, 'String() of a number: Lua writes numbers differently (tostring)')
        }
        return texts.join(', ')
      }
      default: {
        return refuse(value, `${value.name} has no exact Lua form here`)
      }
    }
  }

  /**
   * A binary expression
   * @param {Expr & { kind: 'binary' }} value - The expression
   * @param {string[]} pre - Lines before
   * @param {string} indent - The indent
   * @returns {string} The expression
   */
  const binary = (value, pre, indent) => {
    const [left = '', right = ''] = ordered([value.left, value.right], pre, indent).map((text, at) => {
      const side = at === 0 ? value.left : value.right
      return isAtomic(side, text) ? text : `(${text})`
    })
    switch (value.op) {
      case '===': {
        return `${left} == ${right}`
      }
      case '!==': {
        return `${left} ~= ${right}`
      }
      case '%': {
        return `math.fmod(${left}, ${right})`
      }
      case '+': {
        if (isString(value.left.type) && isString(value.right.type)) {
          return `${left} .. ${right}`
        }
        if (!isNumber(value.left.type) || !isNumber(value.right.type)) {
          refuse(value, '+ of a string and a number')
        }
        return `${left} + ${right}`
      }
      case '<':
      case '<=':
      case '>':
      case '>=': {
        if (!isNumber(value.left.type) || !isNumber(value.right.type)) {
          refuse(value, 'comparing strings: JavaScript compares UTF-16 units, Lua bytes')
        }
        return `${left} ${value.op} ${right}`
      }
      case '-':
      case '*':
      case '/': {
        return `${left} ${value.op} ${right}`
      }
      case '&':
      case '|':
      case '^': {
        const leftRange = imports.ranges.get(value.left.at)
        if (value.op === '|' && isZero(value.right) && leftRange?.int === true && within(leftRange, EXACT_BITS)) {
          return within(leftRange, INT32) ? left : `bit.tobit(${left})`
        }
        const name = { '&': 'band', '^': 'bxor', '|': 'bor' }[value.op]
        return `bit.${name}(${int32Of(value.left, left)}, ${int32Of(value.right, right)})`
      }
      case '<<':
      case '>>':
      case '>>>': {
        const name = { '<<': 'lshift', '>>': 'arshift', '>>>': 'rshift' }[value.op]
        const { right: by } = value
        const count =
          by.kind === 'literal' && typeof by.value === 'number' && Number.isInteger(by.value)
            ? String(((by.value % 32) + 32) % 32)
            : `bit.band(${int32Of(by, right)}, 31)`
        const leftRange = imports.ranges.get(value.left.at)
        if (value.op === '>>>' && isZero(by) && leftRange?.int === true) {
          return within(leftRange, { hi: 2 ** 32 - 1, int: true, lo: 0 })
            ? left
            : within(leftRange, EXACT_BITS)
              ? `(${left} % 4294967296)`
              : `(bit.tobit(${int32Of(value.left, left)}) % 4294967296)`
        }
        const shifted = `bit.${name}(${int32Of(value.left, left)}, ${count})`
        return value.op === '>>>' ? `(${shifted} % 4294967296)` : shifted
      }
      default: {
        throw new TypeError('Not an operator')
      }
    }
  }

  /**
   * An operand of a bitwise operator, converted as JavaScript converts it (ToInt32), unless it is an int32 already
   * @param {Expr} value - The operand
   * @param {string} text - Its text
   * @returns {string} The converted operand
   */
  const int32Of = (value, text) => {
    if (
      value.kind === 'literal' &&
      typeof value.value === 'number' &&
      Number.isInteger(value.value) &&
      Math.abs(value.value) < 2 ** 31
    ) {
      return text
    }
    if (value.kind === 'binary' && ['&', '|', '^', '<<', '>>'].includes(value.op)) {
      return text
    }
    const range = imports.ranges.get(value.at)
    if (range !== undefined && range.int && within(range, EXACT_BITS)) {
      return text
    }
    helpers.add('int32')
    return `int32(${text})`
  }

  /**
   * Whether an expression only reads locals, fields and indexes, so reading it twice reads the same
   * @param {Expr} value - The expression
   * @returns {boolean} Whether it does
   */
  const isPure = (value) => {
    if (value.kind === 'local' || value.kind === 'constant' || value.kind === 'literal') {
      return true
    }
    if (value.kind === 'field') {
      return !value.optional && isPure(value.object)
    }
    if (value.kind === 'index') {
      return isPure(value.object) && isPure(value.index)
    }
    if (value.kind === 'binary') {
      return ['+', '-', '*'].includes(value.op) && isPure(value.left) && isPure(value.right)
    }
    return false
  }

  /**
   * `&&`, `||`, `??`
   * @param {Expr & { kind: 'logical' }} value - The expression
   * @param {string[]} pre - Lines before
   * @param {string} indent - The indent
   * @returns {string} The expression
   */
  const logical = (value, pre, indent) => {
    const left = operand(value.left, pre, indent)
    /** @type {string[]} */
    const rightPre = []
    const right = operand(value.right, rightPre, `${indent}  `)
    if (value.op === '??' && value.right.kind === 'literal' && value.right.value === null) {
      return left
    }
    if (value.op === '??') {
      if (rightPre.length === 0 && isPure(value.left) && !falsy(checker.getNonNullableType(value.left.type))) {
        return `(${left} ~= nil and ${left} or ${right})`
      }
      const name = temp('chosen')
      pre.push(
        `${indent}local ${name} = ${left}`,
        `${indent}if ${name} == nil then`,
        ...rightPre,
        `${indent}  ${name} = ${right}`,
        `${indent}end`,
      )
      return name
    }
    if (rightPre.length === 0) {
      return `${left} ${value.op === '&&' ? 'and' : 'or'} ${right}`
    }
    const name = temp('test')
    pre.push(
      `${indent}local ${name} = ${left}`,
      `${indent}if ${value.op === '&&' ? '' : 'not '}${name} then`,
      ...rightPre,
      `${indent}  ${name} = ${right}`,
      `${indent}end`,
    )
    return name
  }

  /**
   * `test ? then : otherwise`
   * @param {Expr & { kind: 'conditional' }} value - The expression
   * @param {string[]} pre - Lines before
   * @param {string} indent - The indent
   * @returns {string} The expression
   */
  const conditional = (value, pre, indent) => {
    const test = expr(value.test, pre, indent)
    /** @type {string[]} */
    const thenPre = []
    /** @type {string[]} */
    const elsePre = []
    const then = expr(value.whenTrue, thenPre, `${indent}  `)
    const otherwise = expr(value.whenFalse, elsePre, `${indent}  `)
    if (thenPre.length === 0 && elsePre.length === 0 && !falsy(value.whenTrue.type)) {
      return `${wrap(test)} and ${wrap(then)} or ${wrap(otherwise)}`
    }
    const name = temp('chosen')
    pre.push(
      `${indent}local ${name}`,
      `${indent}if ${test} then`,
      ...thenPre,
      `${indent}  ${name} = ${then}`,
      `${indent}else`,
      ...elsePre,
      `${indent}  ${name} = ${otherwise}`,
      `${indent}end`,
    )
    return name
  }

  /**
   * An array or string method
   * @param {Expr & { kind: 'method' }} value - The call
   * @param {string[]} pre - Lines before
   * @param {string} indent - The indent
   * @returns {string} The call's value
   */
  const method = (value, pre, indent) => {
    const objectType = checker.getNonNullableType(value.object.type)
    if (isString(objectType)) {
      return stringMethod(value, pre, indent)
    }
    if (value.object.kind === 'regex') {
      return refuse(value, 'a regular expression: Lua patterns are not JavaScript regular expressions')
    }
    checkHoles(objectType, value.object)
    const list = held(value.object, 'list', pre, indent)
    const element = elementOf(checker, objectType)
    const [first, second] = value.args
    switch (value.name) {
      case 'at': {
        if (first?.kind === 'literal' && typeof first.value === 'number' && Number.isInteger(first.value)) {
          const offset = first.value + 1
          if (first.value >= 0) {
            return `${list}[${String(offset)}]`
          }
          return offset === 0 ? `${list}[#${list}]` : `${list}[#${list} - ${String(-offset)}]`
        }
        return refuse(value, 'at() of an index not written out')
      }
      case 'includes': {
        if (first === undefined) {
          return refuse(value, 'includes() of nothing')
        }
        helpers.add('includes')
        return `includes(${list}, ${expr(first, pre, indent)})`
      }
      case 'indexOf': {
        if (first === undefined || second !== undefined) {
          return refuse(value, 'indexOf() takes one value here')
        }
        helpers.add('indexOf')
        return `index_of(${list}, ${expr(first, pre, indent)})`
      }
      case 'slice': {
        helpers.add('slice')
        const texts = ordered(value.args, pre, indent)
        return `slice(${list}, ${texts[0] ?? '0'}${texts[1] === undefined ? '' : `, ${texts[1]}`})`
      }
      case 'join': {
        if (element === null || !isString(element)) {
          return refuse(value, 'join() of what is not strings: Lua writes numbers differently')
        }
        return `table.concat(${list}, ${first === undefined ? '","' : expr(first, pre, indent)})`
      }
      default: {
        return loop(value, list, pre, indent)
      }
    }
  }

  /**
   * An expression held in a local if it isn't one, so it is evaluated once
   * @param {Expr} value - The expression
   * @param {string} base - The local's name
   * @param {string[]} pre - Lines before
   * @param {string} indent - The indent
   * @returns {string} The local, or the expression if it is a name
   */
  const held = (value, base, pre, indent) => {
    const text = expr(value, pre, indent)
    if (/^[\w.]+$/u.test(text)) {
      return text
    }
    const name = temp(base)
    pre.push(`${indent}local ${name} = ${text}`)
    return name
  }

  /**
   * An array method taking a function, as a loop
   * @param {Expr & { kind: 'method' }} value - The call
   * @param {string} list - The array, a name
   * @param {string[]} pre - Lines before
   * @param {string} indent - The indent
   * @returns {string} The local holding the result
   */
  const loop = (value, list, pre, indent) => {
    const [callback, initial] = value.args
    if (callback === undefined) {
      return refuse(value, `${value.name}() without a function`)
    }
    const inner = `${indent}  `
    const index = temp('i')
    /** @type {string[]} */
    const body = []
    /**
     * The callback applied: a lambda's body inlined, or a function called
     * @param {readonly string[]} params - The arguments' texts
     * @returns {string} The result
     */
    const apply = (params) => {
      if (callback.kind === 'function') {
        return `${nameOf(callback.fn)}(${params.join(', ')})`
      }
      if (callback.kind !== 'lambda') {
        return refuse(value, `${value.name}() of a function value`)
      }
      const [only] = callback.body
      if (callback.body.length !== 1 || only?.kind !== 'return') {
        return refuse(value, 'a function of several statements in an array method')
      }
      callback.params.forEach((param, at) => {
        const text = params[at]
        if (text !== undefined) {
          body.push(...bindPattern(param, text, inner))
        }
      })
      return expr(only.value, body, inner)
    }
    const item = `${list}[${index}]`
    switch (value.name) {
      case 'find':
      case 'findLast':
      case 'findIndex':
      case 'findLastIndex':
      case 'some':
      case 'every': {
        const name = temp(value.name === 'some' || value.name === 'every' ? 'all' : 'found')
        const start =
          value.name === 'every'
            ? 'true'
            : value.name.endsWith('Index')
              ? '-1'
              : value.name === 'some'
                ? 'false'
                : 'nil'
        const range = value.name.startsWith('findLast') ? `#${list}, 1, -1` : `1, #${list}`
        const test = apply([item, `${index} - 1`, list])
        const hit =
          value.name === 'some'
            ? 'true'
            : value.name === 'every'
              ? 'false'
              : value.name.endsWith('Index')
                ? `${index} - 1`
                : item
        pre.push(
          `${indent}local ${name} = ${start}`,
          `${indent}for ${index} = ${range} do`,
          ...body,
          `${inner}if ${value.name === 'every' ? `not ${wrap(test)}` : test} then`,
          `${inner}  ${name} = ${hit}`,
          `${inner}  break`,
          `${inner}end`,
          `${indent}end`,
        )
        return name
      }
      case 'filter': {
        const name = temp('kept')
        const size = temp('size')
        const test = apply([item, `${index} - 1`, list])
        pre.push(
          `${indent}local ${name}, ${size} = {}, 0`,
          `${indent}for ${index} = 1, #${list} do`,
          ...body,
          `${inner}if ${test} then`,
          `${inner}  ${size} = ${size} + 1`,
          `${inner}  ${name}[${size}] = ${item}`,
          `${inner}end`,
          `${indent}end`,
        )
        return name
      }
      case 'map': {
        checkHoles(value.type, value)
        const name = temp('mapped')
        const result = apply([item, `${index} - 1`, list])
        pre.push(
          `${indent}local ${name} = {}`,
          `${indent}for ${index} = 1, #${list} do`,
          ...body,
          `${inner}${name}[${index}] = ${result}`,
          `${indent}end`,
        )
        return name
      }
      case 'reduce': {
        if (initial === undefined) {
          return refuse(value, 'reduce() without a first value')
        }
        const name = temp('acc')
        const start = expr(initial, pre, indent)
        const result = apply([name, item, `${index} - 1`, list])
        pre.push(
          `${indent}local ${name} = ${start}`,
          `${indent}for ${index} = 1, #${list} do`,
          ...body,
          `${inner}${name} = ${result}`,
          `${indent}end`,
        )
        return name
      }
      default: {
        return refuse(value, `the array method ${value.name}() has no Lua form here`)
      }
    }
  }

  /**
   * A string method, where its meaning on UTF-8 bytes is its meaning on UTF-16 units
   * @param {Expr & { kind: 'method' }} value - The call
   * @param {string[]} pre - Lines before
   * @param {string} indent - The indent
   * @returns {string} The call's value
   */
  const stringMethod = (value, pre, indent) => {
    const [first] = value.args
    switch (value.name) {
      case 'startsWith':
      case 'endsWith':
      case 'includes': {
        if (first === undefined || value.args.length > 1) {
          return refuse(value, `${value.name}() takes one string here`)
        }
        const text = held(value.object, 'text', pre, indent)
        const part = held(first, 'part', pre, indent)
        if (value.name === 'startsWith') {
          return `${text}:sub(1, #${part}) == ${part}`
        }
        if (value.name === 'endsWith') {
          return `(#${part} == 0 or ${text}:sub(-#${part}) == ${part})`
        }
        return `${text}:find(${part}, 1, true) ~= nil`
      }
      default: {
        return refuse(
          value,
          `the string method ${value.name}(): its JavaScript meaning (Unicode case, UTF-16 units) is not Lua's on bytes`,
        )
      }
    }
  }

  /**
   * Binds a pattern to a value's text
   * @param {Pattern} pattern - The pattern
   * @param {string} value - The value, a name or expression
   * @param {string} indent - The indent
   * @returns {string[]} The lines
   */
  const bindPattern = (pattern, value, indent) => {
    if (pattern.kind === 'bind') {
      return [`${indent}local ${localName(pattern.binding)} = ${value}`]
    }
    /** @type {{ pattern: Pattern, read: string }[]} */
    const parts =
      pattern.kind === 'tuple'
        ? pattern.items.flatMap((item, at) =>
            item === null ? [] : [{ pattern: item, read: `${value}[${String(at + 1)}]` }],
          )
        : pattern.fields.map((one) => ({ pattern: one.pattern, read: `${value}${member(one.name)}` }))
    /** @type {string[]} */
    const bound = []
    for (const part of parts) {
      if (part.pattern.kind !== 'bind') {
        return parts.flatMap((one) => bindPattern(one.pattern, one.read, indent))
      }
      bound.push(localName(part.pattern.binding))
    }
    return [`${indent}local ${bound.join(', ')} = ${parts.map((part) => part.read).join(', ')}`]
  }

  /**
   * A statement
   * @param {Stmt} one - The statement
   * @param {string} indent - The indent
   * @returns {string[]} Its lines
   */
  const stmt = (one, indent) => {
    /** @type {string[]} */
    const pre = []
    const inner = `${indent}  `
    switch (one.kind) {
      case 'const': {
        if (one.pattern.kind === 'tuple' && one.value.kind === 'call' && returnsTuple(one.value.fn)) {
          const call = `${nameOf(one.value.fn)}(${args(one.value.args, pre, indent)})`
          const bound = one.pattern.items.map((item) => (item?.kind === 'bind' ? localName(item.binding) : '_'))
          if (one.pattern.items.some((item) => item !== null && item.kind !== 'bind')) {
            refuse(one, 'a nested pattern of several returned values')
          }
          return [...pre, `${indent}local ${bound.join(', ')} = ${call}`]
        }
        if (one.pattern.kind === 'bind') {
          const text = expr(one.value, pre, indent)
          return [...pre, `${indent}local ${localName(one.pattern.binding)} = ${text}`]
        }
        const text = held(one.value, 'value', pre, indent)
        return [...pre, ...bindPattern(one.pattern, text, indent)]
      }
      case 'let': {
        if (one.value.kind === 'undefined') {
          return [`${indent}local ${localName(one.binding)}`]
        }
        const text = expr(one.value, pre, indent)
        return [...pre, `${indent}local ${localName(one.binding)} = ${text}`]
      }
      case 'assign': {
        const text = expr(one.value, pre, indent)
        return [...pre, `${indent}${localName(one.binding)} = ${text}`]
      }
      case 'set': {
        const text = expr(one.value, pre, indent)
        return [...pre, `${indent}${localName(one.object)}${member(one.name)} = ${text}`]
      }
      case 'return': {
        if (one.value.kind === 'call' && returnsTuple(one.value.fn)) {
          return [...pre, `${indent}return ${nameOf(one.value.fn)}(${args(one.value.args, pre, indent)})`]
        }
        if (
          one.value.kind === 'array' &&
          tupleOf(checker, one.value.type) !== null &&
          one.value.items.every((item) => !item.spread)
        ) {
          const texts = ordered(
            one.value.items.map((item) => item.value),
            pre,
            indent,
          )
          return [...pre, `${indent}return ${texts.join(', ')}`]
        }
        const text = expr(one.value, pre, indent)
        return [...pre, `${indent}return ${text}`]
      }
      case 'if': {
        const test = expr(one.test, pre, indent)
        const lines = [...pre, `${indent}if ${test} then`, ...block(one.whenTrue, inner)]
        let otherwise = one.whenFalse
        for (let [nested] = otherwise; otherwise.length === 1 && nested?.kind === 'if'; [nested] = otherwise) {
          /** @type {string[]} */
          const nestedPre = []
          const nestedTest = expr(nested.test, nestedPre, indent)
          if (nestedPre.length > 0) {
            break
          }
          lines.push(`${indent}elseif ${nestedTest} then`, ...block(nested.whenTrue, inner))
          otherwise = nested.whenFalse
        }
        if (otherwise.length > 0) {
          lines.push(`${indent}else`, ...block(otherwise, inner))
        }
        return [...lines, `${indent}end`]
      }
      case 'switch': {
        const subject = held(one.subject, 'subject', pre, indent)
        const lines = [...pre]
        one.cases.forEach((clause, at) => {
          const tests = clause.tests.map((test) => `${subject} == ${expr(test, lines, indent)}`).join(' or ')
          lines.push(`${indent}${at === 0 ? 'if' : 'elseif'} ${tests} then`, ...block(clause.body, inner))
        })
        if (one.fallback !== null) {
          if (one.cases.length === 0) {
            lines.push(...block(one.fallback, indent))
            return lines
          }
          lines.push(`${indent}else`, ...block(one.fallback, inner))
        }
        return one.cases.length === 0 ? lines : [...lines, `${indent}end`]
      }
      case 'while': {
        /** @type {string[]} */
        const testPre = []
        const test = expr(one.test, testPre, inner)
        if (testPre.length > 0) {
          return [
            `${indent}while true do`,
            ...testPre,
            `${inner}if not ${wrap(test)} then break end`,
            ...block(one.body, inner),
            `${indent}end`,
          ]
        }
        return [`${indent}while ${test} do`, ...block(one.body, inner), `${indent}end`]
      }
      case 'emit': {
        return [...pre, ...callLines(localName(one.out), effects.calls(one.items), indent)]
      }
      case 'insert': {
        return refuse(one, 'effects put before ones already made: no host call order gives them')
      }
      case 'scan': {
        return [
          ...pre,
          `${indent}local ${localName(one.target)} = ${expr(one.to, pre, indent)} ~= ${expr(one.from, pre, indent)}`,
        ]
      }
      case 'splice': {
        if (one.items.some((item) => hasNull(item.type) || hasUndefined(item.type))) {
          refuse(one.items[0] ?? one.index, 'putting a value that may be null into an array: a Lua table has no hole')
        }
        helpers.add('slice')
        const list = localName(one.array)
        const place = temp('at')
        const index = expr(one.index, pre, indent)
        const items = one.items.map((item) => expr(item, pre, indent))
        return [
          ...pre,
          `${indent}local ${place} = slice_index(${index}, #${list})`,
          ...items.map((item, offset) => `${indent}table.insert(${list}, ${place} + ${String(offset + 1)}, ${item})`),
        ]
      }
      default: {
        throw new Error('unreachable')
      }
    }
  }

  /**
   * Calls on the host for effects made, the ones a test over effects counts counted first
   * @param {string} host - The host
   * @param {readonly Call[]} calls - The calls
   * @param {string} indent - The indent
   * @returns {string[]} The lines
   */
  const callLines = (host, calls, indent) =>
    calls.flatMap((call) => {
      /** @type {string[]} */
      const lines = []
      if (call.kind === 'call') {
        const given = ['HERE', ...ordered(call.args, lines, indent)].join(', ')
        const count = effects.counted.has(call.method.type) ? [`${indent}counted = counted + 1`] : []
        return [...lines, ...count, `${indent}${host}${member(call.method.method)}(${given})`]
      }
      const test = expr(call.test, lines, indent)
      const whenTrue = callLines(host, call.whenTrue, `${indent}  `)
      const whenFalse = callLines(host, call.whenFalse, `${indent}  `)
      if (whenTrue.length === 0) {
        return whenFalse.length === 0
          ? lines
          : [...lines, `${indent}if not ${wrap(test)} then`, ...whenFalse, `${indent}end`]
      }
      const otherwise = whenFalse.length === 0 ? [] : [`${indent}else`, ...whenFalse]
      return [...lines, `${indent}if ${test} then`, ...whenTrue, ...otherwise, `${indent}end`]
    })

  /**
   * A block's lines
   * @param {readonly Stmt[]} stmts - The block
   * @param {string} indent - The indent
   * @returns {string[]} The lines
   */
  const block = (stmts, indent) => stmts.flatMap((one) => stmt(one, indent))

  /**
   * A function
   * @param {Fn} one - The function, planned
   * @param {string} indent - The indent
   * @returns {string[]} Its lines
   */
  const fn = (one, indent) => {
    locals = new Map(factoryLocals)
    used = new Set(factoryLocals.values())
    temps = 0
    const params = one.params.map((param) => {
      if (param.kind !== 'bind') {
        const name = temp('param')
        return { name, pattern: param }
      }
      return { name: localName(param.binding), pattern: null }
    })
    if (one.out !== null) {
      locals.set(one.out, 'host')
      used.add('host')
    }
    /** @type {string[]} */
    const unpack = params.flatMap(({ name, pattern }) =>
      pattern === null ? [] : bindPattern(pattern, name, `${indent}  `),
    )
    const body = block(one.body, `${indent}  `)
    const paramNames = params.map(({ name }) => name)
    if (one.out !== null) {
      paramNames.push('host')
    }
    return [
      ...docLines(
        one,
        params.map(({ name }) => name),
        indent,
      ),
      `${indent}local function ${nameOf(one)}(${paramNames.join(', ')})`,
      ...unpack,
      ...body,
      `${indent}end`,
    ]
  }

  /** @type {Map<Binding, string>} */
  const factoryLocals = new Map()
  for (const binding of widget.factory?.params ?? []) {
    factoryLocals.set(binding, snake(binding.name))
    taken.add(snake(binding.name))
  }

  const factoryAt = widget.factory?.at ?? null
  const inFactory = new Set(planned.fns.filter((one) => isInside(one.at, factoryAt)))
  /** @type {string[]} */
  const body = []
  for (const constant of planned.constants) {
    if (isInside(constant.at, factoryAt)) {
      continue
    }
    locals = new Map()
    used = new Set()
    /** @type {string[]} */
    const pre = []
    const text = expr(constant.value, pre, '')
    if (pre.length > 0) {
      refuse(constant.value, 'a constant built by statements')
    }
    body.push(`local ${nameOf(constant)} = ${text}`)
  }
  if (body.length > 0) {
    body.push('')
  }
  for (const one of planned.fns) {
    if (!inFactory.has(one)) {
      body.push(...fn(one, ''), '')
    }
  }

  /**
   * The widget table's fields, and the lines it needs before it
   * @returns {Readonly<{ lines: readonly string[], fields: readonly string[] }>} Them
   */
  const widgetTable = () => {
    const name = (/** @type {Fn} */ one) => nameOf(planned.planned.get(one) ?? one)
    if (widget.composite === null) {
      return {
        fields: [
          'effects = EFFECTS',
          `init = ${name(widget.init)}`,
          `step = ${name(widget.step)}`,
          `deliver = function(state, path, at, input, host) return ${name(widget.step)}(state, input, host) end`,
        ],
        lines: [],
      }
    }
    return compositeLua(planned, name, others, factoryLocals)
  }

  /** @type {string[]} */
  const tail = []
  if (widget.factory === null) {
    const table = widgetTable()
    tail.push(...table.lines, `M.${widget.name} = {`, ...table.fields.map((one) => `  ${one},`), '}', '', 'return M')
  } else {
    const { factory } = widget
    tail.push(
      `function M.${widget.name}(${factory.params.map((param) => factoryLocals.get(param) ?? param.name).join(', ')})`,
    )
    locals = new Map(factoryLocals)
    used = new Set(factoryLocals.values())
    for (const one of factory.locals) {
      tail.push(...stmt(one, '  '))
    }
    for (const constant of planned.constants) {
      if (isInside(constant.at, factoryAt)) {
        /** @type {string[]} */
        const pre = []
        tail.push(...pre, `  local ${nameOf(constant)} = ${expr(constant.value, pre, '  ')}`)
      }
    }
    const factoryNames = new Map(locals)
    for (const one of inFactory) {
      tail.push(...fn(one, '  '))
      for (const [binding, name] of factoryNames) {
        factoryLocals.set(binding, name)
      }
    }
    const table = widgetTable()
    tail.push(
      ...table.lines.map((line) => (line === '' ? '' : `  ${line}`)),
      '  return {',
      ...table.fields.map((one) => `    ${one.replaceAll('\n', '\n  ')},`),
      '  }',
      'end',
      '',
      'return M',
    )
  }
  // In HELPERS' order: a helper comes before one that calls it
  const helperLines = Object.entries(HELPERS).flatMap(([name, lines]) =>
    [...helpers].some((one) => one === name) ? [...lines, ''] : [],
  )
  const all = [...helperLines, ...body, ...tail].join('\n')
  const requires = all.includes('bit.') ? ['local bit = require("bit")', ''] : []
  const head = [
    '-- Where an effect the widget makes comes from: the widget itself',
    'local HERE = {}',
    '',
    `local EFFECTS = ${luaEffects(effects, widget.composite !== null)}`,
    '',
    ...(effects.counted.size > 0
      ? ['-- How many of the effects a test reads the widget has made', 'local counted = 0', '']
      : []),
    ...(widget.composite === null ? [] : [...SAME, '']),
  ]
  return `${[imports.header, '', ...requires, 'local M = {}', '', ...head, all].join('\n')}\n`
}

/** Deep equality of plain data, for a composite's props: two values of one type have the same fields */
const SAME = [
  '-- Whether two plain values are the same data: tables compared field by field',
  'local function same(a, b)',
  '  if a == b then return true end',
  '  if type(a) ~= "table" or type(b) ~= "table" then return false end',
  '  for k, v in pairs(a) do',
  '    if not same(v, b[k]) then return false end',
  '  end',
  '  for k in pairs(b) do',
  '    if a[k] == nil then return false end',
  '  end',
  '  return true',
  'end',
]

/**
 * The host methods a module gives, as a Lua table
 * @param {Effects} effects - The effects
 * @param {boolean} isComposite - Whether it is a composite, whose `send` and `stopPropagation` stay inside it
 * @returns {string} The table's source
 */
function luaEffects(effects, isComposite) {
  const methods = effects.methods.filter(
    (one) => !isComposite || (one.type !== 'send' && one.type !== 'stopPropagation'),
  )
  const entries = methods.map(
    (one) =>
      `  ${key(one.method)} = { type = ${quote(one.type)}, fields = { ${one.fields.map((field) => quote(field)).join(', ')} } },`,
  )
  return entries.length === 0 ? '{}' : `{\n${entries.join('\n')}\n}`
}

/**
 * A composite, compiled, as the JavaScript one is: its own step and handlers called directly, a host per child whose
 * methods call the composite's `on` handler for that effect or go straight up; the composite's state and host are the
 * module's while a delivery is under way
 * @param {Plan} planned - The plan
 * @param {(fn: Fn) => string} name - A function's name
 * @param {ReadonlyMap<string, Effects>} others - Every widget's effects, by name
 * @param {ReadonlyMap<Binding, string>} factoryLocals - Names of a factory's parameters
 * @returns {Readonly<{ lines: readonly string[], fields: readonly string[] }>} Lines before the table, and its fields
 */
function compositeLua(planned, name, others, factoryLocals) {
  const { widget } = planned
  const { composite } = widget
  if (composite === null) {
    throw new Error('Not a composite')
  }
  const own = (others.get(widget.name)?.methods ?? []).filter(
    (one) => one.type !== 'send' && one.type !== 'stopPropagation',
  )
  const children = composite.children.map((child) => ({
    host: `${snake(child.name)}_host`,
    key: child.name,
    paths: `${snake(child.name)}_paths`,
    props: composite.props.find((one) => one.child === child.name)?.fn ?? null,
    ref:
      child.widget.kind === 'export'
        ? `require(${quote(child.widget.name)}).${child.widget.name}`
        : (factoryLocals.get(child.widget.binding) ?? child.widget.binding.name),
    refName: child.widget.kind === 'export' ? child.widget.name : null,
    synced: `${snake(child.name)}_synced`,
    via: `${snake(child.name)}_from`,
    widget: `${snake(child.name)}_widget`,
  }))
  const propsOf = (/** @type {Fn | null} */ fn, /** @type {string} */ ownText) =>
    fn === null ? 'nil' : `${name(fn)}(${ownText})`
  /** @type {string[]} */
  const lines = [
    ...children.map((child) => `local ${child.widget} = ${child.ref}`),
    'local current, upward, stopped, prevented = nil, nil, false, false',
    ...children.map((child) => `local ${child.synced} = nil`),
    'local to_child, sync_props',
    '',
    "-- What the composite's own functions call: a send goes to the child, the rest up, from the composite",
    'local own_host = {}',
    'own_host.send = function(from, input, to)',
    '  sync_props()',
    '  to_child(to, HERE, 0, input)',
    'end',
    'own_host.stopPropagation = function() stopped = true end',
    ...own.flatMap((one) => [
      `own_host${member(one.method)} = function(${['from', ...one.fields].join(', ')})`,
      ...(one.type === 'preventDefault' ? ['  prevented = true'] : []),
      `  upward${member(one.method)}(${['from', ...one.fields].join(', ')})`,
      'end',
    ]),
    '',
    '-- The own effects init makes, kept until the children have started, as the runtime orders them',
    'local deferred = {}',
    'local defer_host = {}',
    `for _, method in ipairs({ ${[...own.map((one) => quote(one.method)), '"send"', '"stopPropagation"'].join(', ')} }) do`,
    '  defer_host[method] = function(from, ...) deferred[#deferred + 1] = { method, { ... }, select("#", ...) } end',
    'end',
    '',
  ]
  for (const child of children) {
    const handled = composite.handlers.filter((one) => one.phase === 'on' && one.child === child.key)
    lines.push(
      `local ${child.paths} = {}`,
      `-- Where an effect from ${child.key} came from, from the composite: made once per path`,
      `local function ${child.via}(from)`,
      `  local path = ${child.paths}[from]`,
      '  if path == nil then',
      `    path = { ${quote(child.key)} }`,
      '    for i = 1, #from do path[i + 1] = from[i] end',
      `    ${child.paths}[from] = path`,
      '  end',
      '  return path',
      'end',
      `local ${child.host} = {}`,
    )
    const known = child.refName === null ? undefined : others.get(child.refName)
    for (const handler of handled) {
      const fn = planned.planned.get(handler.fn) ?? handler.fn
      const fields = planned.handlerFields.get(handler.fn) ?? null
      if (known === undefined) {
        throw new Error(`${widget.name}: an \`on\` handler of a child the generator doesn't know the effects of`)
      }
      for (const one of known.methods.filter((method) => method.type === handler.type)) {
        const record = `{ ${[`type = ${quote(one.type)}`, ...one.fields.map((field) => `${key(field)} = ${field}`)].join(', ')} }`
        const args = ['current.own', ...(fields ?? [record]), ...(fn.params.length > 2 ? ['from'] : []), 'own_host']
        lines.push(
          `${child.host}${member(one.method)} = function(${['from', ...one.fields].join(', ')})`,
          ...(one.type === 'preventDefault' ? ['  prevented = true'] : []),
          '  local was = stopped',
          '  stopped = false',
          `  current.own = ${name(handler.fn)}(${args.join(', ')})`,
          '  local stop = stopped',
          '  stopped = was',
          `  if not stop then upward${member(one.method)}(${[`${child.via}(from)`, ...one.fields].join(', ')}) end`,
          'end',
        )
      }
    }
    const handledTypes = new Set(handled.map((one) => one.type))
    if (known === undefined) {
      lines.push(
        `for method in pairs(${child.widget}.effects) do`,
        `  ${child.host}[method] = ${child.host}[method] or function(from, ...) upward[method](${child.via}(from), ...) end`,
        'end',
        `${child.host}.preventDefault = function(from)`,
        '  prevented = true',
        `  upward.preventDefault(${child.via}(from))`,
        'end',
      )
    } else {
      for (const one of known.methods.filter((method) => !handledTypes.has(method.type))) {
        lines.push(
          `${child.host}${member(one.method)} = function(${['from', ...one.fields].join(', ')})`,
          ...(one.type === 'preventDefault' ? ['  prevented = true'] : []),
          `  upward${member(one.method)}(${[`${child.via}(from)`, ...one.fields].join(', ')})`,
          'end',
        )
      }
    }
    lines.push('')
  }
  const handlerCall = (/** @type {Readonly<{ fn: Fn }>} */ handler, /** @type {string} */ was) => {
    const fn = planned.planned.get(handler.fn) ?? handler.fn
    return `${name(handler.fn)}(${[...['current.own', 'input', was].slice(0, fn.params.length), 'own_host'].join(', ')})`
  }
  lines.push(
    '-- Delivers an input to a child, or below it',
    'to_child = function(child, path, at, input)',
    ...children.flatMap((child, at) => [
      `  ${at === 0 ? 'if' : 'elseif'} child == ${quote(child.key)} then`,
      `    current.children${member(child.key)} = ${child.widget}.deliver(current.children${member(child.key)}, path, at, input, ${child.host})`,
    ]),
    '  end',
    'end',
    '',
    '-- Gives each child whose props changed its new props, until none do',
    'sync_props = function()',
    '  for _ = 1, 16 do',
    ...children.map((child) => `    local ${snake(child.key)}_now = ${propsOf(child.props, 'current.own')}`),
    ...children.map(
      (child) => `    local ${snake(child.key)}_changed = not same(${child.synced}, ${snake(child.key)}_now)`,
    ),
    `    if ${children.map((child) => `not ${snake(child.key)}_changed`).join(' and ')} then return end`,
    ...children.map((child) => `    ${child.synced} = ${snake(child.key)}_now`),
    ...children.map(
      (child) =>
        `    if ${snake(child.key)}_changed then to_child(${quote(child.key)}, HERE, 0, { props = ${snake(child.key)}_now, type = "props" }) end`,
    ),
    '  end',
    '  error("Props between a composite and its children never settle")',
    'end',
    '',
    '-- Delivers an input inside the composite: to its own step, or through capture, the child and bubble',
    'local function deliver_in(path, at, input)',
    '  if at == #path then',
    `    current.own = ${name(widget.step)}(current.own, input, own_host)`,
    '    return',
    '  end',
    '  local child = path[at + 1]',
    ...children.flatMap((child) => {
      const captures = composite.handlers.filter((one) => one.phase === 'capture' && one.child === child.key)
      const bubbles = composite.handlers.filter((one) => one.phase === 'bubble' && one.child === child.key)
      return [
        `  if child == ${quote(child.key)} then`,
        ...captures.flatMap((handler) => [
          `    if input.type == ${quote(handler.type)} then`,
          '      local was = stopped',
          '      stopped = false',
          `      current.own = ${handlerCall(handler, 'false')}`,
          '      local stop = stopped',
          '      stopped = was',
          '      if stop then return end',
          '    end',
        ]),
        '    sync_props()',
        '    prevented = false',
        '    to_child(child, path, at + 1, input)',
        ...bubbles.flatMap((handler) => [
          `    if input.type == ${quote(handler.type)} then`,
          `      current.own = ${handlerCall(handler, 'prevented')}`,
          '    end',
        ]),
        '  end',
      ]
    }),
    'end',
    '',
    "-- Delivers an input to the widget at `path` from `at`, the composite's own effects and its children's to `host`",
    'local function deliver(state, path, at, input, host)',
    `  local was, was_host, was_prevented${children.map((child) => `, was_${child.synced}`).join('')} = current, upward, prevented${children.map((child) => `, ${child.synced}`).join('')}`,
    '  current, upward = state, host',
    ...children.map((child) => `  ${child.synced} = ${propsOf(child.props, 'state.own')}`),
    '  deliver_in(path, at, input)',
    '  sync_props()',
    `  current, upward, prevented${children.map((child) => `, ${child.synced}`).join('')} = was, was_host, was_prevented${children.map((child) => `, was_${child.synced}`).join('')}`,
    '  return state',
    'end',
    '',
    '-- Starts the composite: its own state, then its children, then its own first effects, as the runtime orders them',
    'local function start(props, host)',
    '  deferred = {}',
    `  local own = ${name(widget.init)}(props, defer_host)`,
    '  local kept = deferred',
    '  local state = { children = {}, own = own }',
    `  local was, was_host${children.map((child) => `, was_${child.synced}`).join('')} = current, upward${children.map((child) => `, ${child.synced}`).join('')}`,
    '  current, upward = state, host',
    ...children.flatMap((child) => [
      `  ${child.synced} = ${propsOf(child.props, 'own')}`,
      `  state.children${member(child.key)} = ${child.widget}.init(${child.synced}, ${child.host})`,
    ]),
    '  for i = 1, #kept do',
    '    local call = kept[i]',
    '    own_host[call[1]](HERE, unpack(call[2], 1, call[3]))',
    '  end',
    '  sync_props()',
    `  current, upward${children.map((child) => `, ${child.synced}`).join('')} = was, was_host${children.map((child) => `, was_${child.synced}`).join('')}`,
    '  return state',
    'end',
    '',
  )
  const childEffects = children.map((child) => `${child.widget}.effects`)
  return {
    fields: [
      `children = { ${children.map((child) => `${key(child.key)} = ${child.widget}`).join(', ')} }`,
      `props = { ${composite.props.map((one) => `${key(one.child)} = ${name(one.fn)}`).join(', ')} }`,
      `effects = (function()\n  local all = {}\n  for _, t in ipairs({ EFFECTS, ${childEffects.join(', ')} }) do\n    for k, v in pairs(t) do all[k] = v end\n  end\n  return all\nend)()`,
      'init = start',
      'deliver = deliver',
    ],
    lines,
  }
}

/**
 * A function's doc comment, as LuaCATS
 * @param {Fn} fn - The function
 * @param {readonly string[]} params - Its parameters' names
 * @param {string} indent - The indent
 * @returns {string[]} The lines
 */
function docLines(fn, params, indent) {
  /** @type {string[]} */
  const lines = fn.doc
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => `${indent}--- ${line}`)
  params.forEach((name, at) => {
    const said = fn.paramDocs[at] ?? ''
    if (said !== '') {
      lines.push(`${indent}---@param ${name} any ${said}`)
    }
  })
  return lines
}

/**
 * Whether a node is inside another
 * @param {ts.Node} node - The node
 * @param {ts.Node | null} outer - The other
 * @returns {boolean} Whether it is
 */
function isInside(node, outer) {
  return (
    outer !== null && node.getSourceFile() === outer.getSourceFile() && node.pos >= outer.pos && node.end <= outer.end
  )
}

/**
 * A text wrapped in parentheses unless it is a name
 * @param {string} text - The text
 * @returns {string} It, safe as an operand
 */
function wrap(text) {
  return /^[\w.[\]"]+$/u.test(text) ? text : `(${text})`
}

/**
 * A field access
 * @param {string} name - The field
 * @returns {string} `.name`, or `["name"]` for a keyword or other name
 */
function member(name) {
  return NAME.test(name) && !KEYWORDS.has(name) ? `.${name}` : `[${quote(name)}]`
}

/**
 * A table constructor's key
 * @param {string} name - The field
 * @returns {string} `name` or `["name"]`
 */
function key(name) {
  return NAME.test(name) && !KEYWORDS.has(name) ? name : `[${quote(name)}]`
}

/**
 * A Lua string literal
 * @param {string} text - The string
 * @returns {string} The literal, its bytes UTF-8
 */
function quote(text) {
  let out = '"'
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0
    if (char === '"' || char === '\\') {
      out += `\\${char}`
    } else if (code < 32 || code === 127) {
      out += `\\${String(code)}`
    } else {
      out += char
    }
  }
  return `${out}"`
}

/**
 * A number literal, exact
 * @param {number} value - The number
 * @returns {string} Its Lua source
 */
function numberText(value) {
  if (Object.is(value, -0)) {
    return '-0.0'
  }
  if (Number.isNaN(value)) {
    return '(0/0)'
  }
  if (!Number.isFinite(value)) {
    return value > 0 ? 'math.huge' : '-math.huge'
  }
  return String(value)
}

/**
 * A name in Lua's style: snake_case
 * @param {string} name - The name, in camelCase
 * @returns {string} The name
 */
function snake(name) {
  return name.replaceAll(/(?<=[a-z0-9])(?<capital>[A-Z])/gu, '_$<capital>').toLowerCase()
}

/**
 * The name a module's functions take in another module's output
 * @param {string} module - The module's path
 * @returns {string} The prefix
 */
function prefixOf(module) {
  const base = module.split('/').at(-1) ?? module
  return base.replace(/\.js$/u, '').replaceAll(/-(?<letter>\w)/gu, (_, letter) => String(letter).toUpperCase())
}

/**
 * Whether a record's value has only its type's fields: a literal
 * @param {Expr} value - The record
 * @returns {boolean} Whether it does
 */
function isExact(value) {
  return value.kind === 'record' && value.entries.every((entry) => entry.kind === 'field')
}

/**
 * Whether a printed operand needs no parentheses
 * @param {Expr} value - The expression
 * @param {string} text - Its text
 * @returns {boolean} Whether it is atomic
 */
function isAtomic(value, text) {
  return (
    ['local', 'constant', 'literal', 'field', 'index', 'call', 'builtin', 'undefined'].includes(value.kind) &&
    !text.startsWith('-') &&
    !text.includes(' ') &&
    !text.startsWith('#')
  )
}

export { printLua }
