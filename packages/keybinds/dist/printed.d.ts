/**
 * The key name `printed`: any key that types one character with no Ctrl, Alt or Meta held (Shift allowed), Space
 * too. A handler bound to it gets the event, and so the character (`event.key`): typeahead binds to it. It is a
 * fallback lookup, found after every other, so a binding to the key itself comes first, and leaves the key to `printed` when it
 * doesn't apply. A key syntax piece, for keyParse() and keyQuery().
 */
export type Modifiers = Readonly<{
    ctrl: boolean;
    alt: boolean;
    shift: boolean;
    meta: boolean;
}>;
export type Printed = Readonly<{
    accepts: (key: string, mods: Modifiers) => boolean;
    fallback: (key: string, held: Modifiers) => readonly string[];
}>;
/**
 * Typing a character, as a piece of key syntax
 * @returns {Printed} The piece: `printed` is a key, bound with no modifiers; a key event typing one character has
 *   the lookup `printed`
 */
declare function printed(): Printed;
export { printed };
