/**
 * What the widgets' announcements say, in English, by message id. An app in another language, or wanting other words,
 * passes its own for any of them; a message's values are as the widget sent them, and `name` names an item.
 */

import { isRecord } from './compose.js'

/** @import { Out } from './compose.js' */
/** @import { Data, Key } from './contract.js' */

/**
 * @typedef {Readonly<{ [message: string]: (values: Readonly<{ [field: string]: Data }>, name: (key: Key) => string) => string }>} Words
 */

/**
 * A value as a key, for `name`
 * @param {Data | undefined} value - The value
 * @returns {Key} The key, or `''`
 */
function keyOf(value) {
  return typeof value === 'string' || typeof value === 'number' ? value : ''
}

/** @type {Words} */
const english = {
  cancelled: (values, name) => `Moving ${name(keyOf(values['item']))} cancelled`,
  moved: (values, name) =>
    `${name(keyOf(values['item']))} moved to position ${String(keyOf(values['position']))} of ${String(keyOf(values['count']))}`,
  refused: (values, name) => `${name(keyOf(values['item']))} could not be moved, and is back where it was`,
}

/**
 * The words for a message
 * @param {Words} words - The app's words, over the English ones
 * @param {string} message - The message id
 * @param {Readonly<{ [field: string]: Data }>} values - What it is about
 * @param {(key: Key) => string} name - The host's name for an item
 * @returns {string} What to say; the message id itself when nothing words it
 */
function say(words, message, values, name) {
  const word = words[message] ?? english[message]
  return word === undefined ? message : word(values, name)
}

/**
 * What an `announce` effect says, worded
 * @param {Out} out - The effect
 * @param {Words} words - The app's words
 * @param {(key: Key) => string} name - An item's name
 * @returns {string} The words
 */
function announcement(out, words, name) {
  const { effect } = out
  if (!isRecord(effect) || typeof effect['message'] !== 'string' || !isRecord(effect['values'])) {
    return ''
  }
  /** @type {{ [field: string]: Data }} */
  const values = {}
  for (const [field, value] of Object.entries(effect['values'])) {
    values[field] = typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? value : null
  }
  return say(words, effect['message'], values, name)
}

export { announcement, english, say }
