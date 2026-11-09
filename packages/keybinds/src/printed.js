/**
 * The key name `printed`: any key that types one character with no Ctrl, Alt or Meta held (Shift allowed), Space
 * too. A handler bound to it gets the event, and so the character (`event.key`): typeahead binds to it. It is a
 * fallback lookup, found after every other, so a binding to the key itself comes first, and leaves the key to `printed` when it
 * doesn't apply. A key syntax piece, for keyParse() and keyQuery().
 */

/**
 * @typedef {Readonly<{ ctrl: boolean, alt: boolean, shift: boolean, meta: boolean }>} Modifiers
 */

/**
 * @typedef {Readonly<{
 *   accepts: (key: string, mods: Modifiers) => boolean,
 *   fallback: (key: string, held: Modifiers) => readonly string[],
 * }>} Printed
 */

const NAME = 'printed'

/**
 * Whether any modifier but Shift is among some
 * @param {Modifiers} mods - The modifiers
 * @returns {boolean} Whether Ctrl, Alt or Meta is
 */
function commanding(mods) {
  return mods.ctrl || mods.alt || mods.meta
}

/**
 * Typing a character, as a piece of key syntax
 * @returns {Printed} The piece: `printed` is a key, bound with no modifiers; a key event typing one character has
 *   the lookup `printed`
 */
function printed() {
  return {
    accepts: (key, mods) => key === NAME && !commanding(mods) && !mods.shift,
    fallback: (key, held) => (/^.$/su.test(key) && !commanding(held) ? [NAME] : []),
  }
}

export { printed }
