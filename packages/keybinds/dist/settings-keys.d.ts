/**
 * The ids a settings panel shows, as render draws them: each id of the schema not hidden, bound or not, grouped by
 * category (in the order categories first come, `other` for none), in the schema's order within each.
 */
import type { StringsOption } from './strings.js';
export type Entry = Readonly<{
    category?: string;
    hidden?: boolean;
}>;
/** @import { StringsOption } from './strings.js' */
/** @typedef {Readonly<{ category?: string, hidden?: boolean }>} Entry */
/**
 * The ids to show
 * @param {Readonly<Record<string, Entry>>} schema - The schema
 * @param {StringsOption} [strings] - The words to show in place of English
 * @returns {Readonly<{ keys: () => readonly string[], watch: (listener: () => void) => () => void,
 *   groupOf: (id: string) => string }>} The Drawn (it never changes), and an id's category
 */
declare function settingsKeys(schema: Readonly<Record<string, Entry>>, strings?: StringsOption): Readonly<{
    keys: () => readonly string[];
    watch: (listener: () => void) => () => void;
    groupOf: (id: string) => string;
}>;
export { settingsKeys };
