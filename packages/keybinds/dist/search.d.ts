/**
 * Searching, ranking and grouping commands, for the palette, cheatsheet and menus.
 */
export type Command = import('./command.js').Command;
export type MatchResult = {
    score: number;
    positions?: number[];
};
export type Matcher = (query: string, text: string) => MatchResult | null;
export type HistoryEntry = {
    id: string;
    timestamp: number;
};
export type Scorer = (command: Command, context: unknown) => number;
export type SearchOptions = {
    matcher?: Matcher | undefined;
    scorer?: Scorer | undefined;
};
export type ScoredCommand = Command & {
    active: boolean;
    score: number;
    positions?: number[];
};
/**
 * Search commands with a given matcher
 *
 * - Dedupes by ID (last registration wins - inner scope shadows outer)
 *
 * @param {Command[]} commands - Array of command definitions
 * @param {string} query - Search query
 * @param {Record<string, unknown>} context - Current context
 * @param {Matcher} matcher - Matcher function to score results
 * @returns {ScoredCommand[]} Matching commands sorted by relevance (active first, then by score)
 */
export declare function matchCommands(commands: Command[], query: string, context: Record<string, unknown>, matcher: Matcher): ScoredCommand[];
/**
 * Search commands for command palette (defaults to fuzzy matching)
 *
 * @param {Command[]} commands - Array of command definitions
 * @param {string} query - Search query
 * @param {Record<string, unknown>} [context] - Current context
 * @param {SearchOptions} [options] - Search options (e.g., custom matcher, scorer)
 * @returns {ScoredCommand[]} Matching commands sorted by relevance (active first, then by score)
 */
export declare function searchCommands(commands: Command[], query: string, context?: Record<string, unknown>, options?: SearchOptions): ScoredCommand[];
/**
 * Default scorer — combines specificity and frecency.
 *
 * Specificity: commands with a `when` condition score higher (score 2 if
 * `when(ctx)` is true, score 1 for commands with no condition).
 *
 * Frecency: if history entries are supplied, recently-executed commands
 * receive an additive boost:
 *   - within last 60 s  → +3
 *   - within last 5 min → +2
 *   - within last 30 min → +1
 *
 * @param {HistoryEntry[]} [history]
 * @returns {Scorer}
 */
export declare function defaultScorer(history?: HistoryEntry[]): Scorer;
/**
 * Group commands by category
 *
 * - Dedupes by ID (last registration wins)
 * - Excludes commands with no bindings
 *
 * @param {Command[]} commands - Array of command definitions
 * @param {Record<string, unknown>} [context] - Current context (for active state)
 * @param {string[]} [fields] - The command fields that hold bindings
 * @returns {Record<string, (Command & { active: boolean })[]>} Commands grouped by category
 */
export declare function groupByCategory(commands: Command[], context?: Record<string, unknown>, fields?: string[]): Record<string, (Command & {
    active: boolean;
})[]>;
/**
 * Filter commands by menu tag
 *
 * - Dedupes by ID (last registration wins)
 *
 * @param {Command[]} commands - Array of command definitions
 * @param {string} menu - Menu tag to filter by
 * @param {Record<string, unknown>} [context] - Current context (for active state)
 * @returns {(Command & { active: boolean })[]} Matching commands
 */
export declare function filterByMenu(commands: Command[], menu: string, context?: Record<string, unknown>): (Command & {
    active: boolean;
})[];
/**
 * Simple substring matcher (case-insensitive)
 *
 * Scores by position: startsWith > includes
 *
 * @type {Matcher}
 */
export declare function simpleMatcher(query: string, text: string): MatchResult | null;
/**
 * Fuzzy sequential character matcher
 *
 * Matches if all query chars appear in order in text.
 * Scores based on consecutive matches and word-start bonuses.
 * Returns positions for highlighting.
 *
 * @type {Matcher}
 */
export declare function fuzzyMatcher(query: string, text: string): MatchResult | null;
