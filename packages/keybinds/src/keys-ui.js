/**
 * Showing and recording keyboard bindings, for the settings panel, cheatsheet, palette and menus. Recording takes what's
 * pressed next: a press, or with `release` the press and its release.
 */

/**
 * @import { InputUI, RecordOptions } from './input.js'
 * @import { KeySyntax } from './keys.js'
 */

import { formatWithRelease } from './binding-format.js'
import { eventModParts, formatModPart } from './binding-mods.js'
import { RELEASE_SUFFIX } from './binding.js'
import { PUNCTUATION_CODES, isSymbolKey } from './keys-symbols.js'
import { NAMED_KEY, isLetterOrDigit, keyId, keys } from './keys.js'

/**
 * How each physical key name is shown: the character it types on a US layout
 * @returns {ReadonlyMap<string, string>} The characters, by physical key name
 */
function codeGlyphs() {
  /** @type {Map<string, string>} */
  const glyphs = new Map([['plus', '+']])
  for (const [typed, code] of PUNCTUATION_CODES) {
    glyphs.set(code, typed)
  }
  for (let digit = 0; digit < 10; digit += 1) {
    glyphs.set(`digit${digit}`, String(digit))
  }
  return glyphs
}

const CODE_GLYPHS = codeGlyphs()

/** @type {ReadonlyMap<string, string>} */
const NAMED_GLYPHS = new Map([
  ['arrowdown', '↓'],
  ['arrowleft', '←'],
  ['arrowright', '→'],
  ['arrowup', '↑'],
  ['backspace', '⌫'],
  ['delete', '⌦'],
  ['down', '↓'],
  ['enter', '↵'],
  ['esc', 'Esc'],
  ['escape', 'Esc'],
  ['left', '←'],
  ['right', '→'],
  ['space', 'Space'],
  ['tab', 'Tab'],
  ['up', '↑'],
])

/** @type {ReadonlySet<string>} */
const BARE_MODIFIERS = new Set(['alt', 'control', 'meta', 'shift'])

const LETTER_CODE = /^key[a-z]$/u
const ASCII_LETTER_OR_DIGIT = /^[a-z\d]$/u

/**
 * How a piece of syntax shows a key, the first that shows it
 * @param {string} name - The key's name, lowercase
 * @param {readonly KeySyntax[]} syntax - The syntax on; a layout() among them shows physical keys as it types them
 * @returns {string | undefined} The key as shown, if any piece shows it
 */
function glyphOf(name, syntax) {
  for (const each of syntax) {
    const glyph = each.glyph?.(name)
    if (glyph !== undefined && glyph !== '') {
      return glyph
    }
  }
  return undefined
}

/**
 * One part of a key binding as shown
 * @param {string} part - The part
 * @param {readonly KeySyntax[]} syntax - The syntax on
 * @returns {string} Its symbol or name
 */
function formatKeyPart(part, syntax) {
  const name = part.trim().toLowerCase()
  return (
    formatModPart(name) ??
    glyphOf(name, syntax) ??
    NAMED_GLYPHS.get(name) ??
    CODE_GLYPHS.get(name) ??
    part.toUpperCase()
  )
}

/**
 * A key binding as display parts ("$mod+k" is ["⌘", "K"] on a Mac)
 * @param {string} binding - The binding
 * @param {readonly KeySyntax[]} [syntax] - As for keys(); a layout() among them shows physical keys as it types them
 * @returns {string[]} The parts as shown
 */
function formatKeyParts(binding, syntax = []) {
  return formatWithRelease(binding, (part) => formatKeyPart(part, syntax))
}

/**
 * The name a key event's key is bound by. A letter key typing something no binding names (Option+A types "å" on a
 * Mac) is the key itself
 * @param {KeyboardEvent} event - The event
 * @returns {string} The name
 */
function keyName(event) {
  const key = event.key.toLowerCase()
  const name = key === ' ' ? 'space' : key
  const code = event.code.toLowerCase()
  const unnamed = !ASCII_LETTER_OR_DIGIT.test(name) && !NAMED_KEY.test(name) && !isSymbolKey(name)
  return LETTER_CODE.test(code) && unnamed ? code.replace(/^key/u, '') : name
}

/**
 * The physical key that typed a symbol, by its `event.code`
 * @param {string} code - The code, lowercase
 * @returns {string | undefined} A letter or named key, or undefined if it's neither
 */
function physicalName(code) {
  if (LETTER_CODE.test(code)) {
    return code.replace(/^key/u, '')
  }
  return NAMED_KEY.test(code) ? code : undefined
}

/**
 * A typed symbol's binding parts: the character typed ("?"), which already says Shift was needed, when the syntax
 * reads it; otherwise the physical key that typed it (a letter key, on some layouts)
 * @param {KeyboardEvent} event - The event
 * @param {string} name - The symbol typed
 * @param {readonly KeySyntax[]} syntax - The syntax on
 * @returns {string[] | undefined} The parts, or undefined if it can't be bound
 */
function symbolParts(event, name, syntax) {
  const symbols = syntax.some((each) => each.name === 'symbols')
  const aliases = syntax.some((each) => each.name === 'aliases')
  if (symbols && (name !== '+' || aliases)) {
    return [...eventModParts(event, false), name === '+' ? 'plus' : name]
  }
  const physical = physicalName(event.code.toLowerCase())
  return physical === undefined ? undefined : [...eventModParts(event), physical]
}

/**
 * A key event as a binding ("$mod+shift+k"), in the syntax the keyboard input reads: a typed character like "?" only
 * with symbols(), "plus" only with aliases() too; otherwise the physical key ("shift+slash")
 * @param {KeyboardEvent} event - The event
 * @param {readonly KeySyntax[]} [syntax] - The syntax on
 * @returns {string | undefined} The binding, or undefined for a modifier pressed alone or a key that can't be bound
 */
function eventToBindingString(event, syntax = []) {
  if (BARE_MODIFIERS.has(event.key.toLowerCase())) {
    return undefined
  }
  const suffix = event.type === 'keyup' ? RELEASE_SUFFIX : ''
  const name = keyName(event)
  const plain = isLetterOrDigit(name) || NAMED_KEY.test(name) ? [...eventModParts(event), name] : undefined
  const parts = isSymbolKey(name) ? symbolParts(event, name, syntax) : plain
  return parts === undefined ? undefined : `${parts.join('+')}${suffix}`
}

/** One recording of a key binding */
class KeyRecorder {
  /**
   * @readonly
   * @type {RecordOptions}
   */
  #options
  /**
   * @readonly
   * @type {readonly KeySyntax[]}
   */
  #syntax
  /**
   * @readonly
   * @type {(binding: string) => void}
   */
  #done
  /**
   * @readonly
   * @type {Window}
   */
  #target
  /**
   * The press being held until its keyup, for a release: the press-time modifiers are what the release binds to
   * @type {Readonly<{ binding: string, id: string }> | undefined}
   */
  #held

  /**
   * Starts listening for the next key
   * @param {RecordOptions} options - How recording goes
   * @param {readonly KeySyntax[]} syntax - The syntax bindings are written in
   * @param {(binding: string) => void} done - Gets the binding
   */
  constructor(options, syntax, done) {
    this.#options = options
    this.#syntax = syntax
    this.#done = done
    this.#target = options.target ?? globalThis.window
    this.#target.addEventListener('keydown', this, true)
    this.#target.addEventListener('keyup', this, true)
  }

  /**
   * Hears the keyboard
   * @param {Event} event - A keydown or keyup
   * @returns {void}
   */
  handleEvent(event) {
    if (!(event instanceof KeyboardEvent) || this.#options.ignore(event)) {
      return
    }
    if (event.type === 'keyup') {
      this.#up(event)
    } else {
      this.#down(event)
    }
  }

  /**
   * A key went down: recorded at once, or held until it comes up
   * @param {KeyboardEvent} event - The keydown
   * @returns {void}
   */
  #down(event) {
    const binding = event.key === 'Escape' ? undefined : eventToBindingString(event, this.#syntax)
    if (binding === undefined) {
      return
    }
    event.preventDefault()
    event.stopPropagation()
    if (!this.#options.release) {
      this.#done(binding)
    } else if (!event.repeat) {
      this.#held = { binding, id: keyId(event) }
    }
  }

  /**
   * A key came up: the held press's release is recorded
   * @param {KeyboardEvent} event - The keyup
   * @returns {void}
   */
  #up(event) {
    const held = this.#held
    if (held === undefined || held.id !== keyId(event)) {
      return
    }
    event.preventDefault()
    event.stopPropagation()
    this.#held = undefined
    this.#done(`${held.binding}${RELEASE_SUFFIX}`)
  }

  /** @returns {void} */
  stop() {
    this.#target.removeEventListener('keydown', this, true)
    this.#target.removeEventListener('keyup', this, true)
  }
}

/**
 * Follows every piece of syntax that can change how keys are shown (a layout() following the person's layout)
 * @param {readonly KeySyntax[]} syntax - The syntax on
 * @returns {Readonly<{ watch?: (onChange: () => void) => () => void }>} A `watch` if any piece changes
 */
function watching(syntax) {
  const watchers = syntax.flatMap((each) => (each.watch === undefined ? [] : [each.watch]))
  if (watchers.length === 0) {
    return {}
  }
  return {
    watch: (onChange) => {
      const stops = watchers.map((watch) => watch(onChange))
      return () => {
        for (const stop of stops) {
          stop()
        }
      }
    },
  }
}

/**
 * The keyboard, shown and recorded as well as listened to
 * @param {readonly KeySyntax[]} syntax - As for keys()
 * @returns {InputUI} The keyboard, as an input that can be shown and recorded
 */
function keysUI(...syntax) {
  return {
    ...keys(...syntax),
    ...watching(syntax),
    format: (binding) => formatKeyParts(binding, syntax),
    label: 'Key',
    prompt: (release) => (release ? 'Press and release a key...' : 'Press a key...'),
    record: (options, done) => {
      const recorder = new KeyRecorder(options, syntax, done)
      return () => {
        recorder.stop()
      }
    },
    release: () => true,
    ui: true,
  }
}

export { eventToBindingString, formatKeyParts, keysUI }
