/**
 * Asking a palette's `source` for further commands: once typing pauses, and only keeping an answer for the query
 * still typed.
 */
import type { Command } from './command.js';
export type PaletteSource = (query: string) => readonly Command[] | Promise<readonly Command[]>;
export type Question = Readonly<{
    delay: number;
    source: PaletteSource;
    still: (query: string) => boolean;
}>;
/** What a palette's source answered for the query typed */
declare class SourceAnswers {
    #private;
    /**
     * Keeps answers, telling the palette when one arrives
     * @param {() => void} changed - Called when an answer for the query typed arrives
     */
    constructor(changed: () => void);
    /** @returns {readonly Command[]} What the source answered for the query typed, none until it does */
    get commands(): readonly Command[];
    /**
     * Forgets the answer, and asks again once typing pauses
     * @param {string} query - What was typed; nothing is asked for an empty query
     * @param {Question} question - Where to ask, how long to wait, and whether the query is still typed
     * @returns {void}
     */
    ask(query: string, question: Question): void;
    /**
     * Forgets the answer, and any question still waiting
     * @returns {void}
     */
    clear(): void;
}
export { SourceAnswers };
