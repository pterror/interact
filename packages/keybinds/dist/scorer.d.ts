/**
 * The default ranking for menus: commands that apply only in some context first, then the ones run recently.
 */
import type { HistoryEntry, Scorer } from './search.js';
/**
 * The default scorer: specificity, then frecency. A command whose `when` holds scores 2, one with no `when` 1, and
 * one whose `when` fails 0 with no boost. Commands run in the last minute add 3, five minutes 2, half an hour 1
 * @param {readonly HistoryEntry[]} [history] - When commands were run
 * @returns {Scorer} The scorer
 */
declare function defaultScorer(history?: readonly HistoryEntry[]): Scorer;
export { defaultScorer };
