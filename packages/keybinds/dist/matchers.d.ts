/**
 * Matching a query against text, for searching commands: by substring, or by letters in order, with where they matched
 * for highlighting.
 */
import type { MatchResult } from './search.js';
/**
 * Matches a query as a substring, ignoring case: starting the text scores more than inside it
 * @param {string} query - What was typed
 * @param {string} text - What to match it in
 * @returns {MatchResult | undefined} The match, or undefined if the text doesn't contain it
 */
declare function simpleMatcher(query: string, text: string): MatchResult | undefined;
export type Letters = Readonly<{
    lowerText: string;
    positions: readonly number[];
    query: string;
    text: string;
}>;
/**
 * Matches a query's letters in order anywhere in the text, ignoring case. Scores letters in a row, at a word's start
 * and in the same case, how much of the text they cover, and the query found whole; gives where each letter matched
 * @param {string} query - What was typed
 * @param {string} text - What to match it in
 * @returns {MatchResult | undefined} The match, or undefined if some letter isn't there
 */
declare function fuzzyMatcher(query: string, text: string): MatchResult | undefined;
export { fuzzyMatcher, simpleMatcher };
