/**
 * The ids a settings panel shows, as render draws them: each id of the schema not hidden, bound or not, grouped by
 * category (in the order categories first come, "Other" for none), in the schema's order within each.
 */
export type Entry = Readonly<{
    category?: string;
    hidden?: boolean;
}>;
/**
 * The ids to show
 * @param {Readonly<Record<string, Entry>>} schema - The schema
 * @returns {Readonly<{ keys: () => readonly string[], watch: (listener: () => void) => () => void,
 *   groupOf: (id: string) => string }>} The Drawn (it never changes), and an id's category
 */
declare function settingsKeys(schema: Readonly<Record<string, Entry>>): Readonly<{
    keys: () => readonly string[];
    watch: (listener: () => void) => () => void;
    groupOf: (id: string) => string;
}>;
export { settingsKeys };
