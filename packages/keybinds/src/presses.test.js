import { describe, expect, test } from 'bun:test'

import { presses } from './presses.js'

/**
 * Handlers that note their runs
 * @returns {Readonly<{ log: readonly string[], handler: (name: string, fields?: Readonly<{ returns?: boolean,
 *   when?: () => boolean, typing?: boolean }>) => Readonly<{ run: () => boolean | void, when?: () => boolean,
 *   typing?: boolean }> }>} What they noted, and making one that notes as a name, with what it returns, when it
 *   applies and whether it runs while typing
 */
function noted() {
  /** @type {string[]} */
  const log = []
  return {
    handler: (name, { returns, ...fields } = {}) => ({
      ...fields,
      run: () => {
        log.push(name)
        return returns
      },
    }),
    log,
  }
}

/**
 * A press of a key
 * @param {string} id - Its id
 * @param {readonly string[]} lookups - Its lookups
 * @param {Readonly<{ repeat?: boolean, typing?: boolean }>} [more] - Whether it repeats, and is typed
 * @returns {Readonly<{ id: string, query: readonly string[], event: Event, typing: boolean, repeat: boolean }>} It
 */
function press(id, lookups, { repeat = false, typing = false } = {}) {
  return { event: new Event('keydown', { cancelable: true }), id, query: lookups, repeat, typing }
}

/**
 * Looks lookups up in a table
 * @template H
 * @param {Readonly<Record<string, readonly H[]>>} table - Handlers by lookup
 * @returns {(lookups: readonly string[]) => readonly H[]} Finding them
 */
function inTable(table) {
  return (lookups) => lookups.flatMap((lookup) => table[lookup] ?? [])
}

describe('presses', () => {
  test('runs the first handler that applies and does not return false, which takes the event', () => {
    const { handler, log } = noted()
    const off = handler('off', { when: () => false })
    const passes = handler('passes', { returns: false })
    const takes = handler('takes')
    const later = handler('later')
    const running = presses(inTable({ k: [off, passes, takes, later] }))
    const pressed = press('KeyK', ['k'])
    expect(running.down(pressed)).toBe(takes)
    expect([log, pressed.event.defaultPrevented]).toEqual([['passes', 'takes'], true])
  })

  test('leaves an event none takes alone', () => {
    const running = presses(inTable({ k: [noted().handler('off', { when: () => false })] }))
    const pressed = press('KeyK', ['k'])
    expect([running.down(pressed), pressed.event.defaultPrevented]).toEqual([undefined, false])
  })

  test('runs only handlers that may run while typing, where text is typed', () => {
    const { handler, log } = noted()
    const running = presses(inTable({ k: [handler('plain'), handler('typing', { typing: true })] }))
    running.down(press('KeyK', ['k'], { typing: true }))
    expect(log).toEqual(['typing'])
  })

  test('holds a handler from the press it took until that comes up, repeats and all', () => {
    const forward = noted().handler('forward')
    const running = presses(inTable({ w: [forward] }))
    /** @type {(readonly unknown[] | undefined)[]} */
    const heard = []
    running.held.watch((values) => {
      heard.push(values)
    })
    expect(running.held.has(forward)).toBe(false)
    running.down(press('KeyW', ['w']))
    running.down(press('KeyW', ['w'], { repeat: true }))
    expect([running.held.has(forward), running.took('KeyW')]).toEqual([true, [forward]])
    running.up({ id: 'KeyW' })
    expect([running.held.has(forward), running.took('KeyW'), heard]).toEqual([false, [], [[forward], [forward]]])
  })

  test("doesn't hold a handler for a press it didn't take", () => {
    const off = noted().handler('off', { when: () => false })
    const passes = noted().handler('passes', { returns: false })
    const running = presses(inTable({ a: [off], b: [passes] }))
    running.down(press('KeyA', ['a']))
    running.down(press('KeyB', ['b']))
    expect([running.held.has(off), running.held.has(passes)]).toEqual([false, false])
  })

  test('runs a repeat again, as the press it repeats', () => {
    const { handler, log } = noted()
    const running = presses(inTable({ 'shift+w': [handler('shifted')], w: [handler('w')] }))
    running.down(press('KeyW', ['w']))
    running.down(press('KeyW', ['shift+w'], { repeat: true }))
    expect(log).toEqual(['w', 'w'])
  })
})
