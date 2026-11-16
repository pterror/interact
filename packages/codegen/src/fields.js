/**
 * Fields a state owns the record of: a field whose record no one but the state holding it can reach, so that a step
 * owning the state may change that record in place too (`state.drag.over = over` for `{ ...drag, over }`).
 *
 * A field is owned when, across every function the widget runs:
 * - every record stored in it is one just made, one read out of the same field (a move), `null`, or a constant (which
 *   the planner copies when it is stored, if a field of it is ever changed in place);
 * - every read of it, and of a local holding it, only reads it: a field of it, a test of it, a spread copying it, a
 *   store into the same field, or an argument of a function that does no more with it;
 * - no input or props has a field of that name, so no record from outside is read through it.
 * A copy of a record (a spread made anew) copies its owned fields' records as well, so no two records share one.
 */

import ts from 'typescript'

import { membersOf } from './types.js'
import { blocksOf, children, eachInStmt } from './walk.js'

/** @import { Binding, Expr, Fn, Stmt, Widget } from './ir.js' */

/**
 * An owned field: the fields of its records a spread sets, and whether a constant stored in it is copied
 * @typedef {Readonly<{ written: ReadonlySet<string>, copyConstants: boolean }>} OwnedField
 */

/**
 * The fields a widget's states own the records of
 * @param {Widget} widget - The widget
 * @param {readonly Fn[]} fns - Every function its entries reach
 * @param {(fn: Fn) => Fn} bodyOf - A function as normalized
 * @param {ts.TypeChecker} checker - The checker
 * @param {(type: ts.Type) => boolean} isRecord - Whether a type is a record (or `null`)
 * @returns {Map<string, OwnedField>} The owned fields
 */
function ownedFields(widget, fns, bodyOf, checker, isRecord) {
  const outside = outsideNames(widget, checker)
  /** @type {Map<Expr, Readonly<{ parent: Expr, entry: number }>>} */
  const parents = new Map()
  /** @type {Map<Expr, Fn>} */
  const owner = new Map()
  /** @type {Map<Expr, Stmt>} */
  const statementOf = new Map()
  /** @type {Expr[]} */
  const all = []
  const visit = (/** @type {Fn} */ fn, /** @type {readonly Stmt[]} */ stmts) => {
    for (const stmt of stmts) {
      eachInStmt(stmt, (expr) => {
        all.push(expr)
        owner.set(expr, fn)
        if (!parents.has(expr)) {
          statementOf.set(expr, stmt)
        }
        if (expr.kind === 'record') {
          expr.entries.forEach((entry, index) => {
            parents.set(entry.value, { entry: index, parent: expr })
          })
          return
        }
        for (const child of children(expr)) {
          parents.set(child, { entry: -1, parent: expr })
        }
      })
      for (const block of blocksOf(stmt)) {
        visit(fn, block)
      }
    }
  }
  for (const fn of fns) {
    visit(fn, bodyOf(fn).body)
  }

  /** @type {Set<string>} */
  const candidates = new Set()
  for (const expr of all) {
    if (expr.kind !== 'record' || isEffect(expr)) {
      continue
    }
    for (const entry of expr.entries) {
      if (entry.kind === 'field' && isRecord(entry.value.type) && !outside.has(entry.name)) {
        candidates.add(entry.name)
      }
    }
  }
  /** @type {Set<string>} */
  const refused = new Set()
  /** @type {Map<string, Set<string>>} */
  const written = new Map()
  /** @type {Map<string, Set<string>>} */
  const constantFields = new Map()

  /** @type {Map<Binding, string>} */
  const held = new Map()
  /** @type {Map<Fn, Map<number, boolean>>} */
  const paramsOk = new Map()

  /**
   * The owned field a value is the record of, if it is one
   * @param {Expr} expr - The value
   * @returns {string | null} The field
   */
  const fieldOf = (expr) => {
    if (expr.kind === 'field' && !expr.optional && candidates.has(expr.name)) {
      return expr.name
    }
    if (expr.kind === 'local') {
      return held.get(expr.binding) ?? null
    }
    return null
  }

  /**
   * Whether a value stored in a field keeps it owned
   * @param {string} field - The field
   * @param {Expr} value - The value
   * @returns {boolean} Whether it does
   */
  const storable = (field, value) => {
    if (value.kind === 'local' && madeLocals.has(value.binding)) {
      return true
    }
    if (value.kind === 'record') {
      return true
    }
    if (value.kind === 'literal') {
      return value.value === null
    }
    if (value.kind === 'constant') {
      /** @type {Set<string>} */
      const names = constantFields.get(field) ?? new Set()
      const { value: made } = value.constant
      for (const name of made.kind === 'record' ? fieldNames(made) : ['*']) {
        names.add(name)
      }
      constantFields.set(field, names)
      return true
    }
    if (value.kind === 'conditional') {
      return storable(field, value.whenTrue) && storable(field, value.whenFalse)
    }
    if (value.kind === 'call') {
      return returnsMade(value.fn, new Set(), null)
    }
    return fieldOf(value) === field
  }

  /**
   * Whether a value is a record just made
   * @param {Expr} value - The value
   * @returns {boolean} Whether it is
   */
  const isMade = (value) =>
    value.kind === 'record' ||
    (value.kind === 'literal' && value.value === null) ||
    (value.kind === 'conditional' && isMade(value.whenTrue) && isMade(value.whenFalse)) ||
    (value.kind === 'call' && returnsMade(value.fn, new Set(), null))

  /**
   * Whether a function returns only records it made, or tuples with one at `index`
   * @param {Fn} fn - The function
   * @param {Set<Fn>} seen - Functions being asked about
   * @param {number | null} index - The tuple's element, if it returns tuples
   * @returns {boolean} Whether it does
   */
  const returnsMade = (fn, seen, index) => {
    if (seen.has(fn)) {
      return true
    }
    seen.add(fn)
    if (index !== null) {
      return returnsOf(bodyOf(fn).body).every((value) => {
        const item = value.kind === 'array' ? value.items[index] : undefined
        return item !== undefined && !item.spread && isMade(item.value)
      })
    }
    /**
     * @param {Expr} value - A returned value
     * @returns {boolean} Whether it is a record just made
     */
    const made = (value) =>
      value.kind === 'record' ||
      (value.kind === 'literal' && value.value === null) ||
      (value.kind === 'conditional' && made(value.whenTrue) && made(value.whenFalse)) ||
      (value.kind === 'call' && returnsMade(value.fn, seen, null))
    return returnsOf(bodyOf(fn).body).every((value) => made(value))
  }

  /**
   * Whether a function does no more with its parameter than read it
   * @param {Fn} fn - The function
   * @param {number} index - The parameter
   * @param {string} field - The field its argument is the record of
   * @returns {boolean} Whether it does
   */
  const paramOk = (fn, index, field) => {
    const known = paramsOk.get(fn)?.get(index)
    if (known !== undefined) {
      return known
    }
    const byIndex = paramsOk.get(fn) ?? new Map([[index, true]])
    paramsOk.set(fn, byIndex)
    byIndex.set(index, true)
    const param = bodyOf(fn).params[index]
    if (param?.kind !== 'bind' || !fns.includes(fn)) {
      byIndex.set(index, false)
      return false
    }
    held.set(param.binding, field)
    const ok = all.every((expr) => {
      if (owner.get(expr) !== fn || expr.kind !== 'local' || expr.binding !== param.binding) {
        return true
      }
      return usedOk(expr, field)
    })
    byIndex.set(index, ok)
    return ok
  }

  /**
   * Whether a use of a field's record only reads it
   * @param {Expr} expr - The record
   * @param {string} field - Its field
   * @returns {boolean} Whether it does
   */
  const usedOk = (expr, field) => {
    const up = parents.get(expr)
    if (up === undefined) {
      const stmt = statementOf.get(expr)
      if (stmt?.kind === 'const') {
        return (
          (stmt.pattern.kind === 'bind' && held.get(stmt.pattern.binding) === field) ||
          (stmt.pattern.kind === 'object' && stmt.pattern.fields.every((one) => one.pattern.kind === 'bind'))
        )
      }
      return stmt?.kind === 'if' || stmt?.kind === 'switch' || stmt?.kind === 'while'
    }
    const { parent } = up
    if (parent.kind === 'field' || parent.kind === 'has') {
      return true
    }
    if (parent.kind === 'binary') {
      return parent.op === '===' || parent.op === '!=='
    }
    if (parent.kind === 'unary') {
      return parent.op === '!'
    }
    if (parent.kind === 'logical') {
      return parent.left === expr || usedOk(parent, field)
    }
    if (parent.kind === 'conditional') {
      return parent.test === expr || usedOk(parent, field)
    }
    if (parent.kind === 'record') {
      const entry = parent.entries[up.entry]
      if (entry?.kind === 'spread') {
        /** @type {Set<string>} */
        const set = written.get(field) ?? new Set()
        for (const later of parent.entries.slice(up.entry + 1)) {
          if (later.kind === 'field') {
            set.add(later.name)
          }
        }
        written.set(field, set)
        return true
      }
      return entry?.kind === 'field' && entry.name === field && !isEffect(parent)
    }
    if (parent.kind === 'call') {
      const index = parent.args.indexOf(expr)
      return index !== -1 && paramOk(parent.fn, index, field)
    }
    return false
  }

  /** @type {Set<Binding>} */
  const madeLocals = new Set()
  for (const fn of fns) {
    const bind = (/** @type {readonly Stmt[]} */ stmts) => {
      for (const stmt of stmts) {
        if (stmt.kind === 'const' && stmt.pattern.kind === 'bind' && isMade(stmt.value)) {
          madeLocals.add(stmt.pattern.binding)
        }
        if (stmt.kind === 'const' && stmt.pattern.kind === 'tuple' && stmt.value.kind === 'call') {
          const { fn: callee } = stmt.value
          stmt.pattern.items.forEach((item, index) => {
            if (item?.kind === 'bind' && returnsMade(callee, new Set(), index)) {
              madeLocals.add(item.binding)
            }
          })
        }
        if (stmt.kind === 'const') {
          if (stmt.pattern.kind === 'bind') {
            const field = fieldOf(stmt.value)
            if (field !== null) {
              held.set(stmt.pattern.binding, field)
            }
          } else if (stmt.pattern.kind === 'object') {
            for (const one of stmt.pattern.fields) {
              if (one.pattern.kind === 'bind' && candidates.has(one.name)) {
                held.set(one.pattern.binding, one.name)
              }
            }
          }
        }
        for (const block of blocksOf(stmt)) {
          bind(block)
        }
      }
    }
    bind(bodyOf(fn).body)
  }

  for (const expr of all) {
    if (expr.kind === 'record' && !isEffect(expr)) {
      for (const entry of expr.entries) {
        if (entry.kind === 'field' && candidates.has(entry.name) && !storable(entry.name, entry.value)) {
          refused.add(entry.name)
        }
      }
    }
  }
  for (const expr of all) {
    const field = fieldOf(expr)
    if (field !== null && !refused.has(field) && !usedOk(expr, field)) {
      refused.add(field)
    }
  }

  /** @type {Map<string, OwnedField>} */
  const owned = new Map()
  for (const field of candidates) {
    if (!refused.has(field)) {
      const changed = written.get(field) ?? new Set()
      const stored = constantFields.get(field) ?? new Set()
      const copyConstants = stored.has('*') || [...stored].some((name) => changed.has(name))
      owned.set(field, { copyConstants, written: changed })
    }
  }
  return owned
}

/**
 * The fields a record literal sets, `*` if a spread may set any
 * @param {Expr & { kind: 'record' }} record - The record
 * @returns {string[]} Their names
 */
function fieldNames(record) {
  return record.entries.map((entry) => (entry.kind === 'field' ? entry.name : '*'))
}

/**
 * Whether a record literal is an effect: it has a `type`, which a state never has
 * @param {Expr & { kind: 'record' }} record - The record
 * @returns {boolean} Whether it is
 */
function isEffect(record) {
  return record.entries.some((entry) => entry.kind === 'field' && entry.name === 'type')
}

/**
 * The values a function's body returns
 * @param {readonly Stmt[]} stmts - The body
 * @returns {Expr[]} The values
 */
function returnsOf(stmts) {
  return stmts.flatMap((stmt) => [
    ...(stmt.kind === 'return' ? [stmt.value] : []),
    ...blocksOf(stmt).flatMap((block) => returnsOf(block)),
  ])
}

/**
 * Every field name a widget's input and props have, at any depth: a record read from outside may have these
 * @param {Widget} widget - The widget
 * @param {ts.TypeChecker} checker - The checker
 * @returns {Set<string>} The names
 */
function outsideNames(widget, checker) {
  /** @type {Set<string>} */
  const names = new Set()
  /** @type {Set<ts.Type>} */
  const seen = new Set()
  const visit = (/** @type {ts.Type} */ type) => {
    if (seen.has(type)) {
      return
    }
    seen.add(type)
    for (const member of membersOf(type)) {
      if ((member.flags & ts.TypeFlags.Object) === 0) {
        continue
      }
      for (const property of checker.getPropertiesOfType(checker.getApparentType(member))) {
        names.add(property.name)
        visit(checker.getTypeOfSymbol(property))
      }
      const element = checker.getIndexTypeOfType(member, ts.IndexKind.Number)
      if (element !== undefined) {
        visit(element)
      }
    }
  }
  const [props] = widget.init.type.getParameters()
  const input = widget.step.type.getParameters()[1]
  for (const symbol of [props, input]) {
    if (symbol !== undefined) {
      visit(checker.getTypeOfSymbol(symbol))
    }
  }
  return names
}

export { ownedFields }
