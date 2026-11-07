/**
 * <keybinds-settings>: the panel where people rebind commands and axes, recording new bindings, settling conflicts and
 * resetting to the defaults.
 *
 * Attributes: `open`.
 *
 * Properties: `store` (the BindingsStore it edits), `inputs` (which bindings are shown and can be recorded; default
 * keys only), `releases`, `holds`, `sequences` (whether release, hold and tap, and several-step bindings can be
 * recorded: set them when keybinds() has releases(), holds(), sequences()), `open`.
 *
 * Events: `close` when it's dismissed; `change` (detail: { commandId, bindings }) when a binding changes; `reset`
 * (detail: { commandId? }) when bindings are reset.
 *
 * Classes: .settings, __backdrop, __dialog, __header, __title, __reset-all, __group, __group-title, __list, __item,
 * __item-label, __item-bindings, __item-reset, __binding (--recording), __binding-keys, __binding-key,
 * __binding-remove, __item-add, __recording-overlay, __conflict.
 *
 * It shows a group per category, a row per command or axis with its bindings, the prompt where one is being recorded,
 * and the question where a binding is taken. Recording captures a press, or a release, hold or tap, in one step or
 * several, until a binding is recorded or Escape; each edit is saved to the store as the fields that differ from the
 * command's defaults, and announced.
 */
import type { InputUI } from './input.js';
import type { AnyBindingsStore } from './store.js';
export type Field = InputUI['field'];
export type Lists = Readonly<Partial<Record<Field, readonly string[]>>>;
export type Slot = Readonly<{
    id: string;
    index: number | undefined;
    input: InputUI;
}>;
export type Conflict = Readonly<{
    binding: string;
    flip: boolean;
    id: string;
    label: string;
    slot: Slot;
}>;
/** The panel where people rebind commands and axes */
declare class KeybindSettings extends HTMLElement {
    #private;
    static kind: string;
    static observedAttributes: string[];
    /** How long recording a sequence waits after a step before taking the steps so far, in milliseconds */
    static SEQUENCE_PAUSE: number;
    /** Whether release bindings ("k:up") can be recorded and switched to */
    releases: boolean;
    /** Whether hold and tap bindings ("k:hold", "k:tap") can be recorded */
    holds: boolean;
    /** Whether bindings of several steps ("g i") can be recorded */
    sequences: boolean;
    /** Builds the panel's shadow DOM: a backdrop, and the dialog its contents go in */
    constructor();
    /** @returns {AnyBindingsStore | undefined} The store it edits */
    get store(): AnyBindingsStore | undefined;
    /** @param {AnyBindingsStore | undefined} store - The store it edits */
    set store(store: AnyBindingsStore | undefined);
    /** @returns {readonly InputUI[]} Which bindings are shown and can be recorded */
    get inputs(): readonly InputUI[];
    /** @param {readonly InputUI[]} inputs - Which bindings are shown and can be recorded */
    set inputs(inputs: readonly InputUI[]);
    /** @returns {boolean} Whether it's open */
    get open(): boolean;
    /** @param {boolean} open - Whether it's open */
    set open(open: boolean);
    /**
     * Follows its `open` attribute: opening shows the bindings as they are, closing stops recording
     * @param {string} _name - Which changed
     * @param {string | null} _previous - Its value before
     * @param {string | null} value - Its value now
     * @returns {void}
     */
    attributeChangedCallback(_name: string, _previous: string | null, value: string | null): void;
    /** @returns {void} */
    connectedCallback(): void;
    /** @returns {void} */
    disconnectedCallback(): void;
}
export { KeybindSettings };
