/**
 * <keybinds-command-palette>: commands found by typing, and run by choosing one.
 *
 * Attributes: `open`; `auto-trigger` ($mod+K toggles it); `placeholder` (default "Type a command..."); `hide-inactive`
 * (list only commands that apply now, rather than showing the rest disabled).
 *
 * Properties: `commands`, `context` (what `when` conditions see), `matcher`, `inputs` (how bindings are shown; default
 * keys only), `source` (further commands for a non-empty query, merged with `commands`), `sourceDelay` (ms of typing
 * pause before `source` is asked; default 200), `open`.
 *
 * Events: `execute` (detail: { command }) when a command is chosen and run; `close` when it's dismissed.
 *
 * Classes: .palette, __backdrop, __dialog, __input, __list, __item (--active, --disabled), __item-label,
 * __item-label-match, __item-description, __item-category, __item-keys, __item-key, __empty.
 */
import type { Command, Context } from './command.js';
import type { InputUI } from './input.js';
import type { PaletteSource } from './palette-source.js';
import type { Matcher } from './search.js';
/** A command palette */
declare class CommandPalette extends HTMLElement {
    #private;
    static kind: string;
    static observedAttributes: string[];
    /**
     * How bindings are shown: a match shows its first
     * @type {readonly InputUI[]}
     */
    inputs: readonly InputUI[];
    /** Milliseconds of typing pause before `source` is asked */
    sourceDelay: number;
    /** Builds the palette's shadow DOM */
    constructor();
    /** @returns {readonly Command[]} The commands to search */
    get commands(): readonly Command[];
    /** @param {readonly Command[]} commands - The commands to search */
    set commands(commands: readonly Command[]);
    /** @returns {Context} What `when` conditions see */
    get context(): Context;
    /** @param {Context} context - What `when` conditions see */
    set context(context: Context);
    /** @returns {Matcher | undefined} How queries match, if not the default */
    get matcher(): Matcher | undefined;
    /** @param {Matcher | undefined} matcher - How queries match, undefined for the default */
    set matcher(matcher: Matcher | undefined);
    /** @returns {PaletteSource | undefined} Where further commands come from */
    get source(): PaletteSource | undefined;
    /** @param {PaletteSource | undefined} source - Where further commands come from */
    set source(source: PaletteSource | undefined);
    /** @returns {boolean} Whether it's open */
    get open(): boolean;
    /** @param {boolean} open - Whether it's open */
    set open(open: boolean);
    /**
     * Follows its attributes
     * @param {string} name - Which changed
     * @param {string | null} _previous - Its value before
     * @param {string | null} value - Its value now
     * @returns {void}
     */
    attributeChangedCallback(name: string, _previous: string | null, value: string | null): void;
    /** @returns {void} */
    connectedCallback(): void;
    /** @returns {void} */
    disconnectedCallback(): void;
}
export { CommandPalette };
