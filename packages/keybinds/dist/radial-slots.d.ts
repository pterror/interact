/**
 * The radial menu's slots: drawn for the commands it shows, which one is active, and what the pointer does to them.
 * Pointing at a slot only repaints the slots already there: drawing them again would replace the one under the
 * pointer, and a press that began on it would never become a click.
 */
import type { ActiveCommand } from './search.js';
/** A radial menu's slots, and which is active */
declare class RadialSlots {
    #private;
    /**
     * Slots drawn into two SVG groups
     * @param {SVGGElement} spokes - Where the spokes go
     * @param {SVGGElement} slots - Where the slots go
     * @param {(slot: number) => void} choose - Runs the command in a slot
     */
    constructor(spokes: SVGGElement, slots: SVGGElement, choose: (slot: number) => void);
    /** @returns {readonly ActiveCommand[]} The commands in the slots, in order from the top */
    get entries(): readonly ActiveCommand[];
    /** @returns {number} The active slot, -1 for none */
    get active(): number;
    /**
     * Draws the slots for some commands, the first at the top
     * @param {readonly ActiveCommand[]} entries - The commands, and whether each applies
     * @returns {void}
     */
    show(entries: readonly ActiveCommand[]): void;
    /**
     * Makes a slot active from the keys; the pointer is ignored from then on, until reset
     * @param {number} slot - Which
     * @returns {void}
     */
    choose(slot: number): void;
    /**
     * Starts over as on opening: nothing active, the pointer followed
     * @returns {void}
     */
    reset(): void;
    /**
     * Hears the pointer on a slot: clicking it, entering and leaving it
     * @param {Event} event - A click, mouseenter or mouseleave on a slot
     * @returns {void}
     */
    handleEvent(event: Event): void;
}
export { RadialSlots };
