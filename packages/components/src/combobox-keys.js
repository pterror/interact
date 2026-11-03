/**
 * What keys typed in a combobox's field do, as the WAI-ARIA APG combobox pattern says: with its list closed or open,
 * select-only or editable.
 * @import { Combobox } from './combobox.js'
 */

import { PLAIN } from './field-keys.js'
import { landing } from './landing.js'

/**
 * What was held with a key: Alt, Shift, and Control or Command.
 * @typedef {Readonly<{ alt: boolean, shift: boolean, toggle: boolean }>} ComboboxModifiers
 */

const NONE = 0
const ONE = 1
const FORWARD = 1
const BACK = -1
/** A key that types one character: `KeyboardEvent.key` names every other key with a word. */
const ONE_CHARACTER = /^.$/su
const MOVES = new Set(['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp'])
/** Keys that put the cursor back in an editable field's text, keeping what completed it, so no option is active. */
const TO_FIELD = new Set(['Home', 'End', 'ArrowLeft', 'ArrowRight'])

/**
 * Whether a key is a character typed, with nothing but Shift held.
 * @param {string} key - The key
 * @param {ComboboxModifiers} modifiers - What was held
 * @returns {boolean} Whether it is
 */
function printable(key, modifiers) {
  return ONE_CHARACTER.test(key) && !modifiers.alt && !modifiers.toggle
}

/**
 * Moves the active option in an open list: from none, Down and Page Down go to the first, Up and Page Up to the last.
 * @template T, F
 * @param {Combobox<T, F>} box - The combobox
 * @param {string} key - An arrow, page, Home or End key
 * @returns {boolean} True: the key was used
 */
function moveIn(box, key) {
  const { list } = box
  if (list.active.get() !== undefined) {
    list.key(key, PLAIN)
    return true
  }
  const down = key === 'ArrowDown' || key === 'PageDown' || key === 'Home'
  const to = down ? landing(list, NONE, FORWARD) : landing(list, list.items.count - ONE, BACK)
  if (to !== undefined) {
    list.goTo(to)
  }
  return true
}

/**
 * A key with a select-only combobox's list closed: the arrows, Enter, Space, Home and End open it, and a character
 * typed opens it on the first option it starts.
 * @template T, F
 * @param {Combobox<T, F>} box - The combobox
 * @param {string} key - The key
 * @param {ComboboxModifiers} modifiers - What was held
 * @returns {boolean} Whether it was used
 */
function closedSelect(box, key, modifiers) {
  if (key === 'ArrowDown' && modifiers.alt) {
    box.open('value')
  } else if (key === 'ArrowDown' || key === 'Enter' || key === ' ') {
    box.open('value-or-first')
  } else if (key === 'ArrowUp' || key === 'Home' || key === 'End') {
    box.open(key === 'End' ? 'last' : 'first')
  } else if (printable(key, modifiers)) {
    box.open('none')
    void box.list.type(key)
  } else {
    return false
  }
  return true
}

/**
 * A key with a select-only combobox's list open: the arrows, page keys, Home and End move the active option; Enter,
 * Space and Alt+Up choose it; a character typed goes to the option it starts (a space too, while typing goes on).
 * @template T, F
 * @param {Combobox<T, F>} box - The combobox
 * @param {string} key - The key
 * @param {ComboboxModifiers} modifiers - What was held
 * @returns {boolean} Whether it was used
 */
function openSelect(box, key, modifiers) {
  const choosing = (key === 'ArrowUp' && modifiers.alt) || key === 'Enter' || (key === ' ' && !box.list.typing)
  if (choosing) {
    box.chooseActive()
    return true
  }
  if (MOVES.has(key) || key === 'Home' || key === 'End') {
    return moveIn(box, key)
  }
  if (!printable(key, modifiers)) {
    return false
  }
  void box.list.type(key)
  return true
}

/**
 * A key with an editable combobox's list closed: Down opens it on the first option, Up on the last, Alt+Down on the
 * option chosen. The rest edit the text.
 * @template T, F
 * @param {Combobox<T, F>} box - The combobox
 * @param {string} key - The key
 * @param {ComboboxModifiers} modifiers - What was held
 * @returns {boolean} Whether it was used
 */
function closedEditable(box, key, modifiers) {
  if (key === 'ArrowDown') {
    box.open(modifiers.alt ? 'value' : 'first')
    return true
  }
  if (key === 'ArrowUp' && !modifiers.alt) {
    box.open('last')
    return true
  }
  return false
}

/**
 * A key with an editable combobox's list open: the arrows and page keys move the active option; Enter and Alt+Up
 * choose it; Home, End and the left and right arrows put the cursor back in the text, with no option active.
 * @template T, F
 * @param {Combobox<T, F>} box - The combobox
 * @param {string} key - The key
 * @param {ComboboxModifiers} modifiers - What was held
 * @returns {boolean} Whether it was used
 */
function openEditable(box, key, modifiers) {
  if (key === 'Enter' || (key === 'ArrowUp' && modifiers.alt)) {
    box.chooseActive()
    return true
  }
  if (MOVES.has(key)) {
    return moveIn(box, key)
  }
  if (TO_FIELD.has(key) && box.list.active.get() !== undefined) {
    box.keepCompletion()
    box.list.active.request(undefined)
  }
  return false
}

/**
 * Escape: closes the list, choosing nothing; with it closed, empties an editable field that clears on Escape.
 * @template T, F
 * @param {Combobox<T, F>} box - The combobox
 * @returns {boolean} Whether it was used
 */
function escaped(box) {
  if (box.layer.open.get()) {
    box.layer.dismiss('escape')
    return true
  }
  if (box.kind.editable && box.kind.clearsOnEscape && box.text.get() !== '') {
    box.clear()
    return true
  }
  return false
}

/**
 * Acts on a key typed in a combobox's field.
 * @template T, F
 * @param {Combobox<T, F>} box - The combobox
 * @param {string} key - The key, as `KeyboardEvent.key` names it
 * @param {ComboboxModifiers} modifiers - What was held
 * @returns {boolean} Whether it was used, so its default should be prevented
 */
function comboboxKey(box, key, modifiers) {
  if (key === 'Escape') {
    return escaped(box)
  }
  if (box.layer.open.get()) {
    return box.kind.editable ? openEditable(box, key, modifiers) : openSelect(box, key, modifiers)
  }
  return box.kind.editable ? closedEditable(box, key, modifiers) : closedSelect(box, key, modifiers)
}

export { comboboxKey }
