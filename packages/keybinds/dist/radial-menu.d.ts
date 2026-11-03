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
 */
import type { Command, Context } from './command.js';
/** A radial menu */
declare class RadialMenu extends HTMLElement {
    #private;
    static kind: string;
    static observedAttributes: string[];
    /** Builds the menu's shadow DOM */
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
     * Follows its `open` attribute
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
export { RadialMenu };
