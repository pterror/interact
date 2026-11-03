/**
 * <keybinds-context-menu>: a context menu of commands, ranked by a scorer, with a search above them. It shows the top
 * `maxVisible` (default 7), and a "▾ N more" row below them shows the rest when pointed at, focused or clicked.
 *
 * Attributes: `open`; `auto-trigger` (open where the target is right-clicked); `menu` (the tag that picks its
 * commands); `target` (a selector for what's right-clicked; default its parent).
 *
 * Properties: `commands`, `context` (what `when` conditions see), `open`, `menu`, `position` ({ x, y } in viewport
 * pixels), `scorer` (how commands rank; default `defaultScorer(history)`), `history` (when commands were run, for the
 * default scorer), `maxVisible`, `inputs` (how bindings are shown; default keys only).
 *
 * Events: `execute` (detail: { command }) when a command is chosen and run; `close` when it's dismissed.
 *
 * Parts: search, context-menu, backdrop, list, separator, item (item-active, item-disabled), item-label, item-keys,
 * item-key, more-row.
 */
import type { Command, Context } from './command.js';
import type { InputUI } from './input.js';
import type { Point } from './menu-place.js';
import type { HistoryEntry, Scorer } from './search.js';
/** A context menu of ranked commands, with a search */
declare class ContextMenu extends HTMLElement {
    #private;
    static kind: string;
    static observedAttributes: string[];
    /**
     * How bindings are shown: an item shows its first
     * @type {readonly InputUI[]}
     */
    inputs: readonly InputUI[];
    /** Builds the menu's shadow DOM */
    constructor();
    /** @returns {readonly Command[]} The commands it picks from */
    get commands(): readonly Command[];
    /** @param {readonly Command[]} commands - The commands it picks from */
    set commands(commands: readonly Command[]);
    /** @returns {Context} What `when` conditions see */
    get context(): Context;
    /** @param {Context} context - What `when` conditions see */
    set context(context: Context);
    /** @returns {string} The tag that picks its commands, "" for every one not hidden */
    get menu(): string;
    /** @param {string} menu - The tag that picks its commands, "" for every one not hidden */
    set menu(menu: string);
    /** @returns {boolean} Whether it's open */
    get open(): boolean;
    /** @param {boolean} open - Whether it's open */
    set open(open: boolean);
    /** @returns {Point} Where it opens, in viewport pixels */
    get position(): Point;
    /** @param {Point} position - Where it opens, in viewport pixels */
    set position(position: Point);
    /** @returns {Scorer} How commands rank */
    get scorer(): Scorer;
    /** @param {Scorer | undefined} scorer - How commands rank, undefined for the default over `history` */
    set scorer(scorer: Scorer | undefined);
    /** @returns {readonly HistoryEntry[]} When commands were run, for the default scorer */
    get history(): readonly HistoryEntry[];
    /** @param {readonly HistoryEntry[]} history - When commands were run, for the default scorer */
    set history(history: readonly HistoryEntry[]);
    /** @returns {number} How many it shows before "N more" */
    get maxVisible(): number;
    /** @param {number} count - How many it shows before "N more"; anything but a positive number means 7 */
    set maxVisible(count: number);
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
export { ContextMenu };
