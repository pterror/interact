/**
 * Rewrites a function into a form the planner reads, keeping what it computes: a step's result chosen by a condition
 * becomes a choice of `return`s; a call in tail position of a function that takes a step's result is inlined; a local
 * record used only for its fields becomes one local per field; a local that is a literal becomes a module constant.
 */

import { eachInStmt, mapChildren } from './walk.js'

/** @import ts from 'typescript' */
/** @import { Binding, Constant, Entry, Expr, Fn, Pattern, Stmt } from './ir.js' */

/**
 * What normalizing needs: which types are a step's result, a fresh local's id, and the module constants made
 * @typedef {Readonly<{
 *   isResult: (type: ts.Type) => boolean,
 *   isResultOrNull: (type: ts.Type) => boolean,
 *   nullType: ts.Type,
 *   booleanType: ts.Type,
 *   fresh: (name: string, type: ts.Type) => Binding,
 *   constant: (name: string, value: Expr, module: string) => Constant,
 *   resultKind: (fn: Fn) => 'result' | 'nullable' | null,
 * }>} Context
 */

/**
 * Normalizes a function's body
 * @param {Fn} fn - The function
 * @param {Context} context - What normalizing needs
 * @returns {readonly Stmt[]} Its body, normalized
 */
function normalize(fn, context) {
  const returns = block(fn.body, context, fn)
  return literalsToConstants(scalarRecords(propagateAliases(returns), context), context, fn.module)
}

/**
 * Normalizes a block
 * @param {readonly Stmt[]} stmts - The block
 * @param {Context} context - What normalizing needs
 * @param {Fn} fn - The function it is in
 * @returns {Stmt[]} The block
 */
function block(stmts, context, fn) {
  return stmts.flatMap((stmt) => statement(stmt, context, fn))
}

/**
 * Normalizes a statement
 * @param {Stmt} stmt - The statement
 * @param {Context} context - What normalizing needs
 * @param {Fn} fn - The function it is in
 * @returns {Stmt[]} The statements it becomes
 */
function statement(stmt, context, fn) {
  if (stmt.kind === 'return') {
    return returning(stmt.value, stmt.at, context, fn)
  }
  if (stmt.kind === 'if') {
    return [{ ...stmt, whenFalse: block(stmt.whenFalse, context, fn), whenTrue: block(stmt.whenTrue, context, fn) }]
  }
  if (stmt.kind === 'switch') {
    return [
      {
        ...stmt,
        cases: stmt.cases.map((one) => ({ ...one, body: block(one.body, context, fn) })),
        fallback: stmt.fallback === null ? null : block(stmt.fallback, context, fn),
      },
    ]
  }
  if (stmt.kind === 'while') {
    return [{ ...stmt, body: block(stmt.body, context, fn) }]
  }
  return [stmt]
}

/**
 * A `return` of a step's result: one `return` per choice, and a tail call of a function taking a result inlined
 * @param {Expr} value - What is returned
 * @param {ts.Node} at - The `return`
 * @param {Context} context - What normalizing needs
 * @param {Fn} fn - The function it is in
 * @returns {Stmt[]} The statements
 */
function returning(value, at, context, fn) {
  if (context.resultKind(fn) === null) {
    return [{ at, kind: 'return', value }]
  }
  if (value.kind === 'conditional') {
    return [
      {
        at,
        kind: 'if',
        whenFalse: returning(value.whenFalse, at, context, fn),
        test: value.test,
        whenTrue: returning(value.whenTrue, at, context, fn),
      },
    ]
  }
  if (
    value.kind === 'logical' &&
    value.op === '??' &&
    value.left.kind === 'call' &&
    context.resultKind(value.left.fn) === 'nullable'
  ) {
    const held = context.fresh('handled', value.left.type)
    /** @type {Expr} */
    const local = { at: value.left.at, binding: held, kind: 'local', type: value.left.type }
    /** @type {Expr} */
    const nothing = { at, kind: 'literal', type: context.nullType, value: null }
    return [
      { at, kind: 'const', pattern: { binding: held, kind: 'bind' }, value: value.left },
      {
        at,
        kind: 'if',
        whenFalse: [],
        test: { at, kind: 'binary', left: local, op: '!==', right: nothing, type: context.booleanType },
        whenTrue: [{ at, kind: 'return', value: local }],
      },
      ...returning(value.right, at, context, fn),
    ]
  }
  if (value.kind === 'call' && takesResult(value.fn, context)) {
    return block(inline(value.fn, value.args, context), context, value.fn)
  }
  return [{ at, kind: 'return', value }]
}

/**
 * Whether a function takes a step's result as a parameter
 * @param {Fn} fn - The function
 * @param {Context} context - What normalizing needs
 * @returns {boolean} Whether it does
 */
function takesResult(fn, context) {
  return fn.params.some((param) => param.kind === 'tuple' && context.isResult(param.type))
}

/**
 * A function's body in place of a call of it in tail position: each parameter bound to its argument, in order
 * @param {Fn} fn - The function
 * @param {readonly Expr[]} args - The arguments
 * @param {Context} context - What normalizing needs
 * @returns {Stmt[]} The body, its locals new
 */
function inline(fn, args, context) {
  /** @type {Map<Binding, Binding>} */
  const renamed = new Map()
  /** @type {Stmt[]} */
  const bound = []
  fn.params.forEach((param, at) => {
    const arg = args[at]
    if (arg === undefined) {
      throw new Error(`A call of ${fn.name} has too few arguments`)
    }
    bound.push({ at: arg.at, kind: 'const', pattern: renamePattern(param, renamed, context), value: arg })
  })
  return [...bound, ...fn.body.map((stmt) => renameStmt(stmt, renamed, context))]
}

/**
 * A pattern with new bindings
 * @param {Pattern} pattern - The pattern
 * @param {Map<Binding, Binding>} renamed - Old bindings to new, added to
 * @param {Context} context - What normalizing needs
 * @returns {Pattern} The pattern
 */
function renamePattern(pattern, renamed, context) {
  if (pattern.kind === 'bind') {
    const binding = { ...context.fresh(pattern.binding.name, pattern.binding.type), mutable: pattern.binding.mutable }
    renamed.set(pattern.binding, binding)
    return { binding, kind: 'bind' }
  }
  if (pattern.kind === 'tuple') {
    return {
      ...pattern,
      items: pattern.items.map((item) => (item === null ? null : renamePattern(item, renamed, context))),
    }
  }
  return {
    ...pattern,
    fields: pattern.fields.map((field) => ({ ...field, pattern: renamePattern(field.pattern, renamed, context) })),
  }
}

/**
 * A statement with its locals renamed
 * @param {Stmt} stmt - The statement
 * @param {Map<Binding, Binding>} renamed - Old bindings to new, added to
 * @param {Context} context - What normalizing needs
 * @returns {Stmt} The statement
 */
function renameStmt(stmt, renamed, context) {
  const expr = (/** @type {Expr} */ value) => renameExpr(value, renamed, context)
  const stmts = (/** @type {readonly Stmt[]} */ list) => list.map((one) => renameStmt(one, renamed, context))
  const binding = (/** @type {Binding} */ old) => renamed.get(old) ?? old
  switch (stmt.kind) {
    case 'const': {
      const value = expr(stmt.value)
      return { ...stmt, pattern: renamePattern(stmt.pattern, renamed, context), value }
    }
    case 'let': {
      const value = expr(stmt.value)
      const fresh = { ...context.fresh(stmt.binding.name, stmt.binding.type), mutable: true }
      renamed.set(stmt.binding, fresh)
      return { ...stmt, binding: fresh, value }
    }
    case 'assign': {
      return { ...stmt, binding: binding(stmt.binding), value: expr(stmt.value) }
    }
    case 'return': {
      return { ...stmt, value: expr(stmt.value) }
    }
    case 'if': {
      return { ...stmt, whenFalse: stmts(stmt.whenFalse), test: expr(stmt.test), whenTrue: stmts(stmt.whenTrue) }
    }
    case 'while': {
      return { ...stmt, body: stmts(stmt.body), test: expr(stmt.test) }
    }
    case 'switch': {
      return {
        ...stmt,
        cases: stmt.cases.map((one) => ({ body: stmts(one.body), tests: one.tests.map((test) => expr(test)) })),
        fallback: stmt.fallback === null ? null : stmts(stmt.fallback),
        subject: expr(stmt.subject),
      }
    }
    case 'set':
    case 'emit':
    case 'insert':
    case 'scan': {
      throw new Error(`A ${stmt.kind} is not in a source function`)
    }
    default: {
      throw new TypeError('Not a statement')
    }
  }
}

/**
 * An expression with its locals renamed
 * @param {Expr} expr - The expression
 * @param {Map<Binding, Binding>} renamed - Old bindings to new
 * @param {Context} context - What normalizing needs
 * @returns {Expr} The expression
 */
function renameExpr(expr, renamed, context) {
  if (expr.kind === 'local') {
    const binding = renamed.get(expr.binding)
    return binding === undefined ? expr : { ...expr, binding }
  }
  if (expr.kind === 'lambda') {
    const params = expr.params.map((param) => renamePattern(param, renamed, context))
    return { ...expr, body: expr.body.map((stmt) => renameStmt(stmt, renamed, context)), params }
  }
  return mapChildren(expr, (child) => renameExpr(child, renamed, context))
}

/**
 * Replaces each local that only names another (`const before = state`) with the other
 * @param {readonly Stmt[]} stmts - The function's body
 * @returns {readonly Stmt[]} The body
 */
function propagateAliases(stmts) {
  /** @type {Map<Binding, Binding>} */
  const same = new Map()
  return rewriteBlocks(stmts, (stmt) => {
    if (
      stmt.kind === 'const' &&
      stmt.pattern.kind === 'bind' &&
      stmt.value.kind === 'local' &&
      !stmt.value.binding.mutable &&
      !stmt.pattern.binding.mutable
    ) {
      same.set(stmt.pattern.binding, same.get(stmt.value.binding) ?? stmt.value.binding)
      return []
    }
    return [
      mapStmtExprs(stmt, (expr) =>
        deepMap(expr, (one) => {
          const binding = one.kind === 'local' ? same.get(one.binding) : undefined
          return binding === undefined ? one : { ...one, binding }
        }),
      ),
    ]
  })
}

/**
 * Replaces each local record literal used only by its fields (`own.base`, `...own`) with a local per field
 * @param {readonly Stmt[]} stmts - The function's body
 * @param {Context} context - What normalizing needs
 * @returns {readonly Stmt[]} The body
 */
function scalarRecords(stmts, context) {
  /** @type {Map<Binding, Readonly<{ fields: Map<string, Expr> }>>} */
  const candidates = new Map()
  /** @type {Set<Binding>} */
  const escaped = new Set()
  /** @type {Set<Expr>} */
  const fine = new Set()
  const visit = (/** @type {Expr} */ expr) => {
    if (expr.kind === 'field' && expr.object.kind === 'local' && !expr.optional) {
      fine.add(expr.object)
    }
    if (expr.kind === 'record') {
      for (const entry of expr.entries) {
        if (entry.kind === 'spread' && entry.value.kind === 'local') {
          fine.add(entry.value)
        }
      }
    }
  }
  const find = (/** @type {readonly Stmt[]} */ list) => {
    for (const stmt of list) {
      if (
        stmt.kind === 'const' &&
        stmt.pattern.kind === 'bind' &&
        stmt.value.kind === 'record' &&
        stmt.value.entries.every((entry) => entry.kind === 'field')
      ) {
        /** @type {Map<string, Expr>} */
        const fields = new Map()
        for (const entry of stmt.value.entries) {
          fields.set(entry.name, entry.value)
        }
        candidates.set(stmt.pattern.binding, { fields })
      }
      eachInStmt(stmt, visit)
    }
  }
  find(stmts)
  for (const stmt of stmts) {
    eachInStmt(stmt, (expr) => {
      if (expr.kind === 'local' && candidates.has(expr.binding) && !fine.has(expr)) {
        escaped.add(expr.binding)
      }
    })
  }
  for (const binding of escaped) {
    candidates.delete(binding)
  }
  if (candidates.size === 0) {
    return stmts
  }
  /** @type {Map<Binding, Map<string, Expr>>} */
  const locals = new Map()
  return rewriteBlocks(stmts, (stmt) => {
    if (stmt.kind === 'const' && stmt.pattern.kind === 'bind' && candidates.has(stmt.pattern.binding)) {
      const { binding } = stmt.pattern
      /** @type {Map<string, Expr>} */
      const fields = new Map()
      /** @type {Stmt[]} */
      const out = []
      for (const [name, value] of candidates.get(binding)?.fields ?? []) {
        if (value.kind === 'local' || value.kind === 'literal' || value.kind === 'constant') {
          fields.set(name, value)
          continue
        }
        const local = context.fresh(`${binding.name}${capital(name)}`, value.type)
        fields.set(name, { at: value.at, binding: local, kind: 'local', type: value.type })
        out.push({ at: stmt.at, kind: 'const', pattern: { binding: local, kind: 'bind' }, value })
      }
      locals.set(binding, fields)
      return out
    }
    return [
      mapStmtExprs(stmt, (expr) =>
        deepMap(expr, (one) => {
          if (one.kind === 'field' && one.object.kind === 'local') {
            const replaced = locals.get(one.object.binding)?.get(one.name)
            return replaced ?? one
          }
          if (
            one.kind === 'record' &&
            one.entries.some(
              (entry) => entry.kind === 'spread' && entry.value.kind === 'local' && locals.has(entry.value.binding),
            )
          ) {
            /** @type {Entry[]} */
            const entries = one.entries.flatMap((entry) => {
              const fields =
                entry.kind === 'spread' && entry.value.kind === 'local' ? locals.get(entry.value.binding) : undefined
              return fields === undefined ? [entry] : [...fields].map(([name, value]) => fieldEntry(name, value))
            })
            return { ...one, entries }
          }
          return one
        }),
      ),
    ]
  })
}

/**
 * Makes each local bound to a literal (numbers, strings, booleans, `null`, and arrays and records of them) a module
 * constant
 * @param {readonly Stmt[]} stmts - The function's body
 * @param {Context} context - What normalizing needs
 * @param {string} module - The module the constants are in
 * @returns {readonly Stmt[]} The body
 */
function literalsToConstants(stmts, context, module) {
  /** @type {Map<Binding, Constant>} */
  const made = new Map()
  return rewriteBlocks(stmts, (stmt) => {
    if (stmt.kind === 'const' && stmt.pattern.kind === 'bind' && isLiteral(stmt.value)) {
      made.set(stmt.pattern.binding, context.constant(stmt.pattern.binding.name, stmt.value, module))
      return []
    }
    return [
      mapStmtExprs(stmt, (expr) =>
        deepMap(expr, (one) => {
          const constant = one.kind === 'local' ? made.get(one.binding) : undefined
          return constant === undefined ? one : { at: one.at, constant, kind: 'constant', type: one.type }
        }),
      ),
    ]
  })
}

/**
 * Whether an expression is a literal: numbers, strings, booleans, `null`, and arrays and records of them
 * @param {Expr} expr - The expression
 * @returns {boolean} Whether it is
 */
function isLiteral(expr) {
  if (expr.kind === 'literal' || expr.kind === 'constant') {
    return true
  }
  if (expr.kind === 'record') {
    return expr.entries.length > 0 && expr.entries.every((entry) => entry.kind === 'field' && isLiteral(entry.value))
  }
  if (expr.kind === 'array') {
    return expr.items.length > 0 && expr.items.every((item) => !item.spread && isLiteral(item.value))
  }
  return false
}

/**
 * @param {string} name - A field's name
 * @param {Expr} value - Its value
 * @returns {Entry} The record entry
 */
function fieldEntry(name, value) {
  return { kind: 'field', name, value }
}

/**
 * A block with each statement rewritten, nested blocks first
 * @param {readonly Stmt[]} stmts - The block
 * @param {(stmt: Stmt) => Stmt[]} rewrite - What each statement becomes
 * @returns {Stmt[]} The block
 */
function rewriteBlocks(stmts, rewrite) {
  return stmts.flatMap((stmt) => {
    if (stmt.kind === 'if') {
      return rewrite({
        ...stmt,
        whenFalse: rewriteBlocks(stmt.whenFalse, rewrite),
        whenTrue: rewriteBlocks(stmt.whenTrue, rewrite),
      })
    }
    if (stmt.kind === 'while') {
      return rewrite({ ...stmt, body: rewriteBlocks(stmt.body, rewrite) })
    }
    if (stmt.kind === 'switch') {
      return rewrite({
        ...stmt,
        cases: stmt.cases.map((one) => ({ ...one, body: rewriteBlocks(one.body, rewrite) })),
        fallback: stmt.fallback === null ? null : rewriteBlocks(stmt.fallback, rewrite),
      })
    }
    return rewrite(stmt)
  })
}

/**
 * A statement with its own expressions mapped
 * @param {Stmt} stmt - The statement
 * @param {(expr: Expr) => Expr} map - The mapping
 * @returns {Stmt} The statement
 */
function mapStmtExprs(stmt, map) {
  if (stmt.kind === 'const' || stmt.kind === 'let' || stmt.kind === 'assign' || stmt.kind === 'return') {
    return { ...stmt, value: map(stmt.value) }
  }
  if (stmt.kind === 'if' || stmt.kind === 'while') {
    return { ...stmt, test: map(stmt.test) }
  }
  if (stmt.kind === 'switch') {
    return {
      ...stmt,
      cases: stmt.cases.map((one) => ({ ...one, tests: one.tests.map((test) => map(test)) })),
      subject: map(stmt.subject),
    }
  }
  return stmt
}

/**
 * An expression mapped bottom up, lambda bodies included
 * @param {Expr} expr - The expression
 * @param {(expr: Expr) => Expr} map - The mapping
 * @returns {Expr} The expression
 */
function deepMap(expr, map) {
  if (expr.kind === 'lambda') {
    const body = rewriteBlocks(expr.body, (stmt) => [mapStmtExprs(stmt, (inner) => deepMap(inner, map))])
    return map({ ...expr, body })
  }
  return map(mapChildren(expr, (child) => deepMap(child, map)))
}

/**
 * A name with its first letter capital
 * @param {string} name - The name
 * @returns {string} It, capitalized
 */
function capital(name) {
  return `${name.slice(0, 1).toUpperCase()}${name.slice(1)}`
}

export { capital, normalize }
