export type Command = import('../command.js').Command;
export type Input = import('../input.js').InputUI;
/** @typedef {import('../command.js').Command} Command */
/** @typedef {import('../input.js').InputUI} Input */
/**
 * <keybinds-basic-context-menu> - Context menu driven by commands (no search, no limit)
 *
 * Attributes:
 *   open         - Show/hide the menu
 *   auto-trigger - Wire contextmenu event on target element
 *   menu         - Menu tag to filter commands by
 *   target       - CSS selector for contextmenu target (defaults to parentElement)
 *
 * Properties:
 *   commands: Command[]     - Array of command definitions
 *   context: object         - Context for `when` checks
 *   open: boolean           - Show/hide the menu
 *   menu: string            - Menu tag to filter by
 *   position: { x: number, y: number } - Menu position
 *   inputs: Input[]         - How bindings are shown (default: keys only)
 *
 * Events:
 *   execute - Fired when command is executed (detail: { command })
 *   close   - Fired when menu is dismissed
 *
 * BEM classes:
 *   .context-menu
 *   .context-menu__backdrop
 *   .context-menu__list
 *   .context-menu__separator
 *   .context-menu__item
 *   .context-menu__item--disabled
 *   .context-menu__item--active
 *   .context-menu__item-label
 *   .context-menu__item-keys
 *   .context-menu__item-key
 */
export declare class BasicContextMenu extends HTMLElement {
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
    _items: (Command & {
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
    /** @type {HTMLElement} */
    _backdrop: HTMLElement;
    /** @type {HTMLElement} */
    _list: HTMLElement;
    /** @type {ResizeObserver | null} */
    _resize: ResizeObserver | null;
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
