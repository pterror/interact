/**
 * How an item's text is compared with what someone types: from its start, ignoring case and accents, as the person's
 * language compares text in a search.
 */

/** @type {Intl.Collator | undefined} */
let collator = undefined
const START = 0
const SAME = 0

/**
 * Whether a text starts with what was typed, ignoring case and accents ("Émile" starts with "em").
 * @param {string} text - An item's text
 * @param {string} typed - What was typed
 * @returns {boolean} Whether it starts with it
 */
function startsWithTyped(text, typed) {
  collator ??= new Intl.Collator(undefined, { sensitivity: 'base', usage: 'search' })
  const wanted = typed.normalize('NFC')
  return collator.compare(text.normalize('NFC').trimStart().slice(START, wanted.length), wanted) === SAME
}

/**
 * What an item is called when nobody says: a string or number as itself, anything else as nothing.
 * @param {unknown} item - The item
 * @returns {string} Its text
 */
function plainText(item) {
  return typeof item === 'string' || typeof item === 'number' ? String(item) : ''
}

export { plainText, startsWithTyped }
