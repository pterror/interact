/** @import { EffectType, Facet, Field } from './state.js' */

import { describe, expect, test } from 'bun:test'

import {
  State,
  controlled,
  defineEffect,
  defineFacet,
  defineField,
  listFacet,
  precedence,
  transactionFilter,
} from './state.js'

/** @type {EffectType<number>} */
const add = defineEffect()

const total = defineField({
  create: () => 0,
  update: (value, transaction) => transaction.effectsOf(add).reduce((sum, each) => sum + each, value),
})

describe('facets', () => {
  test('combine their inputs by level, then in the order given', () => {
    /** @type {Facet<string, readonly string[]>} */
    const names = listFacet()
    const state = State.create([
      names.of('a'),
      precedence('low', names.of('low')),
      [names.of('b'), precedence('highest', names.of('first'))],
      names.of('c'),
    ])
    expect(state.facet(names)).toEqual(['first', 'a', 'b', 'c', 'low'])
  })

  test('count a part given twice once, where it first comes', () => {
    /** @type {Facet<string, readonly string[]>} */
    const names = listFacet()
    const shared = names.of('shared')
    expect(State.create([names.of('a'), shared, [shared, names.of('b')]]).facet(names)).toEqual(['a', 'shared', 'b'])
  })

  test('give their combined nothing when no extension gives them anything', () => {
    /** @type {Facet<boolean, boolean>} */
    const any = defineFacet((inputs) => inputs.includes(true))
    expect(State.create([]).facet(any)).toBe(false)
  })
})

describe('fields', () => {
  test('start from create and change only by transactions', () => {
    const state = State.create(total)
    const next = state.update({ effects: [add.of(2), add.of(3)] }).state
    expect(state.field(total)).toBe(0)
    expect(next.field(total)).toBe(5)
  })

  test('can read each other in any order while a transaction applies', () => {
    const doubled = defineField({
      create: (state) => state.field(total) * 2,
      update: (_value, transaction) => transaction.state.field(total) * 2,
    })
    const state = State.create([doubled, total])
    expect(state.update({ effects: add.of(4) }).state.field(doubled)).toBe(8)
  })

  test('fail when one needs its own value, or is not in the state', () => {
    /** @type {Field<number>} */
    const loop = defineField({ create: (state) => state.field(loop), update: (value) => value })
    expect(() => State.create(loop)).toThrow(RangeError)
    expect(() => State.create([]).field(total)).toThrow(RangeError)
    expect(State.create([]).has(total)).toBe(false)
  })
})

describe('transactions', () => {
  test('carry their effects, which filters can change', () => {
    const doubling = transactionFilter.of((effects) =>
      effects.map((effect) => (effect.is(add) ? add.of(effect.value * 2) : effect)),
    )
    const state = State.create([total, doubling])
    const transaction = state.update({ effects: add.of(1) })
    expect(transaction.effectsOf(add)).toEqual([2])
    expect(transaction.startState).toBe(state)
    expect(state.update({ effects: add.of(1), filter: false }).state.field(total)).toBe(1)
  })

  test('hand a controlled piece of state to the app, which applies what it decides', () => {
    /** @type {number[]} */
    const heard = []
    const state = State.create([
      total,
      controlled(add, (value) => {
        heard.push(value)
      }),
    ])
    expect(state.update({ effects: add.of(3) }).state.field(total)).toBe(0)
    expect(heard).toEqual([3])
    expect(state.update({ effects: add.of(3), filter: false }).state.field(total)).toBe(3)
  })
})
