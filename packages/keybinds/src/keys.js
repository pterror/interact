/**
 * Keyboard input: bindings like "$mod+k", "shift+slash" or "Escape". More syntax is opt-in, each its own module
 * passed to keys(): symbols() for "?" and other typed characters, aliases() for "up" and "plus". Showing and
 * recording bindings is keybinds/keys-ui. Listened to for one keybinds(), keys go down and up, and every held key is
 * released when the window loses focus.
 */

/**
 * @import { ParsedBinding } from './binding.js'
 * @import { Modifiers } from './binding-mods.js'
 * @import { CommandInput, Dispatch, InputHandle, Lookups } from './input.js'
 */

import { NO_MODS, eventMods, modsToPrefix, parseMods } from './binding-mods.js'
import { inInput, windowOf } from './input.js'
import { overlayOpen } from './modal.js'

/**
 * A key binding parsed: its modifiers and its key
 * @typedef {Readonly<{ key: string, mods: Modifiers }>} ParsedKey
 */

/**
 * @typedef {object} KeySyntaxFields
 * @property {string} name - Which piece it is ("symbols", "aliases", "layout")
 * @property {(name: string) => string | undefined} [alias] - The key a name stands for
 * @property {(key: string) => boolean} [accepts] - Keys it makes bindable
 * @property {(key: string) => string | undefined} [shifted] - What a binding with Shift means instead
 * @property {(key: string, prefix: string, suffix: string) => string[]} [lookups] - More lookups for a key event
 * @property {(name: string) => string | undefined} [glyph] - How a key is shown, for display pieces like layout()
 * @property {(onChange: () => void) => () => void} [watch] - Follows how keys are shown changing
 */

/**
 * A piece of key binding syntax beyond modifiers and key names
 * @typedef {Readonly<KeySyntaxFields>} KeySyntax
 */

/** Named keys, by the name a key event reports (`event.key`, or `event.code` for physical keys) */
const NAMED_KEY =
  /^(?:f(?:[1-9]|1[0-2])|escape|enter|tab|space|backspace|delete|insert|home|end|page(?:up|down)|arrow(?:up|down|left|right)|bracket(?:left|right)|backslash|semicolon|quote|comma|period|slash|backquote|minus|equal|digit\d)$/u

/**
 * Whether a key is a letter (in any script) or a digit: what a key types on its own, bindable as itself
 * @param {string} key - A key name
 * @returns {boolean} Whether it is
 */
function isLetterOrDigit(key) {
  return /^.$/su.test(key) && (key.toLowerCase() !== key.toUpperCase() || /\d/u.test(key))
}

/**
 * The key a name stands for, through each piece of syntax's aliases
 * @param {string} name - The name as written
 * @param {readonly KeySyntax[]} syntax - The syntax on
 * @returns {string} The key
 */
function aliased(name, syntax) {
  let key = name
  for (const each of syntax) {
    key = each.alias?.(key) ?? key
  }
  return key
}

/**
 * What a key in a binding with Shift means instead, through each piece of syntax
 * @param {string} key - The key
 * @param {readonly KeySyntax[]} syntax - The syntax on
 * @returns {string} The physical key it means
 */
function shifted(key, syntax) {
  let physical = key
  for (const each of syntax) {
    physical = each.shifted?.(physical) ?? physical
  }
  return physical
}

/**
 * A key binding's one key, after aliases, checked to be one that can be bound
 * @param {string} binding - The binding, for errors
 * @param {readonly string[]} remaining - Its parts that aren't modifiers
 * @param {readonly KeySyntax[]} syntax - The syntax on
 * @returns {string} The key
 * @throws {Error} If there is no key, more than one, or one that can't be bound
 */
function onlyKey(binding, remaining, syntax) {
  const [raw, ...more] = remaining
  if (raw === undefined) {
    throw new Error(`Key binding has no key (only modifiers): "${binding}"`)
  }
  if (more.length > 0) {
    throw new Error(`Key binding has multiple keys: "${binding}" (got: ${remaining.join(', ')})`)
  }
  const key = aliased(raw, syntax)
  if (!isLetterOrDigit(key) && !NAMED_KEY.test(key) && !syntax.some((each) => each.accepts?.(key) === true)) {
    throw new Error(`Unknown key "${raw}" in binding "${binding}"`)
  }
  return key
}

/**
 * Parses a key binding like "Ctrl+Shift+K" into normalized form. Its release suffix, if any, has already been taken
 * off.
 * @param {string} binding - The binding
 * @param {readonly KeySyntax[]} [syntax] - The syntax on
 * @returns {ParsedKey} Its modifiers and key
 * @throws {Error} If the binding is invalid
 */
function parseKey(binding, syntax = []) {
  if (binding === '') {
    throw new Error('Invalid key binding: an empty string')
  }
  const parts = binding
    .toLowerCase()
    .split('+')
    .map((part) => part.trim())
    .filter((part) => part !== '')
  const { mods, remaining } = parseMods(parts)
  const key = onlyKey(binding, remaining, syntax)
  if (!mods.shift) {
    return { key, mods }
  }
  // With Shift held a digit types a different character, so the binding means the physical key
  return { key: shifted(/^\d$/u.test(key) ? `digit${key}` : key, syntax), mods }
}

/**
 * A parsed key as a lookup ("ctrl+shift+k")
 * @param {ParsedKey} parsed - The key
 * @returns {string} Its lookup
 */
function keyToLookup(parsed) {
  return `${modsToPrefix(parsed.mods)}${parsed.key}`
}

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

/**
 * The keyboard
 * @param {readonly KeySyntax[]} syntax - More binding syntax: symbols(), aliases()
 * @returns {CommandInput & Readonly<{ syntax: readonly KeySyntax[] }>} The keyboard, as an input
 */
function keys(...syntax) {
  return {
    field: 'keys',
    /**
     * Starts listening
     * @param {Dispatch} dispatch - Where presses are reported
     * @returns {InputHandle} A function that stops
     */
    listen(dispatch) {
      const listener = new KeyListener(dispatch, syntax)
      return () => {
        listener.stop()
      }
    },
    /**
     * Parses one step of a binding
     * @param {string} step - The step
     * @returns {ParsedBinding} The step normalized
     */
    parse(step) {
      const parsed = parseKey(step, syntax)
      return { lookup: keyToLookup(parsed), loose: keyToLookup({ ...parsed, mods: NO_MODS }), mods: parsed.mods }
    },
    syntax,
  }
}

export { NAMED_KEY, eventToKeyLookups, isLetterOrDigit, keyId, keyToLookup, keys, parseKey }
