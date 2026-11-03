/**
 * The palette's list of matches: an option for each, which one is active, and what the pointer and keys do to it.
 */
import type { InputUI } from './input.js';
import type { ScoredCommand } from './search.js';
/** The list of matches in a palette, and which is active */
declare class PaletteList {
    #private;
    /**
     * Lists matches in a list element
     * @param {HTMLUListElement} list - Where the options go
     * @param {(index: number) => void} choose - Runs the match at an index
     */
    constructor(list: HTMLUListElement, choose: (index: number) => void);
    /** @returns {number} Which match is active */
    get active(): number;
    /** @returns {readonly ScoredCommand[]} The matches shown */
    get results(): readonly ScoredCommand[];
    /**
     * Shows matches, the first active
     * @param {readonly ScoredCommand[]} results - The matches
     * @param {readonly InputUI[]} inputs - How bindings are shown
     * @returns {void}
     */
    show(results: readonly ScoredCommand[], inputs: readonly InputUI[]): void;
    /**
     * Moves the active match by keys: down or up a step, wrapping, or to either end
     * @param {'down' | 'end' | 'home' | 'up'} where - Which way
     * @returns {void}
     */
    move(where: 'down' | 'end' | 'home' | 'up'): void;
    /**
     * Starts over in keyboard mode, as on opening
     * @returns {void}
     */
    reset(): void;
    /**
     * Hears the pointer: moving it, over an option, and clicking one
     * @param {Event} event - A click, mousemove or mouseover
     * @returns {void}
     */
    handleEvent(event: Event): void;
}
export { PaletteList };
