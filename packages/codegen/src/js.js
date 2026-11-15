/**
 * Prints a planned widget as a JavaScript module, and the declarations that type it as its source's widget is typed.
 * The module's widget keeps the contract (`init(props)` and `step(state, input)` give `[state, effects]`) with the
 * ownership the runtime gives it: `step` may change the state it is handed, and each result's effects array is new
 * (V8 allocates a small array faster than it empties a kept one).
 */

import { capital } from './normalize.js'
import { bindingsOf, blocksOf, eachInStmt } from './walk.js'

/** @import { Binding, Constant, Expr, Fn, Item, Pattern, Stmt } from './ir.js' */
/** @import { Plan } from './plan.js' */

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/u

/** Functions a module defines when it uses them: JavaScript's operations without the arrays they would make */
const HELPERS = {
  includesIn: [
    '/**',
    ' * Whether `list.slice(from, to)` includes `value`, without making the slice',
    ' * @param list - The array',
    ' * @param value - What is looked for, by SameValueZero as `includes` looks',
    ' * @param from - Where the slice starts',
    ' * @param to - Where it ends',
    ' */',
    'function includesIn(list, value, from, to = list.length) {',
    '  const start = sliceIndex(from, list.length)',
    '  const end = sliceIndex(to, list.length)',
    '  for (let index = start; index < end; index += 1) {',
    '    const item = list[index]',
    '    if (item === value || (item !== item && value !== value)) {',
    '      return true',
    '    }',
    '  }',
    '  return false',
    '}',
    '',
    '/**',
    ' * An index as `slice` takes it: truncated, from the end if negative, within the array',
    ' * @param index - The index',
    ' * @param count - The length',
    ' */',
    'function sliceIndex(index, count) {',
    '  const whole = Math.trunc(index) || 0',
    '  return whole < 0 ? Math.max(count + whole, 0) : Math.min(whole, count)',
    '}',
  ],
}
const RESERVED = new Set([
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'debugger',
  'default',
  'delete',
  'do',
  'else',
  'export',
  'extends',
  'finally',
  'for',
  'function',
  'if',
  'import',
  'in',
  'instanceof',
  'let',
  'new',
  'return',
  'super',
  'switch',
  'this',
  'throw',
  'try',
  'typeof',
  'var',
  'void',
  'while',
  'with',
  'yield',
])

/**
 * Where the generated module finds what it imports: the source's modules, for the views; a child widget is the module
 * generated beside it
 * @typedef {Readonly<{
 *   source: (module: string) => string,
 *   header: string,
 * }>} Imports
 */

/**
 * Prints a planned widget
 * @param {Plan} planned - The plan
 * @param {Imports} imports - Where its imports come from, and its header
 * @returns {Readonly<{ js: string, dts: string }>} The module and its declarations
 */
function printJs(planned, imports) {
  const { widget } = planned
  const nameOf = moduleNames(planned)
  const factoryAt = widget.factory?.at ?? null
  /** @type {Map<Binding, string>} */
  const factoryNames = new Map((widget.factory?.params ?? []).map((binding) => [binding, binding.name]))
  const printer = makePrinter(nameOf, factoryNames)
  const reference = `import { ${widget.name} as reference } from '${imports.source(widget.module)}'`
  const children = (widget.composite?.children ?? []).flatMap((child) =>
    child.widget.kind === 'export' ? [`import { ${child.widget.name} } from './${child.widget.name}.js'`] : [],
  )
  /** @type {string[]} */
  const lines = [imports.header, reference, ...children, '']
  for (const constant of planned.constants.filter((one) => !isInside(one.at, factoryAt))) {
    lines.push(`const ${nameOf(constant)} = ${printer.expr(constant.value)}`, '')
  }
  for (const fn of planned.fns.filter((one) => !isInside(one.at, factoryAt))) {
    lines.push(...printer.fn(fn, ''), '')
  }
  const { factory } = widget
  if (factory === null) {
    lines.push(`export const ${widget.name} = ${widgetObject(planned, nameOf, '  ', 'reference.view')}`)
  } else {
    const params = factory.params.map((param) => param.name).join(', ')
    lines.push(
      ...docLines(
        factory.doc,
        factory.params.map((param, at) => [param.name, factory.paramDocs[at] ?? '']),
        '',
      ),
      `export function ${widget.name}(${params}) {`,
      ...factory.locals.flatMap((stmt) => printer.stmt(stmt, '  ')),
      ...planned.constants
        .filter((one) => isInside(one.at, factoryAt))
        .map((constant) => `  const ${nameOf(constant)} = ${printer.expr(constant.value)}`),
      ...planned.fns.filter((one) => isInside(one.at, factoryAt)).flatMap((fn) => printer.fn(fn, '  ')),
      `  const { view } = reference(${params})`,
      `  return ${widgetObject(planned, nameOf, '    ', 'view')}`,
      '}',
    )
  }
  const top = [imports.header, reference, ...children, '']
  lines.splice(0, top.length, ...top, ...printer.helpers())
  return {
    dts: `${imports.header}\nexport declare const ${widget.name}: typeof import('${imports.source(widget.module)}').${widget.name}\n`,
    js: `${lines.join('\n')}\n`,
  }
}

/**
 * Names for a plan's functions and constants, unique in the module: a function from another source module than the
 * widget's takes that module's name before its own
 * @param {Plan} planned - The plan
 * @returns {(owner: Fn | Constant) => string} The names
 */
function moduleNames(planned) {
  const { widget } = planned
  /** @type {Map<number, string>} */
  const names = new Map()
  const taken = new Set([
    'out',
    'reference',
    'view',
    widget.name,
    ...(widget.factory?.params ?? []).map((one) => one.name),
  ])
  /**
   * @param {Fn | Constant} owner - What is named
   * @returns {string} Its name
   */
  const nameOf = (owner) => {
    const known = names.get(owner.id)
    if (known !== undefined) {
      return known
    }
    const own = owner.module === widget.module ? owner.name : `${prefixOf(owner.module)}${capital(owner.name)}`
    const base = RESERVED.has(own) ? `${own}_` : own
    let name = base
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
  return nameOf
}

/**
 * The widget object: the contract's functions over the planned ones
 * @param {Plan} planned - The plan
 * @param {(owner: Fn | Constant) => string} nameOf - Module-level names
 * @param {string} indent - The indent inside the object
 * @param {string} view - The view's source
 * @returns {string} The object's source
 */
function widgetObject(planned, nameOf, indent, view) {
  const { widget } = planned
  /**
   * An entry: a planned function, giving `[state, effects]` with a new effects array
   * @param {Fn} source - The source function
   * @returns {string} The entry
   */
  const entry = (source) => {
    const fn = planned.planned.get(source) ?? source
    if (fn.out === null) {
      return nameOf(fn)
    }
    const params = fn.params.map((param) => patternText(param, (binding) => binding.name)).join(', ')
    const args = [...fn.params.flatMap((param) => bindingsOf(param).map((binding) => binding.name)), 'out'].join(', ')
    return `(${params}) => {\n${indent}  const out = []\n${indent}  return [${nameOf(fn)}(${args}), out]\n${indent}}`
  }
  /** @type {string[]} */
  const fields = []
  const { composite } = widget
  if (composite === null) {
    fields.push(`init: ${entry(widget.init)}`)
  } else {
    const children = composite.children.map((child) => {
      const name = child.widget.kind === 'export' ? child.widget.name : child.widget.binding.name
      return name === child.name ? name : `${child.name}: ${name}`
    })
    const props = composite.props.map((one) => `${one.child}: ${nameOf(planned.planned.get(one.fn) ?? one.fn)}`)
    fields.push(
      `bubble: ${handlersText(composite.handlers, 'bubble', entry, indent)}`,
      `capture: ${handlersText(composite.handlers, 'capture', entry, indent)}`,
      `children: { ${children.join(', ')} }`,
      `init: ${entry(widget.init)}`,
      `on: ${handlersText(composite.handlers, 'on', entry, indent)}`,
      `props: { ${props.join(', ')} }`,
    )
  }
  fields.push(`step: ${entry(widget.step)}`, view === 'view' ? 'view' : `view: ${view}`)
  return `{\n${fields.map((field) => `${indent}${field},`).join('\n')}\n${indent.slice(2)}}`
}

/**
 * A composite's handlers of one phase, as an object by child and type
 * @param {readonly Readonly<{ phase: string, child: string, type: string, fn: Fn }>[]} handlers - The handlers
 * @param {string} phase - The phase
 * @param {(fn: Fn) => string} entry - An entry's source
 * @param {string} indent - The indent
 * @returns {string} The object's source
 */
function handlersText(handlers, phase, entry, indent) {
  /** @type {Map<string, string[]>} */
  const byChild = new Map()
  for (const handler of handlers.filter((one) => one.phase === phase)) {
    const list = byChild.get(handler.child) ?? []
    list.push(`${handler.type}: ${entry(handler.fn)}`)
    byChild.set(handler.child, list)
  }
  if (byChild.size === 0) {
    return '{}'
  }
  return `{ ${[...byChild].map(([child, list]) => `${child}: { ${list.join(`,\n${indent}  `)} }`).join(', ')} }`
}

/**
 * The name a module's functions take in another module's output: its file's base name
 * @param {string} module - The module's path
 * @returns {string} The prefix
 */
function prefixOf(module) {
  const base = module.split('/').at(-1) ?? module
  return base.replace(/\.js$/u, '').replaceAll(/-(?<letter>\w)/gu, (_, letter) => String(letter).toUpperCase())
}

/**
 * Whether a node is inside another
 * @param {import('typescript').Node} node - The node
 * @param {import('typescript').Node | null} outer - The other
 * @returns {boolean} Whether it is
 */
function isInside(node, outer) {
  return (
    outer !== null && node.getSourceFile() === outer.getSourceFile() && node.pos >= outer.pos && node.end <= outer.end
  )
}

/**
 * A JSDoc comment for a function
 * @param {string} doc - Its description
 * @param {readonly (readonly [string, string])[]} params - Its parameters' names and descriptions
 * @param {string} indent - The indent
 * @returns {string[]} The comment's lines
 */
function docLines(doc, params, indent) {
  const text = [
    ...doc.split('\n').filter((line) => line.trim() !== ''),
    ...params.filter(([, said]) => said !== '').map(([name, said]) => `@param ${name} - ${said.replaceAll('\n', ' ')}`),
  ]
  if (text.length === 0) {
    return []
  }
  return [`${indent}/**`, ...text.map((line) => `${indent} * ${line}`), `${indent} */`]
}

/**
 * The printer of functions, statements and expressions
 * @param {(owner: Fn | Constant) => string} nameOf - Module-level names
 * @param {ReadonlyMap<Binding, string>} outer - Names of a factory's parameters
 * @returns {Readonly<{
 *   fn: (fn: Fn, indent: string) => string[],
 *   stmt: (stmt: Stmt, indent: string) => string[],
 *   expr: (value: Expr) => string,
 *   helpers: () => string[],
 * }>} The printer
 */
function makePrinter(nameOf, outer) {
  /** @type {Map<Binding, string>} */
  let locals = new Map(outer)
  /** @type {Set<string>} */
  let used = new Set(outer.values())
  /** @type {ReadonlySet<Binding>} */
  let read = new Set()
  /** @type {Set<keyof typeof HELPERS>} */
  const helpers = new Set()

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
    const base = RESERVED.has(binding.name) ? `${binding.name}_` : binding.name
    let name = base
    for (let count = 2; used.has(name); count += 1) {
      name = `${base}${String(count)}`
    }
    used.add(name)
    locals.set(binding, name)
    return name
  }

  /**
   * A function
   * @param {Fn} one - The function, planned
   * @param {string} indent - The indent
   * @returns {string[]} Its lines
   */
  const printFn = (one, indent) => {
    locals = new Map(outer)
    used = new Set([...outer.values(), 'out'])
    read = readBindings(one.body)
    const params = one.params.map((param) => patternText(param, localName))
    if (one.out !== null) {
      locals.set(one.out, 'out')
    }
    /** @type {(readonly [string, string])[]} */
    const docParams = params.map((param, at) => [param, one.paramDocs[at] ?? ''])
    return [
      ...docLines(one.doc, docParams, indent),
      `${indent}function ${nameOf(one)}(${[...params, ...(one.out === null ? [] : ['out'])].join(', ')}) {`,
      ...block(one.body, `${indent}  `),
      `${indent}}`,
    ]
  }

  /**
   * A block's lines
   * @param {readonly Stmt[]} stmts - The block
   * @param {string} indent - The indent
   * @returns {string[]} The lines
   */
  const block = (stmts, indent) => stmts.flatMap((one) => printStmt(one, indent))

  /**
   * A statement
   * @param {Stmt} one - The statement
   * @param {string} indent - The indent
   * @returns {string[]} Its lines
   */
  const printStmt = (one, indent) => {
    const inner = `${indent}  `
    switch (one.kind) {
      case 'const': {
        if (one.pattern.kind === 'bind' && !read.has(one.pattern.binding) && one.value.kind === 'call') {
          return [`${indent}${printExpr(one.value)}`]
        }
        return [`${indent}const ${patternText(one.pattern, localName)} = ${printExpr(one.value)}`]
      }
      case 'let': {
        const name = localName(one.binding)
        return [
          one.value.kind === 'undefined' ? `${indent}let ${name}` : `${indent}let ${name} = ${printExpr(one.value)}`,
        ]
      }
      case 'assign': {
        return [`${indent}${localName(one.binding)} = ${printExpr(one.value)}`]
      }
      case 'set': {
        return [`${indent}${localName(one.object)}${member(one.name, false)} = ${printExpr(one.value)}`]
      }
      case 'return': {
        return [`${indent}return ${printExpr(one.value)}`]
      }
      case 'if': {
        const lines = [`${indent}if (${printExpr(one.test)}) {`, ...block(one.whenTrue, inner)]
        const [only] = one.whenFalse
        if (one.whenFalse.length === 1 && only?.kind === 'if') {
          const [first, ...others] = printStmt(only, indent)
          return [...lines, `${indent}} else ${(first ?? '').trimStart()}`, ...others]
        }
        if (one.whenFalse.length > 0) {
          lines.push(`${indent}} else {`, ...block(one.whenFalse, inner))
        }
        return [...lines, `${indent}}`]
      }
      case 'switch': {
        const clauses = one.cases.flatMap((clause) => [
          ...clause.tests.map(
            (test, at) => `${inner}case ${printExpr(test)}:${at === clause.tests.length - 1 ? ' {' : ''}`,
          ),
          ...block(clause.body, `${inner}  `),
          `${inner}}`,
        ])
        const fallback =
          one.fallback === null ? [] : [`${inner}default: {`, ...block(one.fallback, `${inner}  `), `${inner}}`]
        return [`${indent}switch (${printExpr(one.subject)}) {`, ...clauses, ...fallback, `${indent}}`]
      }
      case 'while': {
        return [`${indent}while (${printExpr(one.test)}) {`, ...block(one.body, inner), `${indent}}`]
      }
      case 'emit': {
        return pushLines(localName(one.out), one.items, indent)
      }
      case 'insert': {
        const items = one.items.map((item) => itemText(item)).join(', ')
        return [`${indent}${localName(one.out)}.splice(${printExpr(one.index)}, 0, ${items})`]
      }
      case 'scan': {
        const target = localName(one.target)
        const index = localName({ id: -one.target.id, mutable: true, name: 'index', type: one.target.type })
        const to = printExpr(one.to)
        return [
          `${indent}let ${target} = false`,
          `${indent}for (let ${index} = ${printExpr(one.from)}; ${index} < ${to} && !${target}; ${index} += 1) {`,
          `${inner}const ${localName(one.param)} = ${localName(one.out)}[${index}]`,
          `${inner}${target} = ${printExpr(one.test)}`,
          `${indent}}`,
        ]
      }
      default: {
        throw new TypeError('Not a statement')
      }
    }
  }

  /**
   * Appends items to the effect buffer: an array written out is appended item by item, and one chosen by a condition
   * is appended in an `if`, so neither array is made
   * @param {string} out - The buffer
   * @param {readonly Item[]} items - The items
   * @param {string} indent - The indent
   * @returns {string[]} The lines
   */
  const pushLines = (out, items, indent) => {
    /** @type {string[]} */
    const lines = []
    /** @type {string[]} */
    let pushed = []
    const flush = () => {
      if (pushed.length > 0) {
        lines.push(`${indent}${out}.push(${pushed.join(', ')})`)
        pushed = []
      }
    }
    for (const item of items) {
      const { value } = item
      if (!item.spread) {
        pushed.push(printExpr(value))
      } else if (isEmpty(item)) {
        continue
      } else if (value.kind === 'array') {
        pushed.push(...value.items.map((inner) => itemText(inner)))
      } else if (value.kind === 'conditional') {
        flush()
        const whenTrue = pushLines(out, [{ spread: true, value: value.whenTrue }], `${indent}  `)
        const whenFalse = pushLines(out, [{ spread: true, value: value.whenFalse }], `${indent}  `)
        if (whenTrue.length === 0 && whenFalse.length > 0) {
          lines.push(`${indent}if (!${operand(value.test)}) {`, ...whenFalse, `${indent}}`)
        } else if (whenTrue.length > 0) {
          const otherwise = whenFalse.length > 0 ? [`${indent}} else {`, ...whenFalse] : []
          lines.push(`${indent}if (${printExpr(value.test)}) {`, ...whenTrue, ...otherwise, `${indent}}`)
        }
      } else {
        pushed.push(itemText(item))
      }
    }
    flush()
    return lines
  }

  /**
   * An array item
   * @param {Item} item - The item
   * @returns {string} Its source
   */
  const itemText = (item) => (item.spread ? `...${operand(item.value)}` : printExpr(item.value))

  /**
   * An expression, parenthesized unless it is an atom
   * @param {Expr} value - The expression
   * @returns {string} Its source
   */
  const operand = (value) => {
    const text = printExpr(value)
    return isAtom(value) ? text : `(${text})`
  }

  /**
   * A record literal: a later field of one name replaces an earlier one (the values are only read)
   * @param {Expr & { kind: 'record' }} value - The literal
   * @returns {string} Its source
   */
  const recordText = (value) => {
    /** @type {Map<string, string>} */
    const fields = new Map()
    /** @type {string[]} */
    const parts = []
    for (const entry of value.entries) {
      if (entry.kind === 'spread') {
        parts.push(`...${operand(entry.value)}`)
        continue
      }
      const text = printExpr(entry.value)
      const key = IDENTIFIER.test(entry.name) ? entry.name : quote(entry.name)
      const part = text === entry.name ? entry.name : `${key}: ${text}`
      const before = fields.get(entry.name)
      if (before !== undefined) {
        parts.splice(parts.indexOf(before), 1)
      }
      fields.set(entry.name, part)
      parts.push(part)
    }
    return parts.length === 0 ? '{}' : `{ ${parts.join(', ')} }`
  }

  /**
   * An expression
   * @param {Expr} value - The expression
   * @returns {string} Its source
   */
  const printExpr = (value) => {
    switch (value.kind) {
      case 'literal': {
        return typeof value.value === 'string' ? quote(value.value) : String(value.value)
      }
      case 'undefined': {
        return 'undefined'
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
        return `${operand(value.object)}${member(value.name, value.optional)}`
      }
      case 'index': {
        return `${operand(value.object)}[${printExpr(value.index)}]`
      }
      case 'record': {
        return recordText(value)
      }
      case 'array': {
        return `[${value.items.map((item) => itemText(item)).join(', ')}]`
      }
      case 'call': {
        return `${nameOf(value.fn)}(${value.args.map((arg) => printExpr(arg)).join(', ')})`
      }
      case 'builtin': {
        if (value.name === 'includesIn') {
          helpers.add('includesIn')
        }
        return `${value.name}(${value.args.map((arg) => printExpr(arg)).join(', ')})`
      }
      case 'method': {
        return `${operand(value.object)}.${value.name}(${value.args.map((arg) => printExpr(arg)).join(', ')})`
      }
      case 'unary': {
        return `${value.op}${operand(value.operand)}`
      }
      case 'binary':
      case 'logical': {
        return `${operand(value.left)} ${value.op} ${operand(value.right)}`
      }
      case 'conditional': {
        return `${operand(value.test)} ? ${operand(value.whenTrue)} : ${operand(value.whenFalse)}`
      }
      case 'has': {
        return `${quote(value.name)} in ${operand(value.object)}`
      }
      case 'template': {
        const parts = value.parts.map((part) =>
          typeof part === 'string' ? part.replaceAll(/[`$\\]/gu, (char) => `\\${char}`) : `\${${printExpr(part)}}`,
        )
        return `\`${parts.join('')}\``
      }
      case 'regex': {
        return `/${value.pattern}/${value.flags}`
      }
      case 'lambda': {
        const params = value.params.map((param) => patternText(param, localName))
        const head =
          params.length === 1 && value.params[0]?.kind === 'bind' ? (params[0] ?? '') : `(${params.join(', ')})`
        const [only] = value.body
        if (value.body.length === 1 && only?.kind === 'return') {
          const body = printExpr(only.value)
          return `${head} => ${only.value.kind === 'record' ? `(${body})` : body}`
        }
        return `${head} => {\n${block(value.body, '    ').join('\n')}\n  }`
      }
      default: {
        throw new TypeError('Not an expression')
      }
    }
  }

  return {
    expr: printExpr,
    fn: printFn,
    helpers: () => [...helpers].flatMap((name) => [...HELPERS[name], '']),
    stmt: printStmt,
  }
}

/**
 * The locals a function's body reads, or changes a field of
 * @param {readonly Stmt[]} body - The body
 * @returns {Set<Binding>} Them
 */
function readBindings(body) {
  /** @type {Set<Binding>} */
  const found = new Set()
  /**
   * @param {readonly Stmt[]} stmts - A block
   * @returns {void}
   */
  const visit = (stmts) => {
    for (const stmt of stmts) {
      if (stmt.kind === 'set') {
        found.add(stmt.object)
      }
      for (const inner of blocksOf(stmt)) {
        visit(inner)
      }
    }
  }
  for (const stmt of body) {
    eachInStmt(stmt, (expr) => {
      if (expr.kind === 'local') {
        found.add(expr.binding)
      }
    })
  }
  visit(body)
  return found
}

/**
 * A pattern's source
 * @param {Pattern} pattern - The pattern
 * @param {(binding: Binding) => string} name - Names of locals
 * @returns {string} Its source
 */
function patternText(pattern, name) {
  if (pattern.kind === 'bind') {
    return name(pattern.binding)
  }
  if (pattern.kind === 'tuple') {
    return `[${pattern.items.map((item) => (item === null ? '' : patternText(item, name))).join(', ')}]`
  }
  const fields = pattern.fields.map((field) => {
    const inner = patternText(field.pattern, name)
    return inner === field.name ? inner : `${field.name}: ${inner}`
  })
  return `{ ${fields.join(', ')} }`
}

/**
 * Whether an array item adds nothing: a spread of an empty array
 * @param {Item} item - The item
 * @returns {boolean} Whether it is empty
 */
function isEmpty(item) {
  const { value } = item
  const array = value.kind === 'constant' ? value.constant.value : value
  return item.spread && array.kind === 'array' && array.items.length === 0
}

/**
 * Whether an expression needs no parentheses as an operand
 * @param {Expr} value - The expression
 * @returns {boolean} Whether it is an atom
 */
function isAtom(value) {
  if (value.kind === 'literal') {
    return typeof value.value !== 'number' || value.value >= 0
  }
  return !['binary', 'logical', 'conditional', 'unary', 'has', 'lambda'].includes(value.kind)
}

/**
 * A member access
 * @param {string} name - The field
 * @param {boolean} optional - Whether it is `?.`
 * @returns {string} `.name`, `?.name`, `['name']` or `?.['name']`
 */
function member(name, optional) {
  const access = IDENTIFIER.test(name) ? `.${name}` : `[${quote(name)}]`
  if (!optional) {
    return access
  }
  return access.startsWith('.') ? `?${access}` : `?.${access}`
}

/**
 * A string literal
 * @param {string} text - The string
 * @returns {string} Its source, single-quoted
 */
function quote(text) {
  return `'${text.replaceAll(/[\\']/gu, (char) => `\\${char}`).replaceAll('\n', String.raw`\n`)}'`
}

export { printJs }
