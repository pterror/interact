/**
 * Punctuation keys, and the name of the physical key that types each on a US layout (`event.code`, lowercase): what
 * a binding with Shift means by one ("shift+/" is "shift+slash"), and how a key is named for showing it.
 */

/** @type {ReadonlyMap<string, string>} */
const punctuation = new Map([
  ["'", 'quote'],
  [',', 'comma'],
  ['-', 'minus'],
  ['.', 'period'],
  ['/', 'slash'],
  [';', 'semicolon'],
  ['=', 'equal'],
  ['[', 'bracketleft'],
  ['\\', 'backslash'],
  [']', 'bracketright'],
  ['`', 'backquote'],
])

export { punctuation }
