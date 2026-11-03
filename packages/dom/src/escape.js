const TEXT = new Map([
  ['&', '&amp;'],
  ['<', '&lt;'],
  ['>', '&gt;'],
])
const ATTRIBUTE = new Map([...TEXT, ['"', '&quot;']])

/**
 * Text as HTML shows it.
 * @param {string} text - Any text
 * @returns {string} The markup for it
 */
function escapeText(text) {
  return text.replaceAll(/[&<>]/gu, (char) => TEXT.get(char) ?? char)
}

/**
 * Text as it goes between an attribute's double quotes.
 * @param {string} text - Any text
 * @returns {string} The markup for it
 */
function escapeAttribute(text) {
  return text.replaceAll(/[&<>"]/gu, (char) => ATTRIBUTE.get(char) ?? char)
}

export { escapeAttribute, escapeText }
