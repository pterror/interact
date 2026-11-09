/**
 * Typed characters as keys in bindings: "?", "!", "/", "+" (written "plus" with aliases()). A binding to one fires
 * however it is typed: "?" takes Shift on most layouts, and still fires. A key syntax piece, for keyParse() and
 * keyQuery().
 */
export type Modifiers = Readonly<{
    ctrl: boolean;
    alt: boolean;
    shift: boolean;
    meta: boolean;
}>;
export type Symbols = Readonly<{
    accepts: (key: string) => boolean;
    shifted: (key: string) => string | undefined;
    lookups: (key: string, mods: Modifiers) => readonly string[];
}>;
/**
 * Typed characters, as a piece of key syntax
 * @returns {Symbols} The piece: any such character is a key; with Shift, a punctuation key means the physical key
 *   ("shift+/" is "shift+slash"); and a typed character is also looked up without the Shift it took
 */
declare function symbols(): Symbols;
export { symbols };
