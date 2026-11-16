/**
 * A widget's effects as calls on a host: one method per kind of effect, named by its `type` (and, where a type has
 * records of more than one shape, the first field only its shape has: `askRanks`, `askLocate`), taking where the
 * effect came from and then the effect's fields in the order of their names. The source's effects are data; each
 * place the planned code appends one becomes a call, so no effect record is made.
 */

import { capital } from './normalize.js'
import { blocksOf } from './walk.js'

/** @import { Binding, Expr, Item, Stmt } from './ir.js' */
/** @import { Plan } from './plan.js' */

/**
 * A host method: the effect's fields in order, and the parameters they are passed as (a field holding an array
 * written out where the effect is made, `ranks`, is passed as its items: `ranksFrom`, `ranksTo`; its length in
 * `tuples`)
 * @typedef {Readonly<{
 *   method: string,
 *   type: string,
 *   fields: readonly string[],
 *   tuples: Readonly<Record<string, number>>,
 *   params: readonly string[],
 * }>} Method
 */

/**
 * An append of effects, as calls: a call, or calls chosen by a condition
 * @typedef {Readonly<{ kind: 'call', method: Method, args: readonly Expr[] }>
 *   | Readonly<{ kind: 'if', test: Expr, whenTrue: readonly Call[], whenFalse: readonly Call[] }>} Call
 */

/**
 * A plan's effects as host methods
 * @typedef {Readonly<{
 *   methods: readonly Method[],
 *   calls: (items: readonly Item[]) => Call[],
 *   counted: ReadonlySet<string>,
 * }>} Effects
 */

/**
 * The host methods a plan's appends call, and how each append is called
 * @param {Plan} planned - The plan
 * @param {ReadonlyMap<Binding, Expr>} known - Locals whose values are known where the plan's functions run (a
 *   factory's constants)
 * @returns {Effects} The methods
 */
function effectsOf(planned, known) {
  /** @type {Map<string, Readonly<{ type: string, fields: readonly string[], tuples: Readonly<Record<string, number>> }>>} */
  const shapes = new Map()
  /**
   * The records an append makes, flattened: each with its type, fields and values, or a condition choosing
   * @param {readonly Item[]} items - The items appended
   * @returns {Shaped[]} The records
   */
  const flatten = (items) => items.flatMap((item) => (item.spread ? spread(item.value) : [record(item.value)]))
  /**
   * @typedef {Readonly<{ kind: 'record', type: string, fields: readonly (readonly [string, Expr])[] }>
   *   | Readonly<{ kind: 'if', test: Expr, whenTrue: readonly Shaped[], whenFalse: readonly Shaped[] }>} Shaped
   */
  /**
   * The records of an array of effects
   * @param {Expr} value - The array
   * @returns {Shaped[]} Its records
   */
  const spread = (value) => {
    if (value.kind === 'constant') {
      return spread(value.constant.value)
    }
    if (value.kind === 'local') {
      const given = known.get(value.binding)
      if (given !== undefined) {
        return spread(given)
      }
    }
    if (value.kind === 'array') {
      return flatten(value.items)
    }
    if (value.kind === 'conditional') {
      return [{ kind: 'if', test: value.test, whenFalse: spread(value.whenFalse), whenTrue: spread(value.whenTrue) }]
    }
    throw new Error(`effects the generator can't see one by one, at ${placeOf(value)}`)
  }
  /**
   * One effect record
   * @param {Expr} value - The record
   * @returns {Shaped} It
   */
  const record = (value) => {
    const literal = value.kind === 'constant' ? value.constant.value : value
    if (literal.kind !== 'record' || literal.entries.some((entry) => entry.kind === 'spread')) {
      throw new Error(`an effect the generator can't see the fields of, at ${placeOf(value)}`)
    }
    /** @type {Map<string, Expr>} */
    const fields = new Map()
    for (const entry of literal.entries) {
      if (entry.kind === 'field') {
        fields.set(entry.name, entry.value)
      }
    }
    const type = fields.get('type')
    if (type?.kind !== 'literal' || typeof type.value !== 'string') {
      throw new Error(`an effect without a type written out, at ${placeOf(value)}`)
    }
    fields.delete('type')
    const sorted = [...fields].toSorted(([a], [b]) => (a < b ? -1 : 1))
    /** @type {Record<string, number>} */
    const tuples = {}
    for (const [name, field] of sorted) {
      if (field.kind === 'array' && field.items.length > 0 && field.items.every((item) => !item.spread)) {
        tuples[name] = field.items.length
      }
    }
    const shapeKey = `${type.value}|${sorted.map(([name]) => name).join(',')}`
    const seen = shapes.get(shapeKey)
    if (seen !== undefined && JSON.stringify(seen.tuples) !== JSON.stringify(tuples)) {
      throw new Error(`an effect whose array field is written out in one place and not another, at ${placeOf(value)}`)
    }
    shapes.set(shapeKey, { fields: sorted.map(([name]) => name), tuples, type: type.value })
    return { fields: sorted, kind: 'record', type: type.value }
  }
  /** @type {Set<string>} */
  const counted = new Set()
  const visit = (/** @type {readonly Stmt[]} */ stmts) => {
    for (const stmt of stmts) {
      if (stmt.kind === 'emit' || stmt.kind === 'insert') {
        flatten(stmt.items)
      }
      if (stmt.kind === 'scan') {
        for (const type of scannedTypes(stmt.test, stmt.param)) {
          counted.add(type)
        }
      }
      for (const inner of blocksOf(stmt)) {
        visit(inner)
      }
    }
  }
  for (const fn of planned.fns) {
    visit(fn.body)
  }
  /** @type {Map<string, Method>} */
  const methods = new Map()
  /** @type {Map<string, Readonly<{ type: string, fields: readonly string[], tuples: Readonly<Record<string, number>> }>[]>} */
  const byType = new Map()
  for (const shape of shapes.values()) {
    byType.set(shape.type, [...(byType.get(shape.type) ?? []), shape])
  }
  for (const [type, list] of byType) {
    for (const shape of list) {
      const own = shape.fields.find((field) => !list.every((other) => other.fields.includes(field)))
      const method = list.length === 1 || own === undefined ? type : `${type}${capital(own)}`
      const params = shape.fields.flatMap((field) => paramsOf(field, shape.tuples[field]))
      methods.set(`${type}|${shape.fields.join(',')}`, {
        fields: shape.fields,
        method,
        params,
        tuples: shape.tuples,
        type,
      })
    }
  }
  /**
   * The calls of flattened records
   * @param {readonly Shaped[]} list - The records
   * @returns {Call[]} The calls
   */
  const toCalls = (list) =>
    list.map((one) => {
      if (one.kind === 'if') {
        return { kind: 'if', test: one.test, whenFalse: toCalls(one.whenFalse), whenTrue: toCalls(one.whenTrue) }
      }
      const method = methods.get(`${one.type}|${one.fields.map(([name]) => name).join(',')}`)
      if (method === undefined) {
        throw new Error(`no host method for ${one.type}`)
      }
      const args = one.fields.flatMap(([name, value]) =>
        method.tuples[name] !== undefined && value.kind === 'array' ? value.items.map((item) => item.value) : [value],
      )
      return { args, kind: 'call', method }
    })
  return {
    calls: (items) => toCalls(flatten(items)),
    counted,
    methods: [...methods.values()].toSorted((a, b) => (a.method < b.method ? -1 : 1)),
  }
}

/**
 * The parameters a field is passed as: itself, or its items
 * @param {string} field - The field
 * @param {number | undefined} length - Its length, if it is an array written out
 * @returns {string[]} The parameters' names
 */
function paramsOf(field, length) {
  if (length === undefined) {
    return [field]
  }
  return length === 2 ? [`${field}From`, `${field}To`] : Array.from({ length }, (_, at) => `${field}${String(at)}`)
}

/**
 * A record of an effect's fields from a host method's parameters, as source: `name: value` for each field
 * @param {Method} method - The method
 * @param {string} assign - How a field is written: `:` in JavaScript, `=` in Lua
 * @param {(items: readonly string[]) => string} array - How an array is written
 * @returns {string[]} The fields, written
 */
function fieldsFromParams(method, assign, array) {
  let at = 0
  return method.fields.map((field) => {
    const length = method.tuples[field]
    const taken = method.params.slice(at, at + (length ?? 1))
    at += length ?? 1
    return `${field}${assign} ${length === undefined ? (taken[0] ?? field) : array(taken)}`
  })
}

/**
 * The effect types a test over effects asks about: `effect.type === 'active'`, or several joined by `||`
 * @param {Expr} test - The test
 * @param {Binding} param - The effect's local
 * @returns {string[]} The types
 */
function scannedTypes(test, param) {
  if (test.kind === 'logical' && test.op === '||') {
    return [...scannedTypes(test.left, param), ...scannedTypes(test.right, param)]
  }
  if (
    test.kind === 'binary' &&
    test.op === '===' &&
    test.left.kind === 'field' &&
    test.left.name === 'type' &&
    test.left.object.kind === 'local' &&
    test.left.object.binding === param &&
    test.right.kind === 'literal' &&
    typeof test.right.value === 'string'
  ) {
    return [test.right.value]
  }
  throw new Error(`a test over effects other than by their type, at ${placeOf(test)}`)
}

/**
 * Where an expression is, for a message
 * @param {Expr} value - The expression
 * @returns {string} `file:line`
 */
function placeOf(value) {
  const file = value.at.getSourceFile()
  const { line } = file.getLineAndCharacterOfPosition(value.at.getStart())
  return `${file.fileName.split('/').slice(-2).join('/')}:${String(line + 1)}`
}

/**
 * The values of a factory's constants, which effects may name (`focus` in the dialog)
 * @param {Plan} planned - The plan
 * @returns {Map<Binding, Expr>} Each constant's value
 */
function factoryKnown(planned) {
  /** @type {Map<Binding, Expr>} */
  const known = new Map()
  for (const stmt of planned.widget.factory?.locals ?? []) {
    if (stmt.kind === 'const' && stmt.pattern.kind === 'bind') {
      known.set(stmt.pattern.binding, stmt.value)
    }
  }
  return known
}

export { effectsOf, factoryKnown, fieldsFromParams }
