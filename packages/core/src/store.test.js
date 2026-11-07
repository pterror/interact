/** @import { EffectType, Part } from './state.js' */

import { describe, expect, test } from 'bun:test'

import { defineEffect, defineField, precedence } from './state.js'
import { Store, definePlugin, inputHandler } from './store.js'

/** @type {EffectType<string>} */
const said = defineEffect()

/** @type {readonly string[]} */
const NOTHING_SAID = []

const log = defineField({
  create: () => NOTHING_SAID,
  update: (value, transaction) => [...value, ...transaction.effectsOf(said)],
})

describe('Store', () => {
  test('applies transactions, the plugins hearing each before the listeners', () => {
    /** @type {string[]} */
    const heard = []
    const plugin = definePlugin(() => ({
      update: (transaction) => {
        heard.push(`plugin ${transaction.effectsOf(said).join(',')}`)
      },
    }))
    const store = new Store([log, plugin])
    store.subscribe((transaction) => {
      heard.push(`listener ${transaction.effectsOf(said).join(',')}`)
    })
    store.dispatch({ effects: said.of('a') })
    expect(store.state.field(log)).toEqual(['a'])
    expect(heard).toEqual(['plugin a', 'listener a'])
  })

  test('applies a transaction dispatched while another applies right after it', () => {
    const echo = definePlugin((store) => ({
      update: (transaction) => {
        if (transaction.effectsOf(said).includes('ping')) {
          store.dispatch({ effects: said.of('pong') })
        }
      },
    }))
    const store = new Store([log, echo])
    /** @type {string[]} */
    const seen = []
    store.subscribe(() => {
      seen.push(store.state.field(log).join(','))
    })
    store.dispatch({ effects: said.of('ping') })
    expect(seen).toEqual(['ping', 'ping,pong'])
  })

  test('offers an input to the handlers in precedence order until one takes it', () => {
    /** @type {string[]} */
    const offered = []
    /**
     * A handler that notes the input and takes it or not.
     * @param {string} name - Its name
     * @param {boolean} takes - Whether it takes the input
     * @returns {Part} The handler
     */
    const handler = (name, takes) =>
      inputHandler.of((input) => {
        offered.push(`${name} ${input.is(said) ? input.value : '?'}`)
        return takes
      })
    const store = new Store([handler('default', true), precedence('high', handler('high', false))])
    expect(store.handle(said.of('x'))).toBe(true)
    expect(offered).toEqual(['high x', 'default x'])
    expect(new Store([]).handle(said.of('x'))).toBe(false)
  })

  test('runs each plugin until it is destroyed, then dispatches nothing', () => {
    let destroyed = false
    const plugin = definePlugin(() => ({
      destroy: () => {
        destroyed = true
      },
      name: 'counter',
    }))
    const store = new Store([plugin, plugin])
    expect(store.plugin(plugin)?.name).toBe('counter')
    store.destroy()
    expect(destroyed).toBe(true)
    expect(store.plugin(plugin)).toBeUndefined()
    expect(() => {
      store.dispatch({ effects: said.of('late') })
    }).toThrow()
  })
})
