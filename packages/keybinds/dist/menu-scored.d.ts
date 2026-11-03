/**
 * What the scored context menu shows: the commands matching what's typed, or its menu's commands ranked, cut to the
 * top few with a row that shows the rest.
 */
import type { Command, Context } from './command.js';
import type { ActiveCommand, Scorer } from './search.js';
export type ScoredView = Readonly<{
    context: Context;
    expanded: boolean;
    limit: number;
    menu: string;
    query: string;
    scorer: Scorer;
}>;
/**
 * What decides the scored menu's rows
 * @typedef {Readonly<{ context: Context, expanded: boolean, limit: number, menu: string, query: string, scorer: Scorer
 *   }>} ScoredView
 */
/**
 * The rows the scored menu shows, and how many more there are
 * @param {readonly Command[]} commands - The commands it picks from
 * @param {ScoredView} view - The app's state, whether the rest are shown, how many show before that, the menu's tag,
 *   what's typed, and the scorer
 * @returns {Readonly<{ hidden: number, rows: readonly ActiveCommand[] }>} The rows shown, and how many aren't
 */
declare function visibleRows(commands: readonly Command[], { context, expanded, limit, menu, query, scorer }: ScoredView): Readonly<{
    hidden: number;
    rows: readonly ActiveCommand[];
}>;
/**
 * The row that shows the rest when pointed at, focused or clicked, if any are hidden
 * @param {number} hidden - How many aren't shown
 * @param {() => void} expand - Shows them
 * @returns {HTMLLIElement[]} The row, or nothing
 */
declare function moreRow(hidden: number, expand: () => void): HTMLLIElement[];
export { moreRow, visibleRows };
