/**
 * The keyboard, listened to for one keybinds(): keys going down and up, and every held key released when the window
 * loses focus.
 */

/**
 * @import { KeySyntax } from './keys.js'
 * @import { Dispatch, Lookups } from './input.js'
 */

import { eventMods, modsToPrefix } from './binding-mods.js'
import { inInput, windowOf } from './input.js'
import { overlayOpen } from './modal.js'

/**
 * A key the keyboard reports, kept for releasing it if its keyup never comes
 * @typedef {Readonly<{ code: string, key: string }>} HeldKey
 */

/** @type {ReadonlySet<string>} */
const MODIFIER_KEYS = new Set(['Alt', 'Control', 'Meta', 'Shift'])

/**
 * The prefix and suffix an event's lookups get, and the syntax that adds more
 * @typedef {Readonly<{ prefix?: string, suffix?: string, syntax?: readonly KeySyntax[] }>} LookupOptions
 */

/**
 * A key event's lookups: by the key it typed, its physical key, and its letter
 * @param {KeyboardEvent} event - The event
 * @param {LookupOptions} [options] - A modifier prefix to use instead of the event's own, a suffix (":up") and syntax
 * @returns {string[]} Its lookups, best first
 */
function eventToKeyLookups(event, options = {}) {
  const { prefix = modsToPrefix(eventMods(event)), suffix = '', syntax = [] } = options
  const key = event.key.toLowerCase()
  const code = event.code.toLowerCase()
  const letter = code.startsWith('key') ? code.replace(/^key/u, '') : undefined
  return [
    `${prefix}${key}${suffix}`,
    ...(code === key ? [] : [`${prefix}${code}${suffix}`]),
    ...(letter === undefined || letter === key ? [] : [`${prefix}${letter}${suffix}`]),
    ...syntax.flatMap((each) => each.lookups?.(key, prefix, suffix) ?? []),
  ]
}

/**
 * The id a key event's press is known by: its physical key, or its key where there is none
 * @param {KeyboardEvent} event - The event
 * @returns {string} The id
 */
function keyId(event) {
  return event.code === '' ? event.key : event.code
}

/** The keyboard, listened to for one keybinds() */
class KeyListener {
  /**
   * @readonly
   * @type {Dispatch}
   */
  #dispatch
  /**
   * @readonly
   * @type {readonly KeySyntax[]}
   */
  #syntax
  /**
   * @readonly
   * @type {Map<string, HeldKey>}
   */
  #held = new Map()
  /**
   * @readonly
   * @type {EventTarget}
   */
  #window

  /**
   * Starts listening
   * @param {Dispatch} dispatch - Where presses are reported
   * @param {readonly KeySyntax[]} syntax - The syntax on
   */
  constructor(dispatch, syntax) {
    this.#dispatch = dispatch
    this.#syntax = syntax
    const { target } = dispatch
    this.#window = windowOf(target)
    target.addEventListener('keydown', this, { capture: dispatch.capture })
    target.addEventListener('keyup', this, { capture: dispatch.capture })
    this.#window.addEventListener('blur', this)
  }

  /**
   * Hears the keyboard and the window's focus
   * @param {Event} event - A keydown, keyup or blur
   * @returns {void}
   */
  handleEvent(event) {
    if (event.type === 'blur') {
      this.#blur()
    } else if (event.type === 'keyup') {
      this.#up(event)
    } else {
      this.#down(event)
    }
  }

  /**
   * A key went down
   * @param {Event} event - The keydown
   * @returns {void}
   */
  #down(event) {
    // Nothing binds a modifier on its own, and pressing one (Shift, to type "G") mustn't break off a sequence
    if (!(event instanceof KeyboardEvent) || overlayOpen(event) || MODIFIER_KEYS.has(event.key)) {
      return
    }
    const id = keyId(event)
    this.#held.set(id, { code: event.code, key: event.key })
    this.#dispatch.down(id, event, {
      inInput: inInput(event.target),
      lookups: this.#lookups(event),
      mods: eventMods(event),
      repeat: event.repeat,
    })
  }

  /**
   * A key's lookups, for any suffix and modifiers
   * @param {KeyboardEvent} event - The keydown
   * @returns {Lookups} Its lookups: exact, and without modifiers
   */
  #lookups(event) {
    const syntax = this.#syntax
    return (suffix, mods) => [
      eventToKeyLookups(event, { prefix: modsToPrefix(mods), suffix, syntax }),
      eventToKeyLookups(event, { prefix: '', suffix, syntax }),
    ]
  }

  /**
   * A key came up
   * @param {Event} event - The keyup
   * @returns {void}
   */
  #up(event) {
    if (!(event instanceof KeyboardEvent)) {
      return
    }
    const id = keyId(event)
    this.#held.delete(id)
    this.#dispatch.up(id, event, { blocked: overlayOpen(event), inInput: inInput(event.target) })
  }

  /**
   * The window lost focus. A key let go after that sends its keyup to whatever has focus now, so every held key is
   * released; coming back with one still down, its auto-repeat starts a new press
   * @returns {void}
   */
  #blur() {
    const held = [...this.#held]
    this.#held.clear()
    for (const [id, { code, key }] of held) {
      this.#dispatch.up(id, new KeyboardEvent('keyup', { cancelable: true, code, key }))
    }
  }

  /** @returns {void} */
  stop() {
    const { capture, target } = this.#dispatch
    target.removeEventListener('keydown', this, { capture })
    target.removeEventListener('keyup', this, { capture })
    this.#window.removeEventListener('blur', this)
  }
}

export { KeyListener, eventToKeyLookups, keyId }
