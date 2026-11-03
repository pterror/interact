export type Command = import('../core.js').Command;
export declare class RadialMenu extends HTMLElement {
    static kind: string;
    static get observedAttributes(): string[];
    constructor();
    connectedCallback(): void;
    get commands(): import("../core.js").Command[];
    set commands(val: import("../core.js").Command[]);
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
