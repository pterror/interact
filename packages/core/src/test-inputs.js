/**
 * Inputs as a host makes them, for tests: UI Events with the fields the contract carries, and the host's answers
 */

/** @import { Answer, Click, Key, KeyDown, Pointer } from './contract.js' */

const NO_MODIFIERS = { altKey: false, ctrlKey: false, metaKey: false, shiftKey: false }

/**
 * A key pressed on a part
 * @param {string} part - The part
 * @param {string} key - The UI Events key value
 * @param {Readonly<Partial<KeyDown>>} more - Modifiers, the item, the time
 * @returns {KeyDown} The input
 */
function keydown(part, key, more = {}) {
  return { ...NO_MODIFIERS, item: null, key, part, timeStamp: 0, type: 'keydown', ...more }
}

/**
 * A click on a part
 * @param {string} part - The part
 * @param {Key | null} item - The item it is drawn for
 * @returns {Click} The input
 */
function click(part, item = null) {
  return { ...NO_MODIFIERS, item, part, timeStamp: 0, type: 'click' }
}

/**
 * A pointer event on a part
 * @param {Pointer['type']} type - Which
 * @param {string} part - The part
 * @param {Key | null} item - The item it is drawn for
 * @param {readonly [number, number]} at - `clientX`, `clientY`
 * @returns {Pointer} The input
 */
function pointer(type, part, item, [clientX, clientY]) {
  return { button: 0, clientX, clientY, item, part, pointerId: 1, pointerType: 'mouse', timeStamp: 0, type }
}

/**
 * The host's answer: the keys at ranks `[from, to)` of a collection in memory
 * @param {number} id - The ask's id
 * @param {readonly Key[]} all - The collection
 * @param {readonly [number, number]} ranks - The ranks asked for
 * @returns {Answer} The answer
 */
function answer(id, all, [from, to]) {
  return { count: all.length, from, id, keys: all.slice(from, to), type: 'answer' }
}

export { answer, click, keydown, pointer }
