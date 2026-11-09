/**
 * The ids a cheatsheet shows, as render draws them: while it is open, each id not hidden that has a binding, grouped by
 * category (in the order categories first come, "Other" for none), in the schema's order within each; nothing while
 * it is closed.
 */
export type Entry = Readonly<{
    category?: string;
    hidden?: boolean;
    keys?: readonly string[];
    mouse?: readonly string[];
    pad?: readonly string[];
    axes?: readonly string[];
}>;
export type Watched<T> = Readonly<{
    get: () => T;
    watch: (listener: () => void) => () => void;
}>;
export type CheatsheetKeysOptions = Readonly<{
    bindings: Watched<Readonly<Record<string, Entry>>>;
    open: Watched<boolean>;
}>;
/**
 * The ids to show
 * @param {CheatsheetKeysOptions} options - The bindings in effect, by id; and whether the cheatsheet is open
 * @returns {Readonly<{ keys: () => readonly string[], watch: (listener: () => void) => () => void,
 *   groupOf: (id: string) => string }>} The Drawn, and an id's category
 */
declare function cheatsheetKeys({ bindings, open }: CheatsheetKeysOptions): Readonly<{
    keys: () => readonly string[];
    watch: (listener: () => void) => () => void;
    groupOf: (id: string) => string;
}>;
export { cheatsheetKeys };
