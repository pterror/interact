import { describe, expect, test } from 'bun:test'

import { Controllable } from './controllable.js'

/**
 * A state, and what its listeners heard: each request as "asked", each change as "now".
 * @param {boolean} controlled - Whether the app owns it
 * @returns {Readonly<{ state: Controllable<string>, heard: string[] }>} The state and the record
 */
function followed(controlled) {
  const state = new Controllable('a', controlled)
  /** @type {string[]} */
  const heard = []
  state.onRequest((value) => {
    heard.push(`asked ${value}`)
  })
  state.subscribe((value) => {
    heard.push(`now ${value}`)
  })
  return { heard, state }
}

describe('Controllable', () => {
  test('left to the component, a request changes the value and is heard', () => {
    const { heard, state } = followed(false)
    state.request('b')
    expect(state.get()).toBe('b')
    expect(heard).toEqual(['asked b', 'now b'])
  })

  test('controlled, a request changes nothing until the app sets the value', () => {
    const { heard, state } = followed(true)
    state.request('b')
    expect(state.get()).toBe('a')
    state.set('c')
    expect(state.get()).toBe('c')
    expect(heard).toEqual(['asked b', 'now c'])
  })

  test('setting the same value tells no one', () => {
    const { heard, state } = followed(false)
    state.set('a')
    expect(heard).toEqual([])
  })

  test('can be handed to the app or back', () => {
    const { state } = followed(false)
    state.control(true)
    state.request('b')
    expect(state.get()).toBe('a')
    state.control(false)
    state.request('b')
    expect(state.get()).toBe('b')
  })
})
