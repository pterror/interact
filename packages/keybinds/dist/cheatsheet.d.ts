/**
 * <keybinds-cheatsheet>: every command's bindings, grouped by category, those that don't apply now grayed out.
 *
 * Attributes: `open`; `auto-trigger` (open while a modifier is held on its own; tapping it twice keeps it open);
 * `trigger-key` (the modifier: $mod by default, which is Meta on Mac and Control elsewhere, or Control, Alt, Shift,
 * Meta); `trigger-delay` (how long to hold it before opening, in ms; default 1000).
 *
 * Properties: `commands`, `context` (what `when` conditions see), `open`, `inputs` (which bindings are shown, and how;
 * default keys only).
 *
 * Events: `open` when it opens, however that happened; `close` when it's dismissed.
 *
 * Held open by its trigger, it shows while the modifier is held; tapping the modifier twice keeps it open, and tapping
 * twice again, Escape or a click outside closes it.
 *
 * Classes: .cheatsheet, __backdrop, __dialog, __group, __group-title, __list, __item (--disabled), __item-label,
 * __item-keys, __item-binding, __item-key.
 */
import type { ActiveCommand, BindingField, Command, Context } from './command.js';
import type { InputUI } from './input.js';
/**
 * The commands to show, by category: each id once (the last given), leaving out hidden commands and those with no
 * bindings through `fields`
 * @param {readonly Command[]} commands - The commands
 * @param {Context} [context] - The app's state, for whether each applies (default: empty)
 * @param {readonly BindingField[]} [fields] - Which bindings count (default: keys, mouse and gamepad)
 * @returns {Record<string, ActiveCommand[]>} The commands, by category ("Other" for none)
 */
declare function groupByCategory(commands: readonly Command[], context?: Context, fields?: readonly BindingField[]): Record<string, ActiveCommand[]>;
/** A cheatsheet of bindings */
declare class KeybindCheatsheet extends HTMLElement {
    #private;
    static kind: string;
    static observedAttributes: string[];
    /** Builds the cheatsheet's shadow DOM */
    constructor();
    /** @returns {readonly InputUI[]} Which bindings are shown, and how */
    get inputs(): readonly InputUI[];
    /** @param {readonly InputUI[]} inputs - Which bindings are shown, and how */
    set inputs(inputs: readonly InputUI[]);
    /** @returns {readonly Command[]} The commands shown */
    get commands(): readonly Command[];
    /** @param {readonly Command[]} commands - The commands shown */
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
export { KeybindCheatsheet, groupByCategory };
