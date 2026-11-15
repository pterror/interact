/**
 * Plans a widget's functions in place. The runtime hands `step` a state it never reads again, so a record the step
 * owns can be changed instead of copied, wherever the old record is not read afterwards. Effects are appended to the
 * step's effect buffer as they are made, in the order the source's arrays put them.
 *
 * Ownership: a function's parameter is consumed when the function may change it in place; whoever calls it hands over
 * a record no one reads afterwards (or a copy). A record the function made (a literal) is owned too. A record read
 * out of another (a field), a constant, an input or props is never owned. A read of a record after it was handed over
 * or changed is moved before the change when it only reads (a field, a call that only reads); when it can't be, the
 * record is copied as the source would have, and nothing is changed in place.
 *
 * Effects: a function returning a step's result takes the buffer (`out`) last and returns only its state. A call's
 * effects stay where the callee appended them when every `return` after the call puts them in that order; the
 * effects the source puts before them are appended before the call. A call whose effects are dropped or reordered
 * appends to an array of its own, which is then used as the value the source had.
 */

import ts from 'typescript'

import { local } from './ir.js'
import { capital, normalize } from './normalize.js'
import { fieldsOf, tupleOf } from './types.js'
import { bindingsOf, blocksOf, children, completes, eachExpr, eachInStmt, exprsOf, mapChildren } from './walk.js'

/** @import { Binding, Constant, Entry, Expr, Fn, Item, Pattern, Stmt, Widget } from './ir.js' */

/**
 * What the planner learned about a function, for its callers
 * @typedef {{
 *   result: boolean,
 *   nullable: boolean,
 *   consumes: Set<number>,
 *   writes: Map<number, readonly string[]>,
 *   returnsParam: boolean,
 *   returnsOwned: boolean,
 *   keepsOnNull: boolean,
 * }} Info
 */

/**
 * A call's effects: where the callee appended them in `out` (`mark` to `end`, kept when read), or the array of its own
 * it appended them to
 * @typedef {Readonly<{ direct: true, mark: Binding | null, end: Binding | null }>
 *   | Readonly<{ direct: false, value: Expr }>} Segment
 */

/**
 * A widget planned: its functions, the constants they use, and the planned forms of its entries
 * @typedef {Readonly<{
 *   widget: Widget,
 *   fns: readonly Fn[],
 *   constants: readonly Constant[],
 *   planned: ReadonlyMap<Fn, Fn>,
 *   infos: ReadonlyMap<Fn, Info>,
 * }>} Plan
 */

/**
 * Plans every function a widget's entries reach
 * @param {Widget} widget - The widget
 * @param {ts.TypeChecker} checker - The checker
 * @returns {Plan} The plan
 */
function plan(widget, checker) {
  let ids = 1_000_000
  /** @type {Constant[]} */
  const made = []
  const resultSymbol = checker.getReturnTypeOfSignature(widget.step.type).aliasSymbol
  /**
   * @param {ts.Type} type - A type
   * @returns {boolean} Whether it is a step's result
   */
  const isResult = (type) => resultSymbol !== undefined && type.aliasSymbol === resultSymbol
  /**
   * @param {ts.Type} type - A type
   * @returns {boolean} Whether it is a step's result or `null`
   */
  const isResultOrNull = (type) =>
    type.isUnion() &&
    type.types.some((member) => isResult(member)) &&
    type.types.every((member) => isResult(member) || (member.flags & ts.TypeFlags.Null) !== 0)
  /**
   * A new local
   * @param {string} name - Its name
   * @param {ts.Type} type - Its type
   * @returns {Binding} The local
   */
  const fresh = (name, type) => {
    ids += 1
    return { id: ids, mutable: false, name, type }
  }
  const context = {
    booleanType: checker.getBooleanType(),
    constant: (/** @type {string} */ name, /** @type {Expr} */ value, /** @type {string} */ module) => {
      ids += 1
      /** @type {Constant} */
      const constant = { at: value.at, id: ids, module, name, value }
      made.push(constant)
      return constant
    },
    fresh,
    isResult,
    isResultOrNull,
    nullType: checker.getNullType(),
    resultKind: (/** @type {Fn} */ fn) => resultKind(fn),
  }

  const resultEntries = new Set([
    widget.init,
    widget.step,
    ...(widget.composite?.handlers.map((handler) => handler.fn) ?? []),
  ])
  /**
   * Whether a function returns a step's result (an entry always does), one or `null`, or neither
   * @param {Fn} fn - The function
   * @returns {'result' | 'nullable' | null} Which
   */
  function resultKind(fn) {
    const returns = checker.getReturnTypeOfSignature(fn.type)
    if (isResultOrNull(returns)) {
      return 'nullable'
    }
    return resultEntries.has(fn) || isResult(returns) ? 'result' : null
  }
  const entries = [
    widget.init,
    widget.step,
    ...(widget.composite?.handlers.map((handler) => handler.fn) ?? []),
    ...(widget.composite?.props.map((props) => props.fn) ?? []),
  ]
  /** @type {Map<Fn, Fn>} */
  const normalized = new Map()
  for (const fn of postOrder(entries, (one) => one)) {
    normalized.set(fn, { ...fn, body: normalize(fn, context) })
  }
  const order = postOrder(entries, (one) => normalized.get(one) ?? one)
  /** @type {Map<Fn, Info>} */
  const infos = new Map()
  /** @type {Map<Fn, Fn>} */
  const planned = new Map()
  for (const fn of order) {
    const source = normalized.get(fn) ?? fn
    /** @type {Info} */
    const info = {
      consumes: consumedParams(source, infos, checker),
      keepsOnNull: true,
      nullable: resultKind(fn) === 'nullable',
      result: resultKind(fn) !== null,
      returnsOwned: true,
      returnsParam: true,
      writes: new Map(),
    }
    for (const index of info.consumes) {
      const param = source.params[index]
      if (param?.kind === 'bind') {
        info.writes.set(index, fieldsOf(checker, param.binding.type))
      }
    }
    infos.set(fn, info)
    planned.set(fn, rewrite(source, info, { checker, fresh, infos, isResult, isResultOrNull, normalized, resultKind }))
  }
  const constants = new Set()
  for (const fn of planned.values()) {
    for (const stmt of fn.body) {
      eachInStmt(stmt, (expr) => {
        if (expr.kind === 'constant') {
          constants.add(expr.constant)
        }
      })
    }
  }
  for (const stmt of widget.factory?.locals ?? []) {
    eachInStmt(stmt, (expr) => {
      if (expr.kind === 'constant') {
        constants.add(expr.constant)
      }
    })
  }
  return { constants: [...constants], fns: order.map((fn) => planned.get(fn) ?? fn), infos, planned, widget }
}

/**
 * The functions reachable from some, each after every function it calls
 * @param {readonly Fn[]} entries - Where to start
 * @param {(fn: Fn) => Fn} bodyOf - The form of a function whose body is walked
 * @returns {Fn[]} The functions
 */
function postOrder(entries, bodyOf) {
  /** @type {Fn[]} */
  const order = []
  /** @type {Set<Fn>} */
  const seen = new Set()
  const visit = (/** @type {Fn} */ fn) => {
    if (seen.has(fn)) {
      return
    }
    seen.add(fn)
    for (const stmt of bodyOf(fn).body) {
      eachInStmt(stmt, (expr) => {
        if (expr.kind === 'call' || expr.kind === 'function') {
          visit(expr.fn)
        }
      })
    }
    order.push(fn)
  }
  for (const fn of entries) {
    visit(fn)
  }
  return order
}

/**
 * The parameters a function may change in place: those a spread or a consuming call in it starts from
 * @param {Fn} fn - The function, normalized
 * @param {ReadonlyMap<Fn, Info>} infos - Its callees' infos
 * @param {ts.TypeChecker} checker - The checker
 * @returns {Set<number>} The parameters' indices
 */
function consumedParams(fn, infos, checker) {
  /** @type {Map<Binding, Set<number>>} */
  const origins = new Map()
  fn.params.forEach((param, index) => {
    if (param.kind === 'bind' && isRecordType(checker, param.binding.type)) {
      origins.set(param.binding, new Set([index]))
    }
  })
  /** @type {Set<number>} */
  const consumed = new Set()
  /**
   * The parameters an expression's value may be, changed in place
   * @param {Expr} expr - The expression
   * @returns {Set<number>} Their indices
   */
  const originOf = (expr) => {
    /** @type {Set<number>} */
    const all = new Set()
    if (expr.kind === 'local') {
      return origins.get(expr.binding) ?? all
    }
    if (expr.kind === 'record') {
      for (const entry of expr.entries) {
        if (entry.kind === 'spread') {
          for (const index of originOf(entry.value)) {
            all.add(index)
          }
        }
      }
    } else if (expr.kind === 'call') {
      for (const index of infos.get(expr.fn)?.consumes ?? []) {
        const arg = expr.args[index]
        for (const origin of arg === undefined ? [] : originOf(arg)) {
          all.add(origin)
        }
      }
    } else if (expr.kind === 'conditional') {
      return new Set([...originOf(expr.whenTrue), ...originOf(expr.whenFalse)])
    } else if (expr.kind === 'array') {
      const [first] = expr.items
      return first === undefined || first.spread ? all : originOf(first.value)
    }
    return all
  }
  const visit = (/** @type {readonly Stmt[]} */ stmts) => {
    for (const stmt of stmts) {
      eachInStmt(stmt, (expr) => {
        if (expr.kind === 'record' && expr.entries.some((entry) => entry.kind === 'spread')) {
          for (const index of originOf(expr)) {
            consumed.add(index)
          }
        }
        if (expr.kind === 'call') {
          for (const index of originOf(expr)) {
            consumed.add(index)
          }
        }
      })
      if (stmt.kind === 'const') {
        const origin = originOf(stmt.value)
        const [first] = bindingsOf(stmt.pattern)
        if (first !== undefined && origin.size > 0) {
          origins.set(first, origin)
        }
      }
      for (const block of blocksOf(stmt)) {
        visit(block)
      }
    }
  }
  visit(fn.body)
  return consumed
}

/**
 * Whether a type is a record: an object that is not an array, a tuple or a function
 * @param {ts.TypeChecker} checker - The checker
 * @param {ts.Type} type - The type
 * @returns {boolean} Whether it is
 */
function isRecordType(checker, type) {
  const target = substituted(checker, type)
  const members = (target.isUnion() ? target.types : [target]).filter(
    (member) => (member.flags & (ts.TypeFlags.Null | ts.TypeFlags.Undefined)) === 0,
  )
  return members.length > 0 && members.every((member) => isRecordMember(checker, member))
}

/**
 * Whether a type that is not a union is a record
 * @param {ts.TypeChecker} checker - The checker
 * @param {ts.Type} type - The type
 * @returns {boolean} Whether it is
 */
function isRecordMember(checker, type) {
  if (type.isIntersection()) {
    return type.types.every((part) => isRecordMember(checker, part))
  }
  if ((type.flags & ts.TypeFlags.TypeParameter) !== 0) {
    const constraint = checker.getBaseConstraintOfType(type)
    return constraint !== undefined && constraint !== type && isRecordType(checker, constraint)
  }
  return (
    (type.flags & ts.TypeFlags.Object) !== 0 &&
    !checker.isArrayType(type) &&
    !checker.isTupleType(type) &&
    type.getCallSignatures().length === 0
  )
}

/**
 * A type with `NoInfer` taken off
 * @param {ts.TypeChecker} checker - The checker
 * @param {ts.Type} type - The type
 * @returns {ts.Type} The type it stands for
 */
function substituted(checker, type) {
  return (type.flags & ts.TypeFlags.Substitution) === 0 ? type : (checker.getBaseConstraintOfType(type) ?? type)
}

/**
 * What rewriting a function needs
 * @typedef {Readonly<{
 *   checker: ts.TypeChecker,
 *   fresh: (name: string, type: ts.Type) => Binding,
 *   infos: ReadonlyMap<Fn, Info>,
 *   normalized: ReadonlyMap<Fn, Fn>,
 *   isResult: (type: ts.Type) => boolean,
 *   isResultOrNull: (type: ts.Type) => boolean,
 *   resultKind: (fn: Fn) => 'result' | 'nullable' | null,
 * }>} Tools
 */

/**
 * Rewrites a function into its in-place form
 * @param {Fn} fn - The function, normalized
 * @param {Info} info - Its info, `returnsParam`, `returnsOwned` and `keepsOnNull` filled in here
 * @param {Tools} tools - What rewriting needs
 * @returns {Fn} The function, planned
 */
function rewrite(fn, info, tools) {
  const { checker, fresh, infos } = tools
  const out = info.result ? fresh('out', checker.getAnyType()) : null
  /** @type {Map<Binding, number>} */
  const groups = new Map()
  /** @type {Set<number>} */
  const owned = new Set()
  /** @type {Map<Expr, Expr>} */
  const replaced = new Map()
  /** @type {Map<Expr, Map<string, Expr>>} */
  const patched = new Map()
  /** @type {Map<Binding, Segment>} */
  const segments = new Map()
  /** @type {Map<Binding, Binding>} */
  const resultStates = new Map()
  let groupIds = 0
  /** @type {Binding[]} */
  const params = []
  /** @type {Set<Binding>} */
  const defined = new Set()
  const [consumedGroup = null] = info.consumes

  /** @type {Pattern[]} */
  const paramPatterns = []
  fn.params.forEach((param, index) => {
    if (param.kind === 'tuple' && tools.isResult(param.type)) {
      throw new Error(`${fn.name}: a step's result as a parameter is only taken in tail position`)
    }
    paramPatterns.push(param)
    for (const binding of bindingsOf(param)) {
      params.push(binding)
      defined.add(binding)
    }
    if (param.kind === 'bind' && info.consumes.has(index)) {
      groupIds += 1
      groups.set(param.binding, groupIds)
      owned.add(groupIds)
    }
  })
  const stateGroup = consumedGroup === null ? null : (groups.get(paramBinding(fn, consumedGroup)) ?? null)
  const numberType = checker.getNumberType()
  const booleanType = checker.getBooleanType()

  /**
   * `out.length`
   * @param {ts.Node} at - Where
   * @returns {Expr} The buffer's length
   */
  const outLength = (at) => {
    if (out === null) {
      throw new Error(`${fn.name} has no effect buffer`)
    }
    return { at, kind: 'field', name: 'length', object: local(out, at), optional: false, type: numberType }
  }

  /**
   * The group a local is in, if it is a record the function may own
   * @param {Expr} expr - The expression
   * @returns {number | null} Its group
   */
  const groupOf = (expr) => {
    if (expr.kind === 'local') {
      return groups.get(expr.binding) ?? null
    }
    if (expr.kind === 'conditional') {
      const then = groupOf(expr.whenTrue)
      return then !== null && then === groupOf(expr.whenFalse) ? then : null
    }
    return null
  }

  /**
   * Joins a local to a group
   * @param {Binding} binding - The local
   * @param {number | null} group - The group, or `null` for a new one
   * @param {boolean} isOwned - Whether a new group is owned
   * @returns {void}
   */
  const join = (binding, group, isOwned) => {
    if (group !== null) {
      groups.set(binding, group)
      return
    }
    groupIds += 1
    groups.set(binding, groupIds)
    if (isOwned) {
      owned.add(groupIds)
    }
  }

  /**
   * Every read of a group's locals in some statements
   * @param {readonly Stmt[]} stmts - The statements
   * @param {ReadonlySet<Binding>} stale - The locals
   * @returns {Expr[]} The reads
   */
  const readsIn = (stmts, stale) => {
    /** @type {Expr[]} */
    const found = []
    for (const stmt of stmts) {
      eachInStmt(stmt, (expr) => {
        if (expr.kind === 'local' && stale.has(expr.binding) && !replaced.has(expr)) {
          found.push(expr)
        }
      })
    }
    return found
  }

  /** @type {Map<Expr, Readonly<{ parent: Expr, entry: number }>>} */
  const parents = new Map()
  for (const stmt of fn.body) {
    eachInStmt(stmt, (expr) => {
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
  }

  /**
   * Whether an expression only reads: no spread, no call that changes or appends
   * @param {Expr} expr - The expression
   * @returns {boolean} Whether it only reads
   */
  const onlyReads = (expr) => {
    let reads = true
    eachExpr(expr, (one) => {
      if (one.kind === 'record' && one.entries.some((entry) => entry.kind === 'spread')) {
        reads = false
      }
      if (one.kind === 'call') {
        const callee = infos.get(one.fn)
        if (callee === undefined || callee.result || callee.consumes.size > 0) {
          reads = false
        }
      }
    })
    return reads
  }

  /**
   * Plans the reads of stale locals after a change: each is fine (it reads a field the change leaves), moved before
   * the statement, or not possible
   * @param {readonly Expr[]} reads - The reads after the change
   * @param {ReadonlySet<string>} writes - The fields the change may write
   * @param {ReadonlySet<Binding>} before - The locals defined before the statement
   * @returns {Readonly<{ hoists: readonly Expr[], patches: readonly Readonly<{ spread: Expr, field: string }>[] }> | null}
   *   The reads to move, or `null` if one can't be
   */
  const planReads = (reads, writes, before) => {
    /** @type {Expr[]} */
    const hoists = []
    /** @type {{ spread: Expr, field: string }[]} */
    const patches = []
    for (const read of reads) {
      const up = parents.get(read)
      const parent = up?.parent
      if (parent?.kind === 'field' && parent.object === read && !parent.optional) {
        if (writes.has(parent.name) || read.kind !== 'local') {
          hoists.push(parent)
        }
        continue
      }
      if (parent?.kind === 'record' && up !== undefined && parent.entries[up.entry]?.kind === 'spread') {
        const later = new Set(
          parent.entries
            .slice(up.entry + 1)
            .flatMap((entry) => (entry.kind === 'field' ? [entry.name] : fieldsOf(checker, entry.value.type))),
        )
        for (const field of fieldsOf(checker, read.type)) {
          if (writes.has(field) && !later.has(field)) {
            patches.push({ field, spread: read })
          }
        }
        continue
      }
      if (parent?.kind === 'call' && onlyReads(parent)) {
        const free = freeOf(parent)
        if (free !== null && [...free].every((binding) => before.has(binding))) {
          hoists.push(parent)
          continue
        }
      }
      return null
    }
    return { hoists, patches }
  }

  /**
   * Checks a change of a group at a point and plans the reads after it
   * @param {number} group - The group changed
   * @param {Expr} site - The expression that changes it
   * @param {Stmt} stmt - The statement it is in
   * @param {readonly Stmt[]} rest - The statements after it in its block
   * @param {readonly Stmt[]} cont - What may run after the block
   * @param {ReadonlySet<string>} writes - The fields it may write
   * @param {Binding | null} nullGuard - A local that, `null`, means nothing was changed (and the reads after `if
   *   (local !== null) return local` see the record as it was)
   * @returns {Stmt[] | null} The statements to put before `stmt` (moved reads), or `null` if it can't be changed
   */
  const claim = (group, site, stmt, rest, cont, writes, nullGuard) => {
    if (!owned.has(group)) {
      return null
    }
    /** @type {Set<Binding>} */
    const stale = new Set()
    for (const [binding, one] of groups) {
      if (one === group) {
        stale.add(binding)
      }
    }
    const order = evaluationOrder(stmt)
    const at = order.indexOf(site)
    /** @type {Set<Expr>} */
    const otherBranch = new Set()
    for (let node = site, up = parents.get(site); up !== undefined; node = up.parent, up = parents.get(up.parent)) {
      const { parent } = up
      if (parent.kind === 'conditional' && (node === parent.whenTrue || node === parent.whenFalse)) {
        eachExpr(node === parent.whenTrue ? parent.whenFalse : parent.whenTrue, (one) => {
          otherBranch.add(one)
        })
      }
    }
    const inStmt = order
      .slice(at + 1)
      .filter(
        (expr) => expr.kind === 'local' && stale.has(expr.binding) && !replaced.has(expr) && !otherBranch.has(expr),
      )
    let after = rest
    const [guard] = rest
    if (
      nullGuard !== null &&
      guard?.kind === 'if' &&
      guard.test.kind === 'binary' &&
      guard.test.op === '!==' &&
      guard.test.left.kind === 'local' &&
      guard.test.left.binding === nullGuard
    ) {
      after = []
    }
    const runsOn = completes([stmt])
    if (runsOn && completes(after) && readsIn(cont, stale).length > 0) {
      return null
    }
    const reads = [...inStmt, ...(runsOn ? readsIn(after, stale) : [])]
    if (blocksOf(stmt).length > 0) {
      reads.push(...readsIn(blocksOf(stmt).flat(), stale))
    }
    const planned = planReads(reads, writes, defined)
    if (planned === null) {
      return null
    }
    /** @type {Stmt[]} */
    const hoisted = []
    /** @type {Map<string, Expr>} */
    const temps = new Map()
    for (const expr of planned.hoists) {
      const key = JSON.stringify(shape(expr))
      let temp = temps.get(key)
      if (temp === undefined) {
        const binding = fresh(nameFor(expr), expr.type)
        hoisted.push({ at: expr.at, kind: 'const', pattern: { binding, kind: 'bind' }, value: expr })
        defined.add(binding)
        temp = local(binding, expr.at)
        temps.set(key, temp)
      }
      replaced.set(expr, temp)
    }
    for (const { field, spread } of planned.patches) {
      /** @type {Expr} */
      const read = {
        at: spread.at,
        kind: 'field',
        name: field,
        object: spread,
        optional: false,
        type: fieldType(spread.type, field),
      }
      const key = JSON.stringify(shape(read))
      let temp = temps.get(key)
      if (temp === undefined) {
        const binding = fresh(nameFor(read), read.type)
        hoisted.push({ at: spread.at, kind: 'const', pattern: { binding, kind: 'bind' }, value: read })
        defined.add(binding)
        temp = local(binding, spread.at)
        temps.set(key, temp)
      }
      /** @type {Map<string, Expr>} */
      const none = new Map()
      const fields = patched.get(spread) ?? none
      fields.set(field, temp)
      patched.set(spread, fields)
    }
    return hoisted
  }

  /**
   * The type of a field of a record type
   * @param {ts.Type} type - The record type
   * @param {string} name - The field
   * @returns {ts.Type} Its type
   */
  const fieldType = (type, name) => {
    const field = checker.getPropertyOfType(checker.getApparentType(type), name)
    return field === undefined ? checker.getAnyType() : checker.getTypeOfSymbol(field)
  }

  /** @type {Stmt[]} */
  let pending = []
  /** @type {Map<Binding, Binding>} */
  const aliases = new Map()
  /** @type {Map<Binding, Binding>} */
  const renamedLocals = new Map()

  /**
   * The local a local surely holds the same record as, first bound
   * @param {Binding} binding - The local
   * @returns {Binding} The first
   */
  const rootOf = (binding) => {
    let root = binding
    for (let next = aliases.get(root); next !== undefined && next !== root; next = aliases.get(root)) {
      root = next
    }
    return root
  }
  /** @type {Set<Binding>} */
  const guarded = new Set()
  /** @type {Map<Binding, Binding>} */
  const segmentAliases = new Map()
  /** @type {Map<Binding, Binding>} */
  const sourceAliases = new Map()

  /**
   * The local a call's effects were first bound to
   * @param {Binding} binding - A local bound to them
   * @returns {Binding} The first
   */
  const canonical = (binding) => segmentAliases.get(binding) ?? binding

  /**
   * The step result an `if (result !== null) return result` guards, past which its call changed nothing
   * @param {Stmt | undefined} stmt - The statement
   * @returns {Binding | null} The result's local, if it is such a guard
   */
  const isNullGuard = (stmt) => {
    if (
      stmt?.kind === 'if' &&
      stmt.test.kind === 'binary' &&
      stmt.test.op === '!==' &&
      stmt.test.left.kind === 'local' &&
      stmt.test.right.kind === 'literal' &&
      stmt.test.right.value === null &&
      guarded.has(stmt.test.left.binding)
    ) {
      return stmt.test.left.binding
    }
    return null
  }

  /**
   * Rewrites a block
   * @param {readonly Stmt[]} stmts - The block
   * @param {readonly Stmt[]} cont - What may run after it
   * @param {readonly Binding[]} emitted - The calls whose effects are in `out` so far on this path, in order
   * @param {boolean} changedOnPath - Whether the consumed parameter was changed on this path
   * @returns {Stmt[]} The block
   */
  const block = (stmts, cont, emitted, changedOnPath) => {
    /** @type {Stmt[]} */
    const result = []
    let path = [...emitted]
    let changed = changedOnPath
    stmts.forEach((stmt, index) => {
      const rest = stmts.slice(index + 1)
      const after = completes(rest) ? [...rest, ...cont] : rest
      const outer = pending
      pending = []
      const state = { changed, path }
      const rewritten = statement(stmt, rest, after, cont, state)
      result.push(...pending, ...rewritten)
      pending = outer
      path = isNullGuard(stmt) === null ? state.path : state.path.filter((one) => one !== isNullGuard(stmt))
      changed = state.changed
      for (const one of stmt.kind === 'const' ? bindingsOf(stmt.pattern) : stmt.kind === 'let' ? [stmt.binding] : []) {
        defined.add(one)
      }
    })
    return result
  }

  /**
   * Rewrites a statement; moved reads and appends before it go to `pending`
   * @param {Stmt} stmt - The statement
   * @param {readonly Stmt[]} rest - The statements after it in its block
   * @param {readonly Stmt[]} after - What may run after it
   * @param {readonly Stmt[]} cont - What may run after its block
   * @param {{ path: Binding[], changed: boolean }} state - The path so far, updated
   * @returns {Stmt[]} The statements
   */
  const statement = (stmt, rest, after, cont, state) => {
    const scope = { cont, rest, stmt }
    switch (stmt.kind) {
      case 'const': {
        if (isResultExpr(stmt.value)) {
          return resultBinding(stmt, rest, after, cont, state)
        }
        const [pre, value] = expr(stmt.value, scope, state)
        const [first] = bindingsOf(stmt.pattern)
        if (stmt.pattern.kind === 'bind' && first !== undefined) {
          bindValue(first, value, stmt.value)
          if (value.kind === 'local' && !value.binding.mutable && !first.mutable) {
            renamedLocals.set(first, value.binding)
            return pre
          }
        }
        return [...pre, { ...stmt, value }]
      }
      case 'let':
      case 'assign': {
        const [pre, value] = expr(stmt.value, scope, state)
        return [...pre, { ...stmt, value }]
      }
      case 'return': {
        return returning(stmt, scope, state)
      }
      case 'if': {
        const [pre, test] = expr(stmt.test, scope, state)
        const then = block(stmt.whenTrue, after, state.path, state.changed)
        const otherwise = block(stmt.whenFalse, after, state.path, state.changed)
        return [...pre, { ...stmt, test, whenFalse: otherwise, whenTrue: then }]
      }
      case 'switch': {
        const [pre, subject] = expr(stmt.subject, scope, state)
        return [
          ...pre,
          {
            ...stmt,
            cases: stmt.cases.map((one) => ({ ...one, body: block(one.body, after, state.path, state.changed) })),
            fallback: stmt.fallback === null ? null : block(stmt.fallback, after, state.path, state.changed),
            subject,
          },
        ]
      }
      case 'while': {
        const [pre, test] = expr(stmt.test, scope, state)
        if (pre.length > 0) {
          throw new Error(`${fn.name}: a loop's condition changes a record or makes effects`)
        }
        return [{ ...stmt, body: block(stmt.body, [...stmt.body, ...after], state.path, state.changed), test }]
      }
      case 'set':
      case 'emit':
      case 'insert':
      case 'scan': {
        return [stmt]
      }
      default: {
        throw new TypeError('Not a statement')
      }
    }
  }

  /**
   * Records what a new local holds: a record the function owns, or one changed in place
   * @param {Binding} binding - The local
   * @param {Expr} value - Its value, rewritten
   * @param {Expr} source - Its value in the source
   * @returns {void}
   */
  const bindValue = (binding, value, source) => {
    const group = groupOf(value)
    if (value.kind === 'local' && group !== null) {
      aliases.set(binding, rootOf(value.binding))
    }
    if (value.kind === 'call' && group === null) {
      const callee = infos.get(value.fn)
      const [index] = callee?.consumes ?? []
      const arg = index === undefined ? undefined : value.args[index]
      if (callee?.returnsParam === true && arg?.kind === 'local' && groupOf(arg) !== null) {
        aliases.set(binding, rootOf(arg.binding))
        join(binding, groupOf(arg), false)
        return
      }
    }
    if (group !== null) {
      join(binding, group, false)
      return
    }
    if (source.kind === 'record' && isRecordType(checker, binding.type)) {
      join(binding, null, true)
      return
    }
    if (source.kind === 'call' && isRecordType(checker, binding.type)) {
      const callee = infos.get(source.fn)
      const consumedArg = [...(callee?.consumes ?? [])].map((index) => source.args[index])
      const argGroup = consumedArg.length === 1 && consumedArg[0] !== undefined ? groupOf(consumedArg[0]) : null
      join(binding, argGroup, callee?.returnsOwned === true)
    }
  }

  /**
   * Whether an expression's value is a step's result
   * @param {Expr} value - The expression
   * @returns {boolean} Whether it is
   */
  const isResultExpr = (value) =>
    value.kind === 'call'
      ? tools.resultKind(value.fn) !== null
      : tools.isResult(value.type) || tools.isResultOrNull(value.type)

  /**
   * The pieces of a result's effects
   * @param {Expr} effects - The effects array
   * @returns {Piece[]} Its pieces
   */
  const piecesOf = (effects) => {
    if (effects.kind === 'local' && segments.has(effects.binding)) {
      return [{ binding: canonical(effects.binding), kind: 'segment' }]
    }
    if (effects.kind === 'array') {
      return effects.items.map((item) =>
        item.spread && item.value.kind === 'local' && segments.has(item.value.binding)
          ? segmentPiece(canonical(item.value.binding))
          : itemPiece(item),
      )
    }
    return [{ item: { spread: true, value: effects }, kind: 'item' }]
  }

  /**
   * The returns a call's continuation may reach, each with the results bound on its way
   * @param {readonly Stmt[]} stmts - The continuation
   * @param {readonly Binding[]} bound - Results bound so far on the way
   * @returns {Readonly<{ stmt: Stmt & { kind: 'return' }, bound: readonly Binding[] }>[] | null} The returns, or `null`
   *   if a result is bound on a way that can go on past a branch
   */
  const returnsFrom = (stmts, bound) => {
    /** @type {{ stmt: Stmt & { kind: 'return' }, bound: readonly Binding[] }[]} */
    const found = []
    const soFar = [...bound]
    for (const stmt of stmts) {
      if (stmt.kind === 'return') {
        found.push({ bound: [...soFar], stmt })
        return found
      }
      if (stmt.kind === 'const' && isResultExpr(stmt.value)) {
        const [first] = bindingsOf(stmt.pattern)
        const effects = stmt.pattern.kind === 'tuple' ? stmt.pattern.items[1] : stmt.pattern
        const binding = effects?.kind === 'bind' ? effects.binding : first
        if (stmt.value.kind === 'local' && binding !== undefined) {
          sourceAliases.set(binding, stmt.value.binding)
        } else if (binding !== undefined) {
          soFar.push(binding)
        }
      }
      for (const nested of blocksOf(stmt)) {
        const inner = returnsFrom(nested, soFar)
        if (inner === null) {
          return null
        }
        found.push(...inner)
        if (completes(nested) && nested.some((one) => one.kind === 'const' && isResultExpr(one.value))) {
          return null
        }
      }
    }
    return found
  }

  /**
   * Decides where a call's effects go: straight into `out`, with what the source puts before them appended first, or
   * an array of their own
   * @param {Binding} binding - The local the call's effects are bound to
   * @param {readonly Stmt[]} after - What may run after the call
   * @param {readonly Binding[]} emitted - The calls whose effects are in `out` so far on this path
   * @returns {Readonly<{ direct: true, before: readonly Item[] }> | Readonly<{ direct: false }>} Where
   */
  const placeEffects = (binding, after, emitted) => {
    if (out === null) {
      return { direct: false }
    }
    const reached = returnsFrom(after, [])
    if (reached === null || reached.length === 0) {
      return { direct: false }
    }
    /** @type {string | null} */
    let prefixKey = null
    /** @type {readonly Item[]} */
    let prefix = []
    for (const { bound, stmt } of reached) {
      const value = stmt.value
      if (value.kind === 'local' && (value.binding === binding || sourceAliases.get(value.binding) === binding)) {
        if (emitted.length > 0 || (prefixKey !== null && prefixKey !== '[]')) {
          return { direct: false }
        }
        prefixKey = '[]'
        continue
      }
      if (value.kind !== 'array' || value.items.length !== 2) {
        return { direct: false }
      }
      const effects = value.items[1]?.value
      if (effects === undefined) {
        return { direct: false }
      }
      const pieces = piecesOfSource(effects, binding, bound)
      const segs = pieces.flatMap((piece) => (piece.kind === 'segment' ? [piece.binding] : []))
      const expected = [...emitted, binding]
      const tail = segs.slice(expected.length)
      if (
        segs.length < expected.length ||
        expected.some((one, at) => segs[at] !== one) ||
        tail.some(
          (one, at) =>
            bound[bound.indexOf(one)] !== one || (at > 0 && bound.indexOf(one) < bound.indexOf(tail[at - 1] ?? one)),
        )
      ) {
        return { direct: false }
      }
      const position = pieces.findIndex((piece) => piece.kind === 'segment' && piece.binding === binding)
      let start = position
      while (start > 0 && pieces[start - 1]?.kind === 'item') {
        start -= 1
      }
      const before = pieces.slice(start, position).flatMap((piece) => (piece.kind === 'item' ? [piece.item] : []))
      if (before.some((item) => !availableBefore(item.value))) {
        return { direct: false }
      }
      const key = JSON.stringify(before.map((item) => [item.spread, shape(item.value)]))
      if (prefixKey !== null && prefixKey !== key) {
        return { direct: false }
      }
      prefixKey = key
      prefix = before
    }
    return { before: prefix, direct: true }
  }

  /**
   * The local a call's effects were bound to first, through the source's own rebindings
   * @param {Binding} one - A local
   * @returns {Binding} The first
   */
  const resolved = (one) => sourceAliases.get(one) ?? canonical(one)

  /**
   * The pieces of a source result's effects, its segments being the results bound on the way
   * @param {Expr} effects - The effects array, as in the source
   * @param {Binding} binding - The call being placed
   * @param {readonly Binding[]} bound - The results bound after it on the way
   * @returns {Piece[]} The pieces
   */
  const piecesOfSource = (effects, binding, bound) => {
    const isSegment = (/** @type {Expr} */ value) =>
      value.kind === 'local' &&
      (value.binding === binding ||
        bound.includes(value.binding) ||
        segments.has(value.binding) ||
        segmentAliases.has(value.binding) ||
        sourceAliases.has(value.binding))
    if (isSegment(effects) && effects.kind === 'local') {
      return [{ binding: resolved(effects.binding), kind: 'segment' }]
    }
    if (effects.kind === 'array') {
      return effects.items.map((item) =>
        item.spread && isSegment(item.value) && item.value.kind === 'local'
          ? { binding: resolved(item.value.binding), kind: 'segment' }
          : { item, kind: 'item' },
      )
    }
    return [{ item: { spread: true, value: effects }, kind: 'item' }]
  }

  /**
   * Whether an expression can be evaluated before the statement being rewritten: it reads only locals defined
   * already, and no effects
   * @param {Expr} value - The expression
   * @returns {boolean} Whether it can
   */
  const availableBefore = (value) => {
    const free = freeOf(value)
    return (
      free !== null && [...free].every((binding) => defined.has(binding) && !segments.has(binding)) && onlyReads(value)
    )
  }

  /**
   * Rewrites `const ... = call(...)` of a step's result
   * @param {Stmt & { kind: 'const' }} stmt - The statement
   * @param {readonly Stmt[]} rest - The statements after it in its block
   * @param {readonly Stmt[]} after - What may run after it
   * @param {readonly Stmt[]} cont - What may run after its block
   * @param {{ path: Binding[], changed: boolean }} state - The path so far
   * @returns {Stmt[]} The statements
   */
  const resultBinding = (stmt, rest, after, cont, state) => {
    const { pattern, value } = stmt
    const heldState = value.kind === 'local' ? resultStates.get(value.binding) : undefined
    if (value.kind === 'local' && heldState !== undefined && pattern.kind === 'tuple') {
      const [first, second] = pattern.items
      /** @type {Stmt[]} */
      const bound = []
      if (first?.kind === 'bind') {
        bound.push({ at: stmt.at, kind: 'const', pattern: first, value: local(heldState, stmt.at) })
        join(first.binding, groups.get(heldState) ?? null, false)
        defined.add(first.binding)
      }
      const segment = segments.get(value.binding)
      if (second?.kind === 'bind' && segment !== undefined) {
        segments.set(second.binding, segment)
        segmentAliases.set(second.binding, canonical(value.binding))
        defined.add(second.binding)
      }
      return bound
    }
    if (value.kind !== 'call') {
      throw new Error(`${fn.name}: a step's result is bound from something other than a call`)
    }
    if (pattern.kind === 'object') {
      throw new Error(`${fn.name}: a step's result is destructured by field`)
    }
    const [first, second] = pattern.kind === 'tuple' ? pattern.items : []
    const stateBinding =
      pattern.kind === 'bind'
        ? fresh(pattern.binding.name, stateTypeOf(value.type))
        : first?.kind === 'bind'
          ? first.binding
          : fresh('next', value.type)
    const effectsBinding = pattern.kind === 'bind' ? pattern.binding : second?.kind === 'bind' ? second.binding : null
    if (pattern.kind === 'bind') {
      resultStates.set(pattern.binding, stateBinding)
    }
    const effects = effectsBinding ?? fresh('dropped', value.type)
    const callee = infos.get(value.fn)
    if (pattern.kind === 'bind' && callee?.nullable === true && callee.keepsOnNull) {
      guarded.add(effects)
    }
    const [guard] = rest
    const placed = placeEffects(
      effects,
      guarded.has(effects) && isNullGuard(guard) === effects && guard?.kind === 'if' ? guard.whenTrue : after,
      state.path,
    )
    /** @type {Stmt[]} */
    const before = []
    /** @type {Expr} */
    let buffer
    if (placed.direct) {
      if (placed.before.length > 0) {
        before.push({ at: stmt.at, items: placed.before, kind: 'emit', out: outBinding() })
      }
      const read = usedAsArray(effects, rest)
      const mark = read ? fresh('mark', numberType) : null
      if (mark !== null) {
        before.push({ at: stmt.at, kind: 'const', pattern: { binding: mark, kind: 'bind' }, value: outLength(stmt.at) })
      }
      buffer = local(outBinding(), stmt.at)
      const end = read ? fresh('end', numberType) : null
      segments.set(effects, { direct: true, end, mark })
      state.path = [...state.path, effects]
    } else {
      const own = effectsBinding ?? fresh('dropped', effects.type)
      before.push({
        at: stmt.at,
        kind: 'const',
        pattern: { binding: own, kind: 'bind' },
        value: emptyArray(stmt.at, effects.type),
      })
      buffer = local(own, stmt.at)
      segments.set(effects, { direct: false, value: local(own, stmt.at) })
    }
    const nullGuard = pattern.kind === 'bind' ? effects : null
    const [pre, call] = callExpr(value, { cont, rest, stmt }, state, buffer, nullGuard)
    /** @type {Stmt[]} */
    const result = [
      ...before,
      ...pre,
      { at: stmt.at, kind: 'const', pattern: { binding: stateBinding, kind: 'bind' }, value: call },
    ]
    const segment = segments.get(effects)
    if (segment?.direct === true && segment.end !== null) {
      result.push({
        at: stmt.at,
        kind: 'const',
        pattern: { binding: segment.end, kind: 'bind' },
        value: outLength(stmt.at),
      })
    }
    bindValue(stateBinding, call, value)
    defined.add(stateBinding)
    defined.add(effects)
    return result
  }

  /**
   * The effect buffer
   * @returns {Binding} It
   */
  const outBinding = () => {
    if (out === null) {
      throw new Error(`${fn.name} has no effect buffer`)
    }
    return out
  }

  /**
   * The state type of a step's result type
   * @param {ts.Type} type - The result type (or it or `null`)
   * @returns {ts.Type} Its state's type
   */
  const stateTypeOf = (type) => {
    const members = type.isUnion() ? type.types : [type]
    const result = members.find((member) => tupleOf(checker, member) !== null)
    const [first] = result === undefined ? [] : (tupleOf(checker, result) ?? [])
    return first ?? type
  }

  /**
   * Whether a call's effects are read as an array, beyond being returned
   * @param {Binding} binding - The effects' local
   * @param {readonly Stmt[]} rest - The statements after the call
   * @returns {boolean} Whether they are
   */
  const usedAsArray = (binding, rest) => {
    /** @type {Expr[]} */
    const reads = []
    /**
     * @param {Expr} expr - An expression
     * @returns {void}
     */
    const visit = (expr) => {
      if (expr.kind === 'local' && expr.binding === binding) {
        const up = parents.get(expr)?.parent
        if (up?.kind === 'index' || up?.kind === 'method' || (up?.kind === 'field' && up.name === 'length')) {
          reads.push(expr)
        }
      }
    }
    for (const stmt of rest) {
      eachInStmt(stmt, visit)
    }
    return reads.length > 0
  }

  /**
   * Rewrites a call, handing over the records it consumes and the buffer it appends to
   * @param {Expr & { kind: 'call' }} call - The call
   * @param {Scope} scope - Where it is
   * @param {{ path: Binding[], changed: boolean }} state - The path so far
   * @param {Expr | null} buffer - The buffer its effects go to, if it returns a step's result
   * @param {Binding | null} nullGuard - The local its result goes to, when `null` from it means nothing changed
   * @returns {readonly [Stmt[], Expr]} What goes before, and the call
   */
  const callExpr = (call, scope, state, buffer, nullGuard) => {
    const callee = infos.get(call.fn)
    /** @type {Stmt[]} */
    const pre = []
    /** @type {Expr[]} */
    const args = []
    call.args.forEach((arg, index) => {
      const [argPre, value] = expr(arg, scope, state)
      if (argPre.length > 0) {
        materialize(args, pre)
      }
      pre.push(...argPre)
      if (callee?.consumes.has(index) === true) {
        const group = groupOf(value)
        const writes = new Set(callee.writes.get(index))
        const keeps = callee.keepsOnNull && callee.nullable ? nullGuard : null
        const moved = group === null ? null : claim(group, call, scope.stmt, scope.rest, scope.cont, writes, keeps)
        if (moved !== null) {
          pending.push(...moved)
          if (group === stateGroup) {
            state.changed = true
          }
          args.push(value)
        } else if (group === null && isFresh(value)) {
          args.push(value)
        } else {
          args.push(copyOf(value))
        }
        return
      }
      args.push(value)
    })
    if (buffer !== null) {
      args.push(buffer)
    }
    return [pre, { ...call, args, type: callee?.result === true ? stateTypeOf(call.type) : call.type }]
  }

  /**
   * Whether an expression's value is a record no one else holds: one just made
   * @param {Expr} value - The expression, rewritten
   * @returns {boolean} Whether it is
   */
  const isFresh = (value) => {
    if (value.kind === 'record') {
      return true
    }
    if (value.kind === 'call') {
      return infos.get(value.fn)?.returnsOwned === true
    }
    return false
  }

  /**
   * Moves the values of earlier arguments into locals, so what comes before a later one runs after them
   * @param {Expr[]} values - The values so far, replaced
   * @param {Stmt[]} pre - Where the locals go
   * @returns {void}
   */
  const materialize = (values, pre) => {
    values.forEach((value, at) => {
      if (
        value.kind === 'local' ||
        value.kind === 'literal' ||
        value.kind === 'constant' ||
        value.kind === 'function'
      ) {
        return
      }
      const binding = fresh('value', value.type)
      pre.push({ at: value.at, kind: 'const', pattern: { binding, kind: 'bind' }, value })
      defined.add(binding)
      values[at] = local(binding, value.at)
    })
  }

  /**
   * @typedef {Readonly<{ stmt: Stmt, rest: readonly Stmt[], cont: readonly Stmt[] }>} Scope
   */

  /**
   * Rewrites an expression: what must run before it (changes in place, appends, moved values), and its value
   * @param {Expr} value - The expression
   * @param {Scope} scope - The statement it is in
   * @param {{ path: Binding[], changed: boolean }} state - The path so far
   * @returns {readonly [Stmt[], Expr]} What goes before, and the value
   */
  const expr = (value, scope, state) => {
    const swapped = replaced.get(value)
    if (swapped !== undefined) {
      return [[], swapped]
    }
    switch (value.kind) {
      case 'local': {
        const renamed = renamedLocals.get(value.binding) ?? resultStates.get(value.binding)
        return [[], renamed === undefined ? value : { ...value, binding: renamed, type: renamed.type }]
      }
      case 'record': {
        return record(value, scope, state)
      }
      case 'call': {
        if (infos.get(value.fn)?.result === true) {
          throw new Error(`${fn.name}: a step's result is used where only a returned or bound one is taken`)
        }
        return callExpr(value, scope, state, null, null)
      }
      case 'field': {
        if (value.object.kind === 'local' && value.name === 'length' && segments.has(value.object.binding)) {
          const segment = segments.get(value.object.binding)
          if (segment?.direct === true && segment.mark !== null && segment.end !== null) {
            return [
              [],
              {
                at: value.at,
                kind: 'binary',
                left: local(segment.end, value.at),
                op: '-',
                right: local(segment.mark, value.at),
                type: numberType,
              },
            ]
          }
        }
        if (value.object.kind === 'local' && resultStates.has(value.object.binding)) {
          throw new Error(`${fn.name}: a field of a step's result`)
        }
        return children1(value, scope, state)
      }
      case 'index': {
        if (value.object.kind === 'local' && value.index.kind === 'literal' && resultStates.has(value.object.binding)) {
          const stateLocal = resultStates.get(value.object.binding)
          if (value.index.value === 0 && stateLocal !== undefined) {
            return [[], local(stateLocal, value.at)]
          }
          return [[], { ...value.object, type: value.type }]
        }
        return children1(value, scope, state)
      }
      case 'method': {
        const target = value.object
        const held =
          target.kind === 'index' &&
          target.object.kind === 'local' &&
          target.index.kind === 'literal' &&
          target.index.value === 1
            ? target.object.binding
            : target.kind === 'local'
              ? target.binding
              : null
        const segment = held === null ? undefined : segments.get(held)
        if (segment?.direct === true && value.name === 'some' && segment.mark !== null && segment.end !== null) {
          const [lambda] = value.args
          if (lambda?.kind !== 'lambda' || lambda.params[0]?.kind !== 'bind') {
            throw new Error(`${fn.name}: some() on effects takes a function of one effect`)
          }
          const [only] = lambda.body
          if (only?.kind !== 'return') {
            throw new Error(`${fn.name}: some() on effects takes a function returning a test`)
          }
          const found = { ...fresh('found', booleanType), mutable: true }
          const param = lambda.params[0].binding
          return [
            [
              {
                at: value.at,
                from: local(segment.mark, value.at),
                kind: 'scan',
                out: outBinding(),
                param,
                target: found,
                test: only.value,
                to: local(segment.end, value.at),
              },
            ],
            local(found, value.at),
          ]
        }
        return children1(value, scope, state)
      }
      case 'conditional': {
        const [testPre, test] = expr(value.test, scope, state)
        const [thenPre, then] = expr(value.whenTrue, scope, state)
        const [elsePre, otherwise] = expr(value.whenFalse, scope, state)
        if (thenPre.length === 0 && elsePre.length === 0) {
          return [testPre, { ...value, test, whenFalse: otherwise, whenTrue: then }]
        }
        if (then.kind === 'local' && otherwise.kind === 'local' && then.binding === otherwise.binding) {
          /** @type {Expr} */
          const negated = { at: test.at, kind: 'unary', op: '!', operand: test, type: test.type }
          /** @type {Stmt} */
          const branch =
            thenPre.length === 0
              ? { at: value.at, kind: 'if', whenFalse: [], test: negated, whenTrue: elsePre }
              : { at: value.at, kind: 'if', whenFalse: elsePre, test, whenTrue: thenPre }
          return [[...testPre, branch], then]
        }
        const temp = { ...fresh('chosen', value.type), mutable: true }
        const thenGroup = groupOf(then)
        if (thenGroup !== null && thenGroup === groupOf(otherwise)) {
          join(temp, thenGroup, false)
        }
        return [
          [
            ...testPre,
            { at: value.at, binding: temp, kind: 'let', value: { at: value.at, kind: 'undefined', type: value.type } },
            {
              at: value.at,
              kind: 'if',
              whenFalse: [...elsePre, { at: value.at, binding: temp, kind: 'assign', value: otherwise }],
              test,
              whenTrue: [...thenPre, { at: value.at, binding: temp, kind: 'assign', value: then }],
            },
          ],
          local(temp, value.at),
        ]
      }
      case 'logical': {
        const [leftPre, left] = expr(value.left, scope, state)
        const [rightPre, right] = expr(value.right, scope, state)
        if (rightPre.length > 0) {
          throw new Error(`${fn.name}: the right side of ${value.op} changes a record or makes effects`)
        }
        return [leftPre, { ...value, left, right }]
      }
      case 'lambda': {
        return [[], value]
      }
      case 'literal':
      case 'undefined':
      case 'constant':
      case 'function':
      case 'regex':
      case 'array':
      case 'builtin':
      case 'unary':
      case 'binary':
      case 'has':
      case 'template': {
        return children1(value, scope, state)
      }
      default: {
        throw new TypeError('Not an expression')
      }
    }
  }

  /**
   * Rewrites an expression's children, left to right
   * @param {Expr} value - The expression
   * @param {Scope} scope - The statement it is in
   * @param {{ path: Binding[], changed: boolean }} state - The path so far
   * @returns {readonly [Stmt[], Expr]} What goes before, and the expression
   */
  const children1 = (value, scope, state) => {
    /** @type {Stmt[]} */
    const pre = []
    /** @type {Expr[]} */
    const done = []
    /** @type {Map<Expr, number>} */
    const position = new Map()
    for (const child of children(value)) {
      const [childPre, rewritten] = expr(child, scope, state)
      if (childPre.length > 0) {
        materialize(done, pre)
      }
      pre.push(...childPre)
      position.set(child, done.length)
      done.push(rewritten)
    }
    const rebuilt = mapChildren(value, (child) => done[position.get(child) ?? -1] ?? child)
    return [pre, rebuilt]
  }

  /**
   * Rewrites a record literal: in place on a spread it owns and no one reads afterwards, else made anew
   * @param {Expr & { kind: 'record' }} value - The literal
   * @param {Scope} scope - The statement it is in
   * @param {{ path: Binding[], changed: boolean }} state - The path so far
   * @returns {readonly [Stmt[], Expr]} What goes before, and the record
   */
  const record = (value, scope, state) => {
    /** @type {Stmt[]} */
    const pre = []
    /** @type {Entry[]} */
    const entries = []
    for (const entry of value.entries) {
      const [entryPre, rewritten] = expr(entry.value, scope, state)
      if (entryPre.length > 0) {
        materialize(
          entries.map((one) => one.value),
          pre,
        )
      }
      pre.push(...entryPre)
      entries.push({ ...entry, value: rewritten })
      const patch = patched.get(entry.value)
      if (entry.kind === 'spread' && patch !== undefined) {
        for (const [name, temp] of patch) {
          entries.push({ kind: 'field', name, value: temp })
        }
      }
    }
    const targetAt = entries.findIndex((entry) => entry.kind === 'spread' && groupOf(entry.value) !== null)
    const target = entries[targetAt]
    if (target?.value.kind !== 'local') {
      return [pre, { ...value, entries }]
    }
    const targetBinding = target.value.binding
    const group = groupOf(target.value) ?? -1
    /** @type {Map<string, Expr>} */
    const sets = new Map()
    for (const [index, entry] of entries.entries()) {
      if (index === targetAt) {
        continue
      }
      if (entry.kind === 'field') {
        sets.set(entry.name, entry.value)
        continue
      }
      const sameGroup = groupOf(entry.value) === group
      if ((index < targetAt || !isLiteralRecord(entry.value)) && !sameGroup) {
        return [pre, { ...value, entries }]
      }
      if (sameGroup && mustAlias(entry.value, targetBinding)) {
        continue
      }
      for (const name of fieldsOf(checker, entry.value.type)) {
        const type = fieldType(entry.value.type, name)
        sets.set(name, { at: entry.value.at, kind: 'field', name, object: entry.value, optional: false, type })
      }
    }
    for (const [name, set] of sets) {
      if (
        set.kind === 'field' &&
        set.name === name &&
        set.object.kind === 'local' &&
        set.object.binding === targetBinding
      ) {
        sets.delete(name)
      }
    }
    const moved = claim(group, value, scope.stmt, scope.rest, scope.cont, new Set(sets.keys()), null)
    if (moved === null) {
      return [pre, { ...value, entries }]
    }
    pending.push(...moved)
    if (group === stateGroup) {
      state.changed = true
    }
    /** @type {Stmt[]} */
    const assigned = []
    /** @type {Set<string>} */
    const written = new Set()
    for (const [name, set] of sets) {
      let setValue = set
      if (readsFieldsOf(set, group, written)) {
        const binding = fresh(name, set.type)
        pre.push({ at: set.at, kind: 'const', pattern: { binding, kind: 'bind' }, value: set })
        setValue = local(binding, set.at)
      }
      assigned.push({ at: value.at, kind: 'set', name, object: targetBinding, value: setValue })
      written.add(name)
    }
    return [[...pre, ...assigned], { ...target.value, type: value.type }]
  }

  /**
   * Whether a spread's local is surely the same record as the target
   * @param {Expr} spread - The spread's value
   * @param {Binding} target - The target
   * @returns {boolean} Whether it is
   */
  const mustAlias = (spread, target) => spread.kind === 'local' && rootOf(spread.binding) === rootOf(target)

  /**
   * Whether a value reads fields of a group already written
   * @param {Expr} value - The value
   * @param {number} group - The group
   * @param {ReadonlySet<string>} written - The fields written so far
   * @returns {boolean} Whether it does
   */
  const readsFieldsOf = (value, group, written) => {
    let reads = false
    eachExpr(value, (one) => {
      if (one.kind === 'field' && groupOf(one.object) === group && written.has(one.name)) {
        reads = true
      }
      if (one.kind === 'call' && one.args.some((arg) => groupOf(arg) === group) && written.size > 0) {
        reads = true
      }
    })
    return reads
  }

  /**
   * Rewrites a `return`
   * @param {Stmt & { kind: 'return' }} stmt - The statement
   * @param {Scope} scope - Where it is
   * @param {{ path: Binding[], changed: boolean }} state - The path so far
   * @returns {Stmt[]} The statements
   */
  const returning = (stmt, scope, state) => {
    const { value } = stmt
    if (!info.result) {
      const [pre, rewritten] = expr(value, scope, state)
      noteReturn(rewritten, value)
      return [...pre, { ...stmt, value: rewritten }]
    }
    if (value.kind === 'literal' && value.value === null) {
      if (state.changed || state.path.length > 0) {
        info.keepsOnNull = false
      }
      return [stmt]
    }
    if (value.kind === 'local' && resultStates.has(value.binding)) {
      const stateLocal = resultStates.get(value.binding)
      if (stateLocal === undefined) {
        throw new Error('unreachable')
      }
      const segment = segments.get(value.binding)
      noteReturn(local(stateLocal, stmt.at), value)
      if (segment?.direct === false) {
        checkLayout([], state.path)
        return [
          { at: stmt.at, items: [{ spread: true, value: segment.value }], kind: 'emit', out: outBinding() },
          { ...stmt, value: local(stateLocal, stmt.at) },
        ]
      }
      checkLayout([{ binding: canonical(value.binding), kind: 'segment' }], state.path)
      return [{ ...stmt, value: local(stateLocal, stmt.at) }]
    }
    if (value.kind === 'call') {
      if (state.path.length > 0) {
        throw new Error(`${fn.name}: a tail call after effects kept in the buffer`)
      }
      const [pre, call] = callExpr(value, scope, state, local(outBinding(), stmt.at), null)
      const callee = infos.get(value.fn)
      noteReturn(call, value)
      if (callee !== undefined && !callee.returnsOwned) {
        info.returnsOwned = false
      }
      return [...pre, { ...stmt, value: call }]
    }
    if (value.kind !== 'array' || value.items.length !== 2) {
      throw new Error(`${fn.name}: a returned step result that is not [state, effects]`)
    }
    const [stateItem, effectsItem] = value.items
    if (stateItem === undefined || effectsItem === undefined || stateItem.spread || effectsItem.spread) {
      throw new Error(`${fn.name}: a returned step result that is not [state, effects]`)
    }
    const [statePre, stateValue] = expr(stateItem.value, scope, state)
    const [effectsPre, effects] = expr(effectsItem.value, scope, state)
    /** @type {Stmt[]} */
    const result = [...statePre]
    let returned = stateValue
    if (effectsPre.length > 0 && !isStable(stateValue)) {
      const binding = fresh('next', stateValue.type)
      result.push({ at: stmt.at, kind: 'const', pattern: { binding, kind: 'bind' }, value: stateValue })
      returned = local(binding, stmt.at)
    }
    result.push(...effectsPre)
    const pieces = piecesOf(effects).map((piece) => {
      if (piece.kind === 'segment') {
        const segment = segments.get(piece.binding)
        if (segment?.direct === false) {
          return itemPiece({ spread: true, value: segment.value })
        }
      }
      return piece
    })
    const trailing = checkLayout(pieces, state.path)
    if (trailing.length > 0) {
      result.push({ at: stmt.at, items: trailing, kind: 'emit', out: outBinding() })
    }
    noteReturn(returned, stateItem.value)
    result.push({ ...stmt, value: returned })
    return result
  }

  /**
   * Checks that a return's effects put the buffer's segments in the order they are in, and gives what comes after
   * the last segment (what comes before was appended before the calls)
   * @param {readonly Piece[]} pieces - The return's pieces
   * @param {readonly Binding[]} path - The segments in the buffer on this path
   * @returns {Item[]} The items to append now
   */
  const checkLayout = (pieces, path) => {
    const segs = pieces.flatMap((piece) => (piece.kind === 'segment' ? [piece.binding] : []))
    if (segs.length !== path.length || segs.some((one, at) => path[at] !== one)) {
      throw new Error(
        `${fn.name}: effects returned out of the order they were made in: [${segs.map((one) => one.name).join(', ')}] after [${path.map((one) => one.name).join(', ')}]`,
      )
    }
    const last = pieces.findLastIndex((piece) => piece.kind === 'segment')
    return pieces.slice(last + 1).flatMap((piece) => (piece.kind === 'item' ? [piece.item] : []))
  }

  /**
   * Notes what a return gives, for the function's callers
   * @param {Expr} rewritten - The value returned, rewritten
   * @param {Expr} source - The value in the source
   * @returns {void}
   */
  const noteReturn = (rewritten, source) => {
    const group = groupOf(rewritten)
    if (group === null || group !== stateGroup) {
      info.returnsParam = false
    }
    const ownedValue = (group !== null && owned.has(group)) || isFresh(rewritten) || source.kind === 'record'
    if (!ownedValue) {
      info.returnsOwned = false
    }
  }

  const body = block(fn.body, [], [], false)
  if (stateGroup === null) {
    info.returnsParam = false
  }
  /** @type {Pattern[]} */
  const finalParams = paramPatterns
  return {
    ...fn,
    body,
    out,
    params: finalParams,
    state: info.result ? stateTypeOf(checker.getReturnTypeOfSignature(fn.type)) : null,
  }
}

/**
 * The effects a returned result puts in order: a call's, where they already are in the buffer, or an item of the
 * source's array
 * @typedef {Readonly<{ kind: 'segment', binding: Binding }> | Readonly<{ kind: 'item', item: Item }>} Piece
 */

/**
 * @param {Binding} binding - The call's effects' local
 * @returns {Piece} The piece
 */
function segmentPiece(binding) {
  return { binding, kind: 'segment' }
}

/**
 * @param {Item} item - The item
 * @returns {Piece} The piece
 */
function itemPiece(item) {
  return { item, kind: 'item' }
}

/**
 * The binding of a function's parameter
 * @param {Fn} fn - The function
 * @param {number} index - The parameter
 * @returns {Binding} Its binding
 */
function paramBinding(fn, index) {
  const param = fn.params[index]
  if (param?.kind !== 'bind') {
    throw new Error(`${fn.name}'s parameter ${String(index)} is a pattern`)
  }
  return param.binding
}

/**
 * Whether an expression is a record literal with only its own fields: a record with no fields beyond its type's
 * @param {Expr} value - The expression
 * @returns {boolean} Whether it is
 */
function isLiteralRecord(value) {
  return value.kind === 'record' && value.entries.every((entry) => entry.kind === 'field')
}

/**
 * Whether an expression's value can't change before it is used: a literal, a local or a constant
 * @param {Expr} value - The expression
 * @returns {boolean} Whether it can't
 */
function isStable(value) {
  return value.kind === 'local' || value.kind === 'literal' || value.kind === 'constant'
}

/**
 * An expression's shape, for telling equal expressions apart from others
 * @param {Expr} expr - The expression
 * @returns {unknown} Its shape, as JSON-able data
 */
function shape(expr) {
  if (expr.kind === 'local') {
    return ['local', expr.binding.id]
  }
  if (expr.kind === 'literal') {
    return ['literal', expr.value]
  }
  if (expr.kind === 'constant') {
    return ['constant', expr.constant.id]
  }
  if (expr.kind === 'field') {
    return ['field', expr.name, shape(expr.object)]
  }
  if (expr.kind === 'call') {
    return ['call', expr.fn.id, expr.args.map((arg) => shape(arg))]
  }
  return [expr.kind, children(expr).map((child) => shape(child)), expr.at.pos]
}

/**
 * A name for a value moved before a change
 * @param {Expr} expr - The value
 * @returns {string} Its name
 */
function nameFor(expr) {
  if (expr.kind === 'field' && expr.object.kind === 'local') {
    return `${expr.object.binding.name}${capital(expr.name)}`
  }
  if (expr.kind === 'call') {
    const [first] = expr.args
    const owner = first?.kind === 'local' ? first.binding.name : 'its'
    return `${owner}${capital(expr.fn.name)}`
  }
  return 'value'
}

/**
 * The expressions of a statement in the order they are evaluated, each after its children
 * @param {Stmt} stmt - The statement
 * @returns {Expr[]} The expressions
 */
function evaluationOrder(stmt) {
  /** @type {Expr[]} */
  const list = []
  const visit = (/** @type {Expr} */ expr) => {
    if (expr.kind === 'lambda') {
      for (const inner of expr.body) {
        eachInStmt(inner, (one) => {
          list.push(one)
        })
      }
    } else {
      for (const child of children(expr)) {
        visit(child)
      }
    }
    list.push(expr)
  }
  for (const expr of exprsOf(stmt)) {
    visit(expr)
  }
  return list
}

/**
 * The locals an expression reads, a lambda's own aside
 * @param {Expr} expr - The expression
 * @returns {Set<Binding> | null} The locals, or `null` if it reads a lambda's parameter
 */
function freeOf(expr) {
  /** @type {Set<Binding>} */
  const free = new Set()
  /** @type {Expr[]} */
  const lambdas = []
  eachExpr(expr, (one) => {
    if (one.kind === 'local') {
      free.add(one.binding)
    }
    if (one.kind === 'lambda') {
      lambdas.push(one)
    }
  })
  return lambdas.length > 0 ? null : free
}

/**
 * An empty array
 * @param {ts.Node} at - Where
 * @param {ts.Type} type - Its type
 * @returns {Expr} `[]`
 */
function emptyArray(at, type) {
  return { at, items: [], kind: 'array', type }
}

/**
 * A shallow copy of a record
 * @param {Expr} value - The record
 * @returns {Expr} `{ ...value }`
 */
function copyOf(value) {
  return { at: value.at, entries: [{ kind: 'spread', value }], kind: 'record', type: value.type }
}

export { plan }
