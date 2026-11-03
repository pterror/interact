export type Command = import('./command.js').Command;
export declare class RadialMenu extends HTMLElement {
    /** @type {Command[]} */
    _commands: Command[];
    /** @type {Record<string, unknown>} */
    _context: Record<string, unknown>;
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
    /** @type {((e: Event) => void) | null} */
    _keyHandler: ((e: Event) => void) | null;
    /** @type {number} */
    _radius: number;
    /** @type {number} */
    _indicatorR: number;
    /** @type {number} */
    _labelGap: number;
    _backdrop: HTMLElement;
    _svg: SVGSVGElement;
    _spokesGroup: SVGGElement;
    _slotsGroup: SVGGElement;
    static kind: string;
    static get observedAttributes(): string[];
    constructor();
    connectedCallback(): void;
    get commands(): Readonly<import("./command.js").CommandFields>[];
    set commands(val: Readonly<import("./command.js").CommandFields>[]);
    get context(): Record<string, unknown>;
    set context(val: Record<string, unknown>);
    get open(): boolean;
    set open(val: boolean);
    /**
     * @param {string} name
     * @param {string | null} _oldVal
     * @param {string | null} newVal
     */
    attributeChangedCallback(name: string, _oldVal: string | null, newVal: string | null): void;
    /**
     * Open the menu at the given viewport coordinates.
     * If no coords given, centers in the viewport.
     * @param {{ x?: number, y?: number } | undefined} [coords]
     */
    openAt(coords?: {
        x?: number;
        y?: number;
    } | undefined): void;
    close(): void;
    _onOpen(): void;
    _onClose(): void;
    _close(): void;
    _buildItems(): void;
    _updatePosition(): void;
    _render(): void;
    /**
     * How a slot shows whether it's the active one, and whether it can be used.
     * @param {SVGGElement} g
     */
    _paint(g: SVGGElement): void;
    _markActive(): void;
    /** @param {KeyboardEvent} e */
    _handleKey(e: KeyboardEvent): void;
    /** @param {number} slot */
    _execute(slot: number): void;
}
