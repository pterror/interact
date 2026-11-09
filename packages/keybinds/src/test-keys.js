/**
 * What the tests share: key events, and keybinds() listening on a fresh element.
 */

import { keybinds } from './keybinds.js'

/** @typedef {Parameters<typeof keybinds>[0]} Bindings */
/** @typedef {NonNullable<Parameters<typeof keybinds>[1]>} Options */

/**
 * A key event that bubbles and can be cancelled
 * @param {string} type - "keydown" or "keyup"
 * @param {KeyboardEventInit} init - Its key and code, and anything more
 * @returns {KeyboardEvent} The event
 */
function kbd(type, init) {
  return new KeyboardEvent(type, { bubbles: true, cancelable: true, ...init })
}

/**
 * A key's code as a US keyboard has it, for a letter
 * @param {string} key - The key
 * @returns {string} Its code
 */
function codeOf(key) {
  return /^[a-z]$/iu.test(key) ? `Key${key.toUpperCase()}` : key
}

/**
 * keybinds() on a fresh element, with a way to press keys on it
 * @param {Bindings} bindings - The bindings
 * @param {Options} [options] - More options
 * @returns {Readonly<{ target: HTMLElement, stop: () => void, down: (key: string, init?: KeyboardEventInit) =>
 *   KeyboardEvent, up: (key: string, init?: KeyboardEventInit) => KeyboardEvent, tap: (key: string,
 *   init?: KeyboardEventInit) => KeyboardEvent }>} The element, stopping, and a key going down, up, or both
 */
function listening(bindings, options = {}) {
  const target = document.createElement('div')
  const stop = keybinds(bindings, { target, ...options })
  /**
   * A key event dispatched on the element
   * @param {string} type - "keydown" or "keyup"
   * @param {string} key - The key
   * @param {KeyboardEventInit} init - More of it
   * @returns {KeyboardEvent} The event
   */
  const send = (type, key, init) => {
    const event = kbd(type, { code: codeOf(key), key, ...init })
    target.dispatchEvent(event)
    return event
  }
  return {
    down: (key, init = {}) => send('keydown', key, init),
    stop,
    tap(key, init = {}) {
      const event = send('keydown', key, init)
      send('keyup', key, init)
      return event
    },
    target,
    up: (key, init = {}) => send('keyup', key, init),
  }
}

/**
 * A log of runs, each noted as "name:type"
 * @returns {Readonly<{ entries: readonly string[], as: (name: string) => (event: Event) => void }>} What was noted,
 *   and a run that notes as a name
 */
function notes() {
  /** @type {string[]} */
  const entries = []
  return {
    as: (name) => (event) => {
      entries.push(`${name}:${event.type}`)
    },
    entries,
  }
}

/**
 * A run that does nothing
 * @returns {void}
 */
function nothing() {
  return undefined
}

export { kbd, listening, nothing, notes }
