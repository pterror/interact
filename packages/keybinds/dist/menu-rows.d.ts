/**
 * Which commands a context menu shows: those tagged with its menu, or every one not hidden, each with whether it
 * applies now; and, for the scored menu, ranked by a scorer.
 */
import type { Command, Context } from './command.js';
import type { ActiveCommand, Scorer } from './search.js';
/**
 * A menu's commands: those its tag picks, or every one not hidden when it has none
 * @param {readonly Command[]} commands - The commands
 * @param {Readonly<{ context: Context, menu: string }>} where - The app's state, and the menu's tag ("" for none)
 * @returns {ActiveCommand[]} The commands, and whether each applies
 */
declare function menuRows(commands: readonly Command[], { context, menu }: Readonly<{
    context: Context;
    menu: string;
}>): ActiveCommand[];
export type Scored = Readonly<{
    row: ActiveCommand;
    score: number;
}>;
/**
 * Commands ranked: those that apply first, then by score, keeping their order otherwise. A command the scorer gives
 * nothing is left out if it has a condition; one without always stays
 * @param {readonly ActiveCommand[]} rows - The commands, and whether each applies
 * @param {Readonly<{ context: Context, scorer: Scorer }>} by - The app's state, and the scorer
 * @returns {ActiveCommand[]} Them, ranked
 */
declare function rankedRows(rows: readonly ActiveCommand[], { context, scorer }: Readonly<{
    context: Context;
    scorer: Scorer;
}>): ActiveCommand[];
export { menuRows, rankedRows };
