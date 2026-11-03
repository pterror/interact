/**
 * What a palette lists for a query: every visible command for none, otherwise its commands and what its source
 * answered that match, with only those that apply when it hides the rest.
 */
import type { Command, Context } from './command.js';
import type { Matcher, ScoredCommand } from './search.js';
export type PaletteSearch = Readonly<{
    answered: readonly Command[];
    commands: readonly Command[];
    context: Context;
    hideInactive: boolean;
    matcher: Matcher | undefined;
}>;
/**
 * What a palette lists for a query
 * @param {string} query - What was typed
 * @param {PaletteSearch} search - What's searched, and whether commands that don't apply are left out
 * @returns {ScoredCommand[]} The commands to list
 */
declare function paletteResults(query: string, search: PaletteSearch): ScoredCommand[];
export { paletteResults };
