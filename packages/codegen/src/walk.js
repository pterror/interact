/**
 * Generic walks over the intermediate form: an expression's children, rebuilding one from new children, and every
 * expression a statement holds
 */

/** @import { Binding, Entry, Expr, Item, Pattern, Stmt } from './ir.js' */

/**
 * An expression's child expressions, in the order they are evaluated (a lambda's body aside)
 * @param {Expr} expr - The expression
 * @returns {readonly Expr[]} Its children
 */
function children(expr) {
  switch (expr.kind) {
    case 'field': {
      return [expr.object]
    }
    case 'index': {
      return [expr.object, expr.index]
    }
    case 'record': {
      return expr.entries.map((entry) => entry.value)
    }
    case 'array': {
      return expr.items.map((item) => item.value)
    }
    case 'call':
    case 'builtin': {
      return expr.args
    }
    case 'method': {
      return [expr.object, ...expr.args]
    }
    case 'unary': {
      return [expr.operand]
    }
    case 'binary':
    case 'logical': {
      return [expr.left, expr.right]
    }
    case 'conditional': {
      return [expr.test, expr.whenTrue, expr.whenFalse]
    }
    case 'has': {
      return [expr.object]
    }
    case 'template': {
      return expr.parts.filter((part) => typeof part !== 'string')
    }
    case 'literal':
    case 'undefined':
    case 'local':
    case 'constant':
    case 'function':
    case 'regex':
    case 'lambda': {
      return []
    }
    default: {
      throw new TypeError('Not an expression')
    }
  }
}

/**
 * An expression with each child replaced
 * @param {Expr} expr - The expression
 * @param {(child: Expr) => Expr} map - The replacement of each child
 * @returns {Expr} The expression rebuilt, or the same one if no child changed
 */
function mapChildren(expr, map) {
  switch (expr.kind) {
    case 'field': {
      const object = map(expr.object)
      return object === expr.object ? expr : { ...expr, object }
    }
    case 'index': {
      const object = map(expr.object)
      const index = map(expr.index)
      return object === expr.object && index === expr.index ? expr : { ...expr, index, object }
    }
    case 'record': {
      /** @type {Entry[]} */
      const entries = expr.entries.map((entry) => ({ ...entry, value: map(entry.value) }))
      return entries.every((entry, at) => entry.value === expr.entries[at]?.value) ? expr : { ...expr, entries }
    }
    case 'array': {
      /** @type {Item[]} */
      const items = expr.items.map((item) => ({ ...item, value: map(item.value) }))
      return items.every((item, at) => item.value === expr.items[at]?.value) ? expr : { ...expr, items }
    }
    case 'call':
    case 'builtin': {
      const args = expr.args.map((arg) => map(arg))
      return args.every((arg, at) => arg === expr.args[at]) ? expr : { ...expr, args }
    }
    case 'method': {
      const object = map(expr.object)
      const args = expr.args.map((arg) => map(arg))
      return object === expr.object && args.every((arg, at) => arg === expr.args[at]) ? expr : { ...expr, args, object }
    }
    case 'unary': {
      const operand = map(expr.operand)
      return operand === expr.operand ? expr : { ...expr, operand }
    }
    case 'binary':
    case 'logical': {
      const left = map(expr.left)
      const right = map(expr.right)
      return left === expr.left && right === expr.right ? expr : { ...expr, left, right }
    }
    case 'conditional': {
      const test = map(expr.test)
      const then = map(expr.whenTrue)
      const otherwise = map(expr.whenFalse)
      return test === expr.test && then === expr.whenTrue && otherwise === expr.whenFalse
        ? expr
        : { ...expr, test, whenFalse: otherwise, whenTrue: then }
    }
    case 'has': {
      const object = map(expr.object)
      return object === expr.object ? expr : { ...expr, object }
    }
    case 'template': {
      const parts = expr.parts.map((part) => (typeof part === 'string' ? part : map(part)))
      return parts.every((part, at) => part === expr.parts[at]) ? expr : { ...expr, parts }
    }
    case 'literal':
    case 'undefined':
    case 'local':
    case 'constant':
    case 'function':
    case 'regex':
    case 'lambda': {
      return expr
    }
    default: {
      throw new TypeError('Not an expression')
    }
  }
}

/**
 * Every expression in an expression, itself first, lambdas' bodies included
 * @param {Expr} expr - The expression
 * @param {(expr: Expr) => void} visit - Called with each
 * @returns {void}
 */
function eachExpr(expr, visit) {
  visit(expr)
  if (expr.kind === 'lambda') {
    for (const stmt of expr.body) {
      eachInStmt(stmt, visit)
    }
    return
  }
  for (const child of children(expr)) {
    eachExpr(child, visit)
  }
}

/**
 * Every expression in a statement, nested statements included
 * @param {Stmt} stmt - The statement
 * @param {(expr: Expr) => void} visit - Called with each
 * @returns {void}
 */
function eachInStmt(stmt, visit) {
  for (const expr of exprsOf(stmt)) {
    eachExpr(expr, visit)
  }
  for (const block of blocksOf(stmt)) {
    for (const inner of block) {
      eachInStmt(inner, visit)
    }
  }
}

/**
 * The expressions a statement holds itself, its nested blocks' aside
 * @param {Stmt} stmt - The statement
 * @returns {readonly Expr[]} Its expressions
 */
function exprsOf(stmt) {
  switch (stmt.kind) {
    case 'const':
    case 'let':
    case 'assign':
    case 'return':
    case 'set': {
      return [stmt.value]
    }
    case 'if':
    case 'while': {
      return [stmt.test]
    }
    case 'switch': {
      return [stmt.subject, ...stmt.cases.flatMap((one) => one.tests)]
    }
    case 'emit': {
      return stmt.items.map((item) => item.value)
    }
    case 'insert': {
      return [stmt.index, ...stmt.items.map((item) => item.value)]
    }
    case 'scan': {
      return [stmt.from, stmt.to, stmt.test]
    }
    case 'splice': {
      return [stmt.index, ...stmt.items]
    }
    default: {
      throw new TypeError('Not a statement')
    }
  }
}

/**
 * A statement's nested blocks
 * @param {Stmt} stmt - The statement
 * @returns {readonly (readonly Stmt[])[]} Its blocks
 */
function blocksOf(stmt) {
  if (stmt.kind === 'if') {
    return [stmt.whenTrue, stmt.whenFalse]
  }
  if (stmt.kind === 'while') {
    return [stmt.body]
  }
  if (stmt.kind === 'switch') {
    return [...stmt.cases.map((one) => one.body), ...(stmt.fallback === null ? [] : [stmt.fallback])]
  }
  return []
}

/**
 * The bindings a pattern binds
 * @param {Pattern} pattern - The pattern
 * @returns {Binding[]} Its bindings
 */
function bindingsOf(pattern) {
  if (pattern.kind === 'bind') {
    return [pattern.binding]
  }
  if (pattern.kind === 'tuple') {
    return pattern.items.flatMap((item) => (item === null ? [] : bindingsOf(item)))
  }
  return pattern.fields.flatMap((field) => bindingsOf(field.pattern))
}

/**
 * Whether a block can end without returning
 * @param {readonly Stmt[]} stmts - The block
 * @returns {boolean} Whether control can run off its end
 */
function completes(stmts) {
  const last = stmts.at(-1)
  if (last === undefined) {
    return true
  }
  if (last.kind === 'return') {
    return false
  }
  if (last.kind === 'if') {
    return completes(last.whenTrue) || completes(last.whenFalse)
  }
  if (last.kind === 'switch') {
    return last.fallback === null || completes(last.fallback) || last.cases.some((one) => completes(one.body))
  }
  return true
}

export { bindingsOf, blocksOf, children, completes, eachExpr, eachInStmt, exprsOf, mapChildren }
