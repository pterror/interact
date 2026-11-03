/**
 * The settings panel's edits to its store, each saved and announced: a binding put in its slot, one taken away, a
 * taken binding moved from another command, and resets.
 */
import type { InputUI } from './input.js';
import type { Slot } from './settings-record.js';
import type { AnyBindingsStore } from './store.js';
export type EditorHooks = Readonly<{
    dispatch: (event: Event) => void;
    inputs: () => readonly InputUI[];
    store: () => AnyBindingsStore | undefined;
}>;
/**
 * What an editor works on, read when it edits: the store (if there is one), the inputs shown, and where its events go
 * @typedef {Readonly<{ dispatch: (event: Event) => void, inputs: () => readonly InputUI[], store: () => AnyBindingsStore |
 *   undefined }>} EditorHooks
 */
/** A settings panel's edits */
declare class BindingEditor {
    #private;
    /**
     * Edits for a panel
     * @param {EditorHooks} hooks - What it works on
     */
    constructor(hooks: EditorHooks);
    /**
     * Puts a binding in its slot
     * @param {Slot} slot - Which binding
     * @param {string} binding - The binding
     * @returns {void}
     */
    apply(slot: Slot, binding: string): void;
    /**
     * Takes a binding from another command, and puts it in a slot
     * @param {string} from - The other command
     * @param {Slot} slot - Which binding it goes to
     * @param {string} binding - The binding
     * @returns {void}
     */
    move(from: string, slot: Slot, binding: string): void;
    /**
     * Takes a binding away
     * @param {Slot} slot - Which binding
     * @returns {void}
     */
    remove({ id, index, input }: Slot): void;
    /**
     * Resets one command to its defaults
     * @param {string} id - The command
     * @returns {void}
     */
    reset(id: string): void;
    /**
     * Resets every command to its defaults
     * @returns {void}
     */
    resetAll(): void;
}
export { BindingEditor };
