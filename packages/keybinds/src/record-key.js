/**
 * Recording a key binding from the next key pressed, or with `release` pressed and let go ("k:up", bound with the
 * modifiers held as it went down). It is written in the syntax given: a typed character as itself ("?") where the
 * syntax reads it, the physical key otherwise ("shift+slash"). Escape and modifiers alone are left alone.
 */

import { keyParse } from './key-parse.js'
import { eventModifierParts } from './modifiers.js'

/**
 * @typedef {Readonly<{ ctrl: boolean, alt: boolean, shift: boolean, meta: boolean }>} Modifiers
 */

/**
 * @typedef {Readonly<{
 *   alias?: (name: string) => string | undefined,
 *   accepts?: (key: string, mods: Modifiers) => boolean,
 *   shifted?: (key: string) => string | undefined,
 * }>} KeySyntax
 */

/**
 * @typedef {Readonly<{
 *   done: (binding: string) => void,
 *   target?: EventTarget,
 *   release?: boolean,
 *   syntax?: readonly KeySyntax[],
 *   ignore?: (event: Event) => boolean,
 * }>} RecordKeyOptions
 */

const LETTER_CODE = /^key[a-z]$/u

/**
 * Whether a key is one character that isn't a letter, a digit or a space ("?", "+")
 * @param {string} key - The key, lowercase
 * @returns {boolean} Whether it is
 */
function isSymbol(key) {
  return /^.$/su.test(key) && key.trim() !== '' && key.toLowerCase() === key.toUpperCase() && !/\d/u.test(key)
}

/**
 * Some binding parts, as a binding, if the syntax reads them
 * @param {readonly string[]} parts - The parts
 * @param {readonly KeySyntax[]} syntax - The syntax on
 * @returns {string | undefined} The binding, or nothing
 */
function readable(parts, syntax) {
  const binding = parts.join('+')
  try {
    keyParse(binding, syntax)
    return binding
  } catch {
    return undefined
  }
}

/**
 * A key event as a binding ("$mod+shift+k"). A letter key typing something no binding names (Option+A types "å" on a
 * Mac) is the letter
 * @param {KeyboardEvent} event - The keydown
 * @param {readonly KeySyntax[]} [syntax] - The syntax on
 * @returns {string | undefined} The binding, without a suffix; nothing for a modifier alone or a key that can't be
 *   bound
 */
function keyBinding(event, syntax = []) {
  const typed = event.key === ' ' ? 'space' : event.key.toLowerCase()
  const code = event.code.toLowerCase()
  const letter = LETTER_CODE.test(code) ? code.slice('key'.length) : undefined
  const name = letter !== undefined && !/^[a-z]$/u.test(typed) && !isSymbol(typed) ? letter : typed
  if (!isSymbol(name)) {
    return readable([...eventModifierParts(event), name], syntax)
  }
  return (
    readable([...eventModifierParts(event, false), name === '+' ? 'plus' : name], syntax) ??
    readable([...eventModifierParts(event), letter ?? code], syntax)
  )
}

/**
 * Records a key binding from the next key pressed
 * @param {RecordKeyOptions} options - What gets the binding; where to listen (default the window); whether to record
 *   a release; the syntax on; and which events to leave alone (the recording's own controls)
 * @returns {() => void} Stopping
 */
function recordKey({ done, ignore = () => false, release = false, syntax = [], target = globalThis }) {
  /** @type {Readonly<{ binding: string, code: string }> | undefined} */
  let held = undefined

  /**
   * @param {Event} event - A keydown or keyup
   * @returns {void}
   */
  const onKey = (event) => {
    if (!(event instanceof KeyboardEvent) || ignore(event)) {
      return
    }
    const binding = event.type === 'keyup' || event.key === 'Escape' ? undefined : keyBinding(event, syntax)
    if (event.type === 'keyup' && held?.code === event.code) {
      event.preventDefault()
      event.stopPropagation()
      done(`${held.binding}:up`)
      held = undefined
    } else if (binding !== undefined) {
      event.preventDefault()
      event.stopPropagation()
      if (!release) {
        done(binding)
      } else if (!event.repeat) {
        held = { binding, code: event.code }
      }
    }
  }

  target.addEventListener('keydown', onKey, true)
  target.addEventListener('keyup', onKey, true)
  return () => {
    target.removeEventListener('keydown', onKey, true)
    target.removeEventListener('keyup', onKey, true)
  }
}

export { keyBinding, recordKey }
