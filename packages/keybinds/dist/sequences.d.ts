/**
 * Bindings of several steps, written with spaces: "g i", "ctrl+k ctrl+s", "k k" for a double tap. Each step must
 * come within `timeout` of the last. A step that starts a sequence is the sequence's: it doesn't reach the page, and
 * it can't also be a binding of its own.
 */
import type { Command } from './command.js';
export type Step = Readonly<{
    found: readonly Command[] | undefined;
    pending: boolean;
}>;
export type SequenceTable = Readonly<{
    add: (steps: readonly string[], command: Command) => void;
    check: (lookups: Iterable<string>) => void;
    resolve: (lookups: readonly string[], find: (lookups: readonly string[]) => readonly Command[] | undefined, starts: (commands: readonly Command[]) => boolean) => Step;
}>;
export type Sequences = Readonly<{
    steps: (binding: string, suffix: string) => readonly string[];
    table: () => SequenceTable;
}>;
export type Lookup = Readonly<{
    find: (lookups: readonly string[]) => readonly Command[] | undefined;
    now: number;
    starts: (commands: readonly Command[]) => boolean;
}>;
/**
 * For keybinds({ sequences: sequences() })
 * @param {Readonly<{ timeout?: number }>} [options] - Most ms between steps (default 1000)
 * @returns {Sequences} What keybinds() splits and resolves sequences with
 */
declare function sequences({ timeout }?: Readonly<{
    timeout?: number;
}>): Sequences;
export { sequences };
