export type Command = import('../command.js').Command;
export type Input = import('../input.js').InputUI;
export type Scorer = import('../search.js').Scorer;
export type HistoryEntry = import('../search.js').HistoryEntry;
export type ScoredCommand = import('../search.js').ScoredCommand;
/** @typedef {import('../command.js').Command} Command */
/** @typedef {import('../input.js').InputUI} Input */
/** @typedef {import('../search.js').Scorer} Scorer */
/** @typedef {import('../search.js').HistoryEntry} HistoryEntry */
/** @typedef {import('../search.js').ScoredCommand} ScoredCommand */
/**
 * <keybinds-context-menu> - Scored, searchable context menu driven by commands
 *
 * Shows top `maxVisible` items (default: 7) scored via the scorer (default:
 * `defaultScorer()`). A search input at the top filters and re-scores. When
 * more items exist than `maxVisible`, a subtle "▾ N more" row at the bottom
 * reveals them on hover/focus with a smooth height transition.
 *
 * Attributes:
 *   open         - Show/hide the menu
 *   auto-trigger - Wire contextmenu event on target element
 *   menu         - Menu tag to filter commands by
 *   target       - CSS selector for contextmenu target (defaults to parentElement)
 *
 * Properties:
 *   commands: Command[]           - Array of command definitions
 *   context: object               - Context for `when` checks
 *   open: boolean                 - Show/hide the menu
 *   menu: string                  - Menu tag to filter by
 *   position: { x: number, y: number } - Menu position
 *   scorer: Scorer                - Scoring function (default: defaultScorer())
 *   history: HistoryEntry[]       - Frecency history for defaultScorer
 *   maxVisible: number            - Max visible items before "N more" (default: 7)
 *   inputs: Input[]               - How bindings are shown (default: keys only)
 *
 * Events:
 *   execute - Fired when command is executed (detail: { command })
 *   close   - Fired when menu is dismissed
 *
 * CSS parts:
 *   search          - The search input element
 *   context-menu    - Outer container
 *   backdrop        - Click-away backdrop
 *   list            - The <ul>
 *   separator       - Category separator <li>
 *   item            - Command <li>
 *   item-active     - Active/focused item
 *   item-disabled   - Inactive command
 *   item-label      - Label span
 *   item-keys       - Keys container
 *   item-key        - Individual key <kbd>
 *   more-row        - "▾ N more" toggle row
 */
export declare class ContextMenu extends HTMLElement {
    /** How bindings are shown: an item shows its first. @type {Input[]} */
    inputs: Input[];
    /** @type {Command[]} */
    _commands: Command[];
    /** @type {Record<string, unknown>} */
    _context: Record<string, unknown>;
    /** @type {string} */
    _menu: string;
    /** @type {{ x: number, y: number }} */
    _position: {
        x: number;
        y: number;
    };
    /** @type {(Command & { active: boolean })[]} */
    _allItems: (Command & {
        active: boolean;
    })[];
    /** @type {(Command & { active: boolean })[]} */
    _visibleItems: (Command & {
        active: boolean;
    })[];
    /** @type {number} */
    _activeIndex: number;
    /** @type {'keyboard' | 'pointer'} */
    _inputMode: 'keyboard' | 'pointer';
    /** @type {(() => void) | null} */
    _cleanupTrigger: (() => void) | null;
    /** @type {((e: Event) => void) | null} */
    _keyHandler: ((e: Event) => void) | null;
    /** @type {Scorer} */
    _scorer: Scorer;
    /** @type {HistoryEntry[]} */
    _history: HistoryEntry[];
    /** @type {number} */
    _maxVisible: number;
    /** @type {boolean} */
    _expanded: boolean;
    /** @type {HTMLElement} */
    _backdrop: HTMLElement;
    /** @type {HTMLInputElement} */
    _searchInput: HTMLInputElement;
    /** @type {HTMLElement} */
    _list: HTMLElement;
    _resize: ResizeObserver | null | undefined;
    static kind: string;
    static get observedAttributes(): string[];
    constructor();
    get commands(): Readonly<import("../command.js").CommandFields>[];
    set commands(val: Readonly<import("../command.js").CommandFields>[]);
    get context(): Record<string, unknown>;
    set context(val: Record<string, unknown>);
    get menu(): string;
    set menu(val: string);
    get open(): boolean;
    set open(val: boolean);
    get position(): {
        x: number;
        y: number;
    };
    set position(val: {
        x: number;
        y: number;
    });
    get scorer(): import("../search.js").Scorer;
    set scorer(val: import("../search.js").Scorer);
    get history(): import("../search.js").HistoryEntry[];
    set history(val: import("../search.js").HistoryEntry[]);
    get maxVisible(): number;
    set maxVisible(val: number);
    /**
     * @param {string} name
     * @param {string | null} _oldVal
     * @param {string | null} newVal
     */
    attributeChangedCallback(name: string, _oldVal: string | null, newVal: string | null): void;
    connectedCallback(): void;
    disconnectedCallback(): void;
    /** @param {boolean} enable */
    _setupAutoTrigger(enable: boolean): void;
    _onOpen(): void;
    _onClose(): void;
    _close(): void;
    _buildItems(): void;
    _updatePosition(): void;
    _render(): void;
    _markActive(): void;
    /** @param {KeyboardEvent} e */
    _handleKey(e: KeyboardEvent): void;
    /** @param {number} index */
    _execute(index: number): void;
}
