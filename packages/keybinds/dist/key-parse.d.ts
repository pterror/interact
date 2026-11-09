/**
 * Key bindings as strings, and key events as the lookups bindings are found by. A binding is modifiers and one key:
 * "$mod+k", "shift+slash", "Escape". More syntax is opt-in, each piece its own module: symbols() ("?"), aliases()
 * ("up", "plus"), printed() (any key typing a character). Syntax whose piece isn't given is an error naming it.
 */
export type Modifiers = Readonly<{
    ctrl: boolean;
    alt: boolean;
    shift: boolean;
    meta: boolean;
}>;
export type KeySyntax = Readonly<{
    alias?: (name: string) => string | undefined;
    accepts?: (key: string, mods: Modifiers) => boolean;
    shifted?: (key: string) => string | undefined;
    lookups?: (key: string, mods: Modifiers, held: Modifiers) => readonly string[];
    fallback?: (key: string, held: Modifiers) => readonly string[];
}>;
export type ParsedKey = Readonly<{
    lookup: string;
    bare: string;
    mods: Modifiers;
}>;
export type Query = Readonly<{
    exact: readonly string[];
    bare: readonly string[];
    mods: Modifiers;
}>;
export type KeyEvent = Readonly<{
    key: string;
    code: string;
    ctrlKey: boolean;
    altKey: boolean;
    shiftKey: boolean;
    metaKey: boolean;
}>;
/**
 * Parses one key binding, without a suffix or other steps
 * @param {string} binding - The binding: "ctrl+shift+k"
 * @param {readonly KeySyntax[]} [syntax] - The pieces of syntax on
 * @returns {ParsedKey} It normalized
 * @throws {Error} If it is empty, has no key or several, or a key that can't be bound with the syntax on
 */
declare function keyParse(binding: string, syntax?: readonly KeySyntax[]): ParsedKey;
/**
 * What a key event is looked up by
 * @param {KeyEvent} event - The event
 * @param {readonly KeySyntax[]} [syntax] - The pieces of syntax on
 * @returns {Query} Its lookups, best first; the same without modifiers; and the modifiers held
 */
declare function keyQuery(event: KeyEvent, syntax?: readonly KeySyntax[]): Query;
export { keyParse, keyQuery };
