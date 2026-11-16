/**
 * Integer widths: a number declared `i32`, `u32` or `i53` (the contract's typedefs) holds only integers in that
 * width's range. Every value stored where a width is declared (a field, a parameter, a `let`, a function's result) must
 * be shown to be such an integer from what it is made of: literals, values of declared widths, `.length`, `indexOf`,
 * arithmetic on those, `Math.max`/`min`/`abs`/`floor`/`ceil`/`round`/`trunc` of bounded values, and the coercions
 * `x | 0` (to i32) and `x >>> 0` (to u32), which wrap as the source says. A value that may leave the range is
 * reported: the source writes the wrap or the clamp, nothing does it implicitly. `+x` is a double.
 *
 * One exception: an i53 counted on by one (`id + 1`, `n - 1`) is still an i53. It would take 2^53 steps to leave
 * the range, which no count of events reaches, so an id or counter needs no wrap.
 *
 * What it learns is each number's range, which the Lua printer uses to leave out conversions JavaScript's operators
 * do that the range makes nothing.
 */

import ts from 'typescript'

import { placeOf } from './program.js'
import { isNumber } from './types.js'
import { blocksOf, eachExpr, exprsOf } from './walk.js'

/** @import { Expr, Fn, Stmt, Widget } from './ir.js' */

/**
 * The values a number may have: integers or not, from `lo` to `hi`
 * @typedef {Readonly<{ lo: number, hi: number, int: boolean }>} Range
 */

/** @type {Readonly<Record<string, Range>>} */
const WIDTHS = {
  i32: { hi: 2 ** 31 - 1, int: true, lo: -(2 ** 31) },
  i53: { hi: 2 ** 53 - 1, int: true, lo: -(2 ** 53 - 1) },
  u32: { hi: 2 ** 32 - 1, int: true, lo: 0 },
}

const I32 = WIDTHS['i32'] ?? { hi: 0, int: true, lo: 0 }
const I53 = WIDTHS['i53'] ?? I32
const U32 = WIDTHS['u32'] ?? I32
/** An index an array method gives: -1, or an index of an array */
const FOUND = { hi: 2 ** 32 - 2, int: true, lo: -1 }

/**
 * A declared width: of the value, or of an array's elements, or of a tuple's
 * @typedef {Readonly<{ kind: 'number', name: string, range: Range }>
 *   | Readonly<{ kind: 'array', element: Declared }>
 *   | Readonly<{ kind: 'tuple', elements: readonly (Declared | null)[] }>} Declared
 */

/**
 * Checks the widths of the numbers a widget's functions make and store
 * @param {readonly Widget[]} widgets - The widgets
 * @param {ts.TypeChecker} checker - The checker
 * @param {string} root - Where paths in messages start
 * @returns {Readonly<{ diagnostics: readonly string[], ranges: ReadonlyMap<ts.Node, Range> }>} What breaks a width,
 *   and the range of each number found, by where it is
 */
function checkWidths(widgets, checker, root) {
  /** @type {string[]} */
  const diagnostics = []
  /** @type {Map<ts.Node, Range>} */
  const ranges = new Map()
  /** @type {Map<Expr, Range | null>} */
  const known = new Map()
  /** @type {Map<number, Expr>} */
  const initial = new Map()
  /** @type {Set<Fn>} */
  const fns = new Set()

  const collect = (/** @type {Fn} */ fn) => {
    if (fns.has(fn)) {
      return
    }
    fns.add(fn)
    walk(fn.body, (expr) => {
      if (expr.kind === 'call') {
        collect(expr.fn)
      }
    })
  }
  for (const widget of widgets) {
    for (const fn of [
      widget.init,
      widget.step,
      ...(widget.composite?.handlers.map((one) => one.fn) ?? []),
      ...(widget.composite?.props.map((one) => one.fn) ?? []),
    ]) {
      collect(fn)
    }
  }
  for (const fn of fns) {
    walkStmts(fn.body, (stmt) => {
      if (stmt.kind === 'const' && stmt.pattern.kind === 'bind') {
        initial.set(stmt.pattern.binding.id, stmt.value)
      }
    })
  }

  /**
   * The width a declaration gives its value
   * @param {ts.Node | undefined} declaration - The declaration
   * @returns {Declared | null} The width
   */
  const declaredAt = (declaration) => {
    if (declaration === undefined) {
      return null
    }
    if (ts.isPropertySignature(declaration) || ts.isPropertyDeclaration(declaration)) {
      return fromTypeNode(declaration.type)
    }
    if (ts.isParameter(declaration) || ts.isVariableDeclaration(declaration)) {
      return fromTypeNode(ts.getJSDocType(declaration) ?? declaration.type)
    }
    if (ts.isBindingElement(declaration) && ts.isArrayBindingPattern(declaration.parent)) {
      const at = declaration.parent.elements.indexOf(declaration)
      const holder = declaration.parent.parent
      const value = ts.isVariableDeclaration(holder) ? holder.initializer : undefined
      const signature =
        value !== undefined && ts.isCallExpression(value) ? checker.getResolvedSignature(value) : undefined
      const callee = signature?.getDeclaration()
      const returned =
        callee === undefined || ts.isJSDocSignature(callee)
          ? null
          : fromTypeNode(ts.getJSDocReturnType(callee) ?? callee.type)
      const element = returned?.kind === 'tuple' ? returned.elements[at] : null
      return element ?? null
    }
    if (ts.isBindingElement(declaration)) {
      const name = declaration.propertyName ?? declaration.name
      if (!ts.isIdentifier(name)) {
        return null
      }
      const holder = checker.getTypeAtLocation(declaration.parent)
      const property = checker.getPropertyOfType(checker.getApparentType(holder), name.text)
      return declaredOf(property)
    }
    if (ts.isJSDocPropertyTag(declaration) || ts.isJSDocParameterTag(declaration)) {
      return fromTypeNode(declaration.typeExpression?.type)
    }
    return null
  }

  /**
   * The width a symbol's declarations give, the same in each
   * @param {ts.Symbol | undefined} symbol - The symbol
   * @returns {Declared | null} The width
   */
  const declaredOf = (symbol) => {
    const all = (symbol?.getDeclarations() ?? []).map((one) => declaredAt(one))
    const [first] = all
    return first !== undefined && first !== null && all.every((one) => same(one, first)) ? first : null
  }

  /**
   * The width declared for what an expression reads: a field, a local or parameter
   * @param {Expr} expr - The expression
   * @returns {Declared | null} The width
   */
  const declaredFor = (expr) => {
    const { at } = expr
    if (expr.kind === 'field' && ts.isPropertyAccessExpression(at)) {
      const holder = checker.getTypeAtLocation(at.expression)
      const members = holder.isUnion() ? holder.types : [holder]
      const found = members
        .map((member) => checker.getPropertyOfType(checker.getApparentType(member), expr.name))
        .filter((one) => one !== undefined)
        .map((one) => declaredOf(one))
      const [first] = found
      return first !== undefined && first !== null && found.every((one) => same(one, first)) ? first : null
    }
    if (expr.kind === 'local' && ts.isIdentifier(at)) {
      const symbol = ts.isShorthandPropertyAssignment(at.parent)
        ? checker.getShorthandAssignmentValueSymbol(at.parent)
        : checker.getSymbolAtLocation(at)
      return declaredOf(symbol)
    }
    return null
  }

  /**
   * The range of a number
   * @param {Expr} expr - The expression
   * @returns {Range | null} Its range, `null` if it may be any number
   */
  const rangeOf = (expr) => {
    if (known.has(expr)) {
      return known.get(expr) ?? null
    }
    known.set(expr, null)
    const range = computed(expr)
    known.set(expr, range)
    if (range !== null) {
      ranges.set(expr.at, range)
    }
    return range
  }

  /**
   * @param {Expr} expr - The expression
   * @returns {Range | null} Its range
   */
  const computed = (expr) => {
    switch (expr.kind) {
      case 'literal': {
        return typeof expr.value === 'number'
          ? { hi: expr.value, int: Number.isInteger(expr.value), lo: expr.value }
          : null
      }
      case 'local': {
        const declared = declaredFor(expr)
        if (declared !== null) {
          return declared.kind === 'number' ? declared.range : null
        }
        const value = initial.get(expr.binding.id)
        return value === undefined || expr.binding.mutable ? null : rangeOf(value)
      }
      case 'constant': {
        return rangeOf(expr.constant.value)
      }
      case 'field': {
        if (expr.name === 'length') {
          return U32
        }
        const declared = declaredFor(expr)
        return declared?.kind === 'number' ? declared.range : null
      }
      case 'index': {
        const declared = declaredFor(expr.object)
        if (declared?.kind === 'array' && declared.element.kind === 'number') {
          return declared.element.range
        }
        if (declared?.kind === 'tuple' && expr.index.kind === 'literal' && typeof expr.index.value === 'number') {
          const element = declared.elements[expr.index.value]
          return element?.kind === 'number' ? element.range : null
        }
        return null
      }
      case 'logical': {
        return expr.op === '??' ? union(rangeOf(expr.left), rangeOf(expr.right)) : null
      }
      case 'conditional': {
        return union(rangeOrNull(expr.whenTrue), rangeOrNull(expr.whenFalse))
      }
      case 'unary': {
        const operand = rangeOf(expr.operand)
        if (operand === null || expr.op === '!') {
          return null
        }
        return expr.op === '-'
          ? { hi: -operand.lo, int: operand.int, lo: -operand.hi }
          : { hi: operand.hi, int: false, lo: operand.lo }
      }
      case 'binary': {
        return binary(expr)
      }
      case 'method': {
        return ['findIndex', 'findLastIndex', 'indexOf', 'lastIndexOf'].includes(expr.name) ? FOUND : null
      }
      case 'builtin': {
        return builtin(expr)
      }
      case 'call': {
        const declaration = expr.fn.type.getDeclaration()
        const returned = fromTypeNode(ts.getJSDocReturnType(declaration) ?? declaration.type)
        return returned?.kind === 'number' ? returned.range : null
      }
      case 'array':
      case 'function':
      case 'has':
      case 'lambda':
      case 'record':
      case 'regex':
      case 'template':
      case 'undefined': {
        return null
      }
      default: {
        return null
      }
    }
  }

  /**
   * The range of a value that may be `null`: `null` adds nothing
   * @param {Expr} expr - The value
   * @returns {Range | null | 'null'} Its range, or `'null'` for the literal
   */
  const rangeOrNull = (expr) => (expr.kind === 'literal' && expr.value === null ? 'null' : rangeOf(expr))

  /**
   * @param {Expr & { kind: 'binary' }} expr - An arithmetic or bitwise operation
   * @returns {Range | null} Its range
   */
  const binary = (expr) => {
    const left = rangeOf(expr.left)
    const right = rangeOf(expr.right)
    switch (expr.op) {
      case '+':
      case '-':
      case '*': {
        if (left === null || right === null) {
          return null
        }
        if (expr.op !== '*' && same53(left) && right.int && right.lo === right.hi && Math.abs(right.lo) === 1) {
          return I53
        }
        const corners =
          expr.op === '+'
            ? [left.lo + right.lo, left.hi + right.hi]
            : expr.op === '-'
              ? [left.lo - right.hi, left.hi - right.lo]
              : [left.lo * right.lo, left.lo * right.hi, left.hi * right.lo, left.hi * right.hi]
        return { hi: Math.max(...corners), int: left.int && right.int, lo: Math.min(...corners) }
      }
      case '/': {
        if (left === null || right === null || (right.lo <= 0 && right.hi >= 0)) {
          return null
        }
        const corners = [left.lo / right.lo, left.lo / right.hi, left.hi / right.lo, left.hi / right.hi]
        return { hi: Math.max(...corners), int: false, lo: Math.min(...corners) }
      }
      case '%': {
        if (left === null || right === null || (right.lo <= 0 && right.hi >= 0)) {
          return null
        }
        const most = Math.max(Math.abs(right.lo), Math.abs(right.hi))
        const bound = right.int && left.int ? most - 1 : most
        return {
          hi: Math.min(Math.max(0, left.hi), bound),
          int: left.int && right.int,
          lo: Math.max(Math.min(0, left.lo), -bound),
        }
      }
      case '&': {
        const masks = [left, right].flatMap((one) =>
          one !== null && one.int && one.lo === one.hi && one.lo >= 0 && one.lo <= I32.hi ? [one.lo] : [],
        )
        return masks.length === 0 ? I32 : { hi: Math.min(...masks), int: true, lo: 0 }
      }
      case '|':
      case '^': {
        if (expr.op === '|' && right?.lo === 0 && right.hi === 0 && left !== null && left.int && within(left, I32)) {
          return left
        }
        return I32
      }
      case '<<': {
        return I32
      }
      case '>>': {
        if (left !== null && left.int && within(left, I32) && right !== null && right.lo === right.hi && right.int) {
          const by = ((right.lo % 32) + 32) % 32
          return { hi: left.hi >> by, int: true, lo: left.lo >> by }
        }
        return I32
      }
      case '>>>': {
        if (right?.lo === 0 && right.hi === 0 && left !== null && left.int && within(left, U32)) {
          return left
        }
        return U32
      }
      case '===':
      case '!==':
      case '<':
      case '<=':
      case '>':
      case '>=': {
        return null
      }
      default: {
        return null
      }
    }
  }

  /**
   * @param {Expr & { kind: 'builtin' }} expr - A call of a Math function
   * @returns {Range | null} Its range
   */
  const builtin = (expr) => {
    const given = expr.args.flatMap((arg) => {
      const range = rangeOf(arg)
      return range === null ? [] : [range]
    })
    const [first] = given
    if (given.length !== expr.args.length) {
      return null
    }
    if (first === undefined) {
      return null
    }
    const rounded = (/** @type {(x: number) => number} */ round) => ({
      hi: round(first.hi),
      int: Number.isFinite(first.lo) && Number.isFinite(first.hi),
      lo: round(first.lo),
    })
    switch (expr.name) {
      case 'Math.max': {
        return {
          hi: Math.max(...given.map((one) => one.hi)),
          int: given.every((one) => one.int),
          lo: Math.max(...given.map((one) => one.lo)),
        }
      }
      case 'Math.min': {
        return {
          hi: Math.min(...given.map((one) => one.hi)),
          int: given.every((one) => one.int),
          lo: Math.min(...given.map((one) => one.lo)),
        }
      }
      case 'Math.abs': {
        const lo = first.lo <= 0 && first.hi >= 0 ? 0 : Math.min(Math.abs(first.lo), Math.abs(first.hi))
        return { hi: Math.max(Math.abs(first.lo), Math.abs(first.hi)), int: first.int, lo }
      }
      case 'Math.floor': {
        return rounded(Math.floor)
      }
      case 'Math.ceil': {
        return rounded(Math.ceil)
      }
      case 'Math.round': {
        return rounded(Math.round)
      }
      case 'Math.trunc': {
        return rounded(Math.trunc)
      }
      case 'Math.sign': {
        return { hi: 1, int: first.int, lo: -1 }
      }
      default: {
        return null
      }
    }
  }

  /**
   * Checks a value stored where a width is declared
   * @param {Declared | null} declared - The width
   * @param {Expr} value - The value
   * @returns {void}
   */
  const store = (declared, value) => {
    if (declared === null) {
      return
    }
    if (declared.kind === 'tuple' || declared.kind === 'array') {
      if (value.kind !== 'array') {
        return
      }
      value.items.forEach((item, index) => {
        const element = declared.kind === 'tuple' ? (declared.elements[index] ?? null) : declared.element
        if (!item.spread) {
          store(element, item.value)
        }
      })
      return
    }
    if (!isNumber(value.type) && !value.type.isUnion()) {
      return
    }
    const range = rangeOrNull(value)
    if (range === 'null') {
      return
    }
    if (range === null || !range.int || !within(range, declared.range)) {
      const shown = range === null ? 'any number' : `${range.int ? 'integers' : 'numbers'} ${text(range)}`
      diagnostics.push(
        `${placeOf(value.at, root)}: \`${value.at.getText()}\` may be ${shown}, not an ${declared.name} ${text(declared.range)}: ` +
          'write the wrap or clamp it needs (`(x) | 0` to i32, `x >>> 0` to u32, a Math.max/min, Math.floor/trunc)',
      )
    }
  }

  /**
   * The width declared for a record literal's field, from the type the literal is made as
   * @param {Expr & { kind: 'record' }} record - The literal
   * @param {string} name - The field
   * @returns {Declared | null} The width
   */
  const fieldSlot = (record, name) => {
    const context = ts.isObjectLiteralExpression(record.at) ? checker.getContextualType(record.at) : undefined
    if (context === undefined) {
      return null
    }
    const typeEntry = record.entries.find((entry) => entry.kind === 'field' && entry.name === 'type')
    const tag = typeEntry?.value.kind === 'literal' ? typeEntry.value.value : null
    const members = (context.isUnion() ? context.types : [context]).filter((member) => {
      if (tag === null) {
        return true
      }
      const property = checker.getPropertyOfType(member, 'type')
      const type = property === undefined ? null : checker.getTypeOfSymbol(property)
      return type === null || !type.isStringLiteral() || type.value === tag
    })
    const found = members
      .map((member) => checker.getPropertyOfType(checker.getApparentType(member), name))
      .filter((one) => one !== undefined)
      .map((one) => declaredOf(one))
    return found.find((one) => one !== null) ?? null
  }

  for (const fn of fns) {
    const declaration = fn.type.getDeclaration()
    const returned = fromTypeNode(ts.getJSDocReturnType(declaration) ?? declaration.type)
    walkStmts(fn.body, (stmt) => {
      if (stmt.kind === 'return') {
        store(returned, stmt.value)
      }
      if (stmt.kind === 'let' || stmt.kind === 'assign') {
        const symbolNode = ts.isVariableDeclaration(stmt.at) ? stmt.at : null
        const declared = symbolNode === null ? declaredForBinding(stmt) : declaredAt(symbolNode)
        store(declared, stmt.value)
      }
      if (stmt.kind === 'const' && stmt.pattern.kind === 'bind' && ts.isVariableDeclaration(stmt.at)) {
        store(declaredAt(stmt.at), stmt.value)
      }
    })
    walk(fn.body, (expr) => {
      if (isNumber(expr.type)) {
        rangeOf(expr)
      }
      if (expr.kind === 'record') {
        for (const entry of expr.entries) {
          if (entry.kind === 'field') {
            store(fieldSlot(expr, entry.name), entry.value)
          }
        }
      }
      if (expr.kind === 'call') {
        const params = expr.fn.type.getDeclaration().parameters
        expr.args.forEach((arg, index) => {
          store(declaredAt(params[index]), arg)
        })
      }
    })
  }

  /**
   * The width a `let` was declared with, for an assignment to it
   * @param {Stmt & { kind: 'let' | 'assign' }} stmt - The statement
   * @returns {Declared | null} The width
   */
  function declaredForBinding(stmt) {
    const { at } = stmt
    const expression = ts.isExpressionStatement(at) ? at.expression : at
    const target = ts.isBinaryExpression(expression)
      ? expression.left
      : ts.isPrefixUnaryExpression(expression) || ts.isPostfixUnaryExpression(expression)
        ? expression.operand
        : expression
    return declaredOf(checker.getSymbolAtLocation(target))
  }

  return { diagnostics: [...new Set(diagnostics)], ranges }
}

/**
 * A width from a type written in a declaration: `i32`, `u32` or `i53`, one of them or `null`, or an array or tuple of
 * them
 * @param {ts.TypeNode | undefined} node - The type
 * @returns {Declared | null} The width
 */
function fromTypeNode(node) {
  if (node === undefined) {
    return null
  }
  if (ts.isParenthesizedTypeNode(node)) {
    return fromTypeNode(node.type)
  }
  if (ts.isTypeOperatorNode(node) && node.operator === ts.SyntaxKind.ReadonlyKeyword) {
    return fromTypeNode(node.type)
  }
  if (ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName)) {
    const range = WIDTHS[node.typeName.text]
    return range === undefined ? null : { kind: 'number', name: node.typeName.text, range }
  }
  if (ts.isUnionTypeNode(node)) {
    const rest = node.types.filter(
      (one) => !(ts.isLiteralTypeNode(one) && one.literal.kind === ts.SyntaxKind.NullKeyword),
    )
    const [only] = rest
    return rest.length === 1 && only !== undefined ? fromTypeNode(only) : null
  }
  if (ts.isArrayTypeNode(node)) {
    const element = fromTypeNode(node.elementType)
    return element === null ? null : { element, kind: 'array' }
  }
  if (ts.isTupleTypeNode(node)) {
    const elements = node.elements.map((one) => fromTypeNode(ts.isNamedTupleMember(one) ? one.type : one))
    return elements.some((one) => one !== null) ? { elements, kind: 'tuple' } : null
  }
  return null
}

/**
 * Whether two declared widths are the same
 * @param {Declared | null} a - One
 * @param {Declared} b - The other
 * @returns {boolean} Whether they are
 */
function same(a, b) {
  return JSON.stringify(a) === JSON.stringify(b)
}

/**
 * The range holding both, `null` (any number) if either may be any
 * @param {Range | null | 'null'} a - One
 * @param {Range | null | 'null'} b - The other
 * @returns {Range | null} The range
 */
function union(a, b) {
  if (a === 'null') {
    return b === 'null' ? null : b
  }
  if (b === 'null') {
    return a
  }
  if (a === null || b === null) {
    return null
  }
  return { hi: Math.max(a.hi, b.hi), int: a.int && b.int, lo: Math.min(a.lo, b.lo) }
}

/**
 * Whether a range is exactly i53's
 * @param {Range} range - The range
 * @returns {boolean} Whether it is
 */
function same53(range) {
  return range.int && range.lo === I53.lo && range.hi === I53.hi
}

/**
 * Whether a range is inside another
 * @param {Range} inner - The range
 * @param {Range} outer - The other
 * @returns {boolean} Whether it is
 */
function within(inner, outer) {
  return inner.lo >= outer.lo && inner.hi <= outer.hi
}

/**
 * A range, for a message
 * @param {Range} range - The range
 * @returns {string} `[lo, hi]`
 */
function text(range) {
  return `[${String(range.lo)}, ${String(range.hi)}]`
}

/**
 * Every expression in some statements, lambdas' bodies included
 * @param {readonly Stmt[]} stmts - The statements
 * @param {(expr: Expr) => void} visit - Called with each
 * @returns {void}
 */
function walk(stmts, visit) {
  walkStmts(stmts, (stmt) => {
    for (const expr of exprsOf(stmt)) {
      eachExpr(expr, (one) => {
        visit(one)
        if (one.kind === 'lambda') {
          walk(one.body, visit)
        }
      })
    }
  })
}

/**
 * Every statement in some statements, nested ones included
 * @param {readonly Stmt[]} stmts - The statements
 * @param {(stmt: Stmt) => void} visit - Called with each
 * @returns {void}
 */
function walkStmts(stmts, visit) {
  for (const stmt of stmts) {
    visit(stmt)
    for (const block of blocksOf(stmt)) {
      walkStmts(block, visit)
    }
  }
}

export { checkWidths, within }
