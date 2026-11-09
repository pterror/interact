import { afterEach, describe, expect, test } from 'bun:test'

import { keyListen } from './key-listen.js'
import { kbd } from './test-keys.js'

/** @type {(() => void)[]} */
const cleanups = []

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) {
    cleanup()
  }
})

/**
 * Listens to the keyboard on a fresh element in the page, noting each press and release
 * @param {Readonly<{ blocked?: (event: Event) => boolean }>} [options] - Which events to leave alone
 * @returns {Readonly<{ target: HTMLElement, log: readonly string[], held: Readonly<{ has: (lookup: string) =>
 *   boolean }> }>} The element, what was noted, and the keys held
 */
function listen(options = {}) {
  const target = document.createElement('div')
  document.body.append(target)
  /** @type {string[]} */
  const log = []
  const { held, stop } = keyListen({
    ...options,
    target,
    to: {
      down(press) {
        log.push(`down ${press.id}${press.repeat ? ' repeat' : ''}${press.typing ? ' typing' : ''}`)
      },
      up(release) {
        log.push(`up ${release.id} ${release.event.type}${release.blocked ? ' blocked' : ''}`)
      },
    },
  })
  cleanups.push(() => {
    stop()
    target.remove()
  })
  return { held, log, target }
}

describe('keyListen', () => {
  test('makes a key a press known by its physical key, repeats going on with it', () => {
    const { log, target } = listen()
    target.dispatchEvent(kbd('keydown', { code: 'KeyQ', key: 'a' }))
    target.dispatchEvent(kbd('keydown', { code: 'KeyQ', key: 'a', repeat: true }))
    target.dispatchEvent(kbd('keyup', { code: 'KeyQ', key: 'a' }))
    target.dispatchEvent(kbd('keyup', { code: 'KeyQ', key: 'a' }))
    expect(log).toEqual(['down KeyQ', 'down KeyQ repeat', 'up KeyQ keyup'])
  })

  test('never makes a modifier on its own a press', () => {
    const { log, target } = listen()
    target.dispatchEvent(kbd('keydown', { code: 'ShiftLeft', key: 'Shift', shiftKey: true }))
    target.dispatchEvent(kbd('keyup', { code: 'ShiftLeft', key: 'Shift' }))
    expect(log).toEqual([])
  })

  test('knows a key typed into a field, an editable element, or a field inside a shadow root', () => {
    const { log, target } = listen()
    const field = document.createElement('textarea')
    const host = document.createElement('div')
    const inner = document.createElement('input')
    host.attachShadow({ mode: 'open' }).append(inner)
    target.append(field, host)
    field.dispatchEvent(kbd('keydown', { code: 'KeyA', key: 'a' }))
    inner.dispatchEvent(kbd('keydown', { code: 'KeyB', composed: true, key: 'b' }))
    host.dispatchEvent(kbd('keydown', { code: 'KeyC', key: 'c' }))
    expect(log).toEqual(['down KeyA typing', 'down KeyB typing', 'down KeyC'])
  })

  test('releases every held key when the window loses focus, and a later keyup has nothing to release', () => {
    const { log, target } = listen()
    target.dispatchEvent(kbd('keydown', { code: 'KeyK', key: 'k' }))
    globalThis.dispatchEvent(new Event('blur'))
    target.dispatchEvent(kbd('keyup', { code: 'KeyK', key: 'k' }))
    target.dispatchEvent(kbd('keydown', { code: 'KeyK', key: 'k', repeat: true }))
    expect(log).toEqual(['down KeyK', 'up KeyK keyup', 'down KeyK'])
  })

  test('leaves blocked keys alone going down, and says so of them coming up', () => {
    let blocking = true
    const { log, target } = listen({ blocked: () => blocking })
    target.dispatchEvent(kbd('keydown', { code: 'KeyA', key: 'a' }))
    blocking = false
    target.dispatchEvent(kbd('keydown', { code: 'KeyB', key: 'b' }))
    blocking = true
    target.dispatchEvent(kbd('keyup', { code: 'KeyA', key: 'a' }))
    target.dispatchEvent(kbd('keyup', { code: 'KeyB', key: 'b' }))
    expect(log).toEqual(['down KeyB', 'up KeyB keyup blocked'])
  })

  test('holds a key by its lookups without modifiers while it is down, unless typed into a field', () => {
    const { held, target } = listen()
    const field = document.createElement('input')
    target.append(field)
    target.dispatchEvent(kbd('keydown', { code: 'KeyQ', key: 'a', shiftKey: true }))
    field.dispatchEvent(kbd('keydown', { code: 'KeyD', key: 'd' }))
    const down = ['a', 'keyq', 'q', 'd'].map((lookup) => held.has(lookup))
    target.dispatchEvent(kbd('keyup', { code: 'KeyQ', key: 'a' }))
    expect([down, held.has('a')]).toEqual([[true, true, true, false], false])
  })
})
