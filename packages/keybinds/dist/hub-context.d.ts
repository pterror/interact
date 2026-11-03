/**
 * The context a CommandHub's `when` conditions see: the app's, with parts added over it.
 * @import { Context } from './command.js'
 */
import type { Context } from './command.js';
/**
 * The app's context, and the parts laid over it, later ones over earlier.
 * @template {Context} C
 */
declare class HubContext<C extends Context> {
    #private;
    /** @param {() => C} base - Gives the app's context */
    constructor(base: () => C);
    /**
     * Adds a part laid over the context.
     * @param {() => Partial<C>} get - Gives part of the context
     * @returns {() => void} A function that removes it again
     */
    add(get: () => Partial<C>): () => void;
    /** @returns {C} The context now: the app's, with every part added laid over it, later ones over earlier */
    now(): C;
}
export { HubContext };
