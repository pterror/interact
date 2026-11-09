/**
 * Short names for keys in bindings: "up", "down", "left", "right" for the arrow keys, and "plus" for "+" (which
 * separates a binding's parts, so it can't be written as itself; needs symbols()). A key syntax piece, for
 * keyParse().
 */
/** @type {ReadonlyMap<string, string>} */
declare const keyAliases: ReadonlyMap<string, string>;
/**
 * The short names, as a piece of key syntax
 * @returns {Readonly<{ alias: (name: string) => string | undefined }>} The piece: the key a name stands for
 */
declare function aliases(): Readonly<{
    alias: (name: string) => string | undefined;
}>;
export { aliases, keyAliases };
