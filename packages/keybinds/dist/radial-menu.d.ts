/**
 * <keybinds-radial-menu>: up to eight commands evenly around a circle, so each direction becomes muscle memory. It has
 * no trigger of its own: the app opens it with openAt() and closes it with close().
 *
 * Properties: `commands` (the first eight), `context` (what `when` conditions see), `open`.
 *
 * Events: `command` (detail: { command }) when a command is chosen and run; `close` when it's dismissed.
 *
 * Parts: backdrop, container, spoke, slot, slot-active, slot-disabled, indicator, label. Colors come from
 * --radial-menu-active-color, -inactive-color, -disabled-color, -text-color and -spoke-color.
 *
 * The eight slots start at the top and go clockwise, each a dot with its label beside it. Labels on the right half sit
 * right of their dot, left-aligned; labels on the left half sit left of it, right-aligned; the top and bottom slots go
 * right. Arrows point: up is the top slot, right the right one, and so on, or the nearest filled slot to that when it's
 * empty; Tab and Shift+Tab go round the filled slots. Pointing at a slot only repaints the slots already there:
 * drawing them again would replace the one under the pointer, and a press that began on it would never become a click.
 */
import type { Command, Context } from './command.js';
/**
 * The slot a key makes active: the one an arrow points at or the filled slot nearest it, trying clockwise before
 * counter-clockwise at each distance; with Tab the next filled slot round from the active one, or the one before with
 * Shift
 * @param {Readonly<{ key: string, shiftKey: boolean }>} event - The key going down
 * @param {Readonly<{ active: number, filled: number }>} slots - The active slot (-1 for none), and how many are filled
 * @returns {number | undefined} The slot; -1 if the key moves but nothing is filled, undefined if it doesn't move
 */
declare function slotForKey({ key, shiftKey }: Readonly<{
    key: string;
    shiftKey: boolean;
}>, { active, filled }: Readonly<{
    active: number;
    filled: number;
}>): number | undefined;
/** A radial menu */
declare class RadialMenu extends HTMLElement {
    #private;
    static kind: string;
    static observedAttributes: string[];
    /** Builds the menu's shadow DOM: its SVG, holding a group for the spokes and one for the slots */
    constructor();
    /** @returns {void} */
    connectedCallback(): void;
    /** @returns {readonly Command[]} The commands in its slots */
    get commands(): readonly Command[];
    /** @param {readonly Command[]} commands - The commands; it shows the first eight */
    set commands(commands: readonly Command[]);
    /** @returns {Context} What `when` conditions see */
    get context(): Context;
    /** @param {Context} context - What `when` conditions see */
    set context(context: Context);
    /** @returns {boolean} Whether it's open */
    get open(): boolean;
    /** @param {boolean} open - Whether it's open */
    set open(open: boolean);
    /**
     * Follows its `open` attribute; opening starts over with nothing active and the pointer followed
     * @param {string} _name - The attribute, always `open`
     * @param {string | null} _previous - Its value before
     * @param {string | null} value - Its value now
     * @returns {void}
     */
    attributeChangedCallback(_name: string, _previous: string | null, value: string | null): void;
    /**
     * Opens it around a point, the viewport's centre if none is given
     * @param {Readonly<{ x?: number, y?: number }>} [point] - Where, in viewport pixels
     * @returns {void}
     */
    openAt(point?: Readonly<{
        x?: number;
        y?: number;
    }>): void;
    /**
     * Dismisses it
     * @returns {void}
     */
    close(): void;
}
export { RadialMenu, slotForKey };
