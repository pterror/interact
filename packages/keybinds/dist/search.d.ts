/**
 * Searching, ranking and grouping commands, for the palette, cheatsheet and menus. Results wrap each command with
 * whether it applies now (and, from a search, how well it matched), leaving the command itself as given.
 */
import type { BindingField, Command, Context } from './command.js';
export type MatchResult = Readonly<{
    positions?: readonly number[];
    score: number;
}>;
export type Matcher = (query: string, text: string) => MatchResult | undefined;
export type HistoryEntry = Readonly<{
    id: string;
    timestamp: number;
}>;
export type Scorer = (command: Command, context: Context) => number;
export type SearchOptions = Readonly<{
    context?: Context | undefined;
    matcher?: Matcher | undefined;
    scorer?: Scorer | undefined;
}>;
export type ActiveCommand = Readonly<{
    active: boolean;
    command: Command;
}>;
export type ScoredCommand = Readonly<{
    active: boolean;
    command: Command;
    positions?: readonly number[];
    score: number;
}>;
/**
 * Searches commands, each id once (the last registered): fuzzy matching unless told otherwise, with a scorer's
 * ranking added on
 * @param {readonly Command[]} commands - The commands
 * @param {string} query - What was typed
 * @param {SearchOptions} [options] - The app's state, a matcher, and a scorer
 * @returns {ScoredCommand[]} Matches, most relevant first: active ones, then by rank, then by score
 */
declare function searchCommands(commands: readonly Command[], query: string, options?: SearchOptions): ScoredCommand[];
/**
 * Commands grouped by category, each id once (the last registered), leaving out hidden ones and ones with no bindings
 * @param {readonly Command[]} commands - The commands
 * @param {Context} [context] - The app's state, for which apply
 * @param {readonly BindingField[]} [fields] - The command fields that hold bindings
 * @returns {Record<string, ActiveCommand[]>} The commands, by category ("Other" for none)
 */
declare function groupByCategory(commands: readonly Command[], context?: Context, fields?: readonly BindingField[]): Record<string, ActiveCommand[]>;
/**
 * The commands in a menu, each id once (the last registered), leaving out hidden ones
 * @param {readonly Command[]} commands - The commands
 * @param {string} menu - The menu's tag
 * @param {Context} [context] - The app's state, for which apply
 * @returns {ActiveCommand[]} The menu's commands
 */
declare function filterByMenu(commands: readonly Command[], menu: string, context?: Context): ActiveCommand[];
export { filterByMenu, groupByCategory, searchCommands };
