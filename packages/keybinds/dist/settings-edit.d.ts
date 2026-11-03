/**
 * The settings panel's changes to a store: one command's bindings read, replaced, added, removed, saved as the fields
 * that differ from its defaults, and reset.
 */
import type { InputUI } from './input.js';
import type { AnyBindingsStore } from './store.js';
export type Field = InputUI['field'];
export type Lists = Readonly<Partial<Record<Field, readonly string[]>>>;
/**
 * A command's bindings in effect, in the fields of the inputs shown
 * @param {AnyBindingsStore} store - The store
 * @param {string} id - The command
 * @param {readonly InputUI[]} inputs - The inputs shown
 * @returns {Lists} Its bindings, an empty list in each field it has none
 */
declare function listsOf(store: AnyBindingsStore, id: string, inputs: readonly InputUI[]): Lists;
/**
 * The lists with one binding put in place of another, or added at the end
 * @param {Lists} lists - The bindings
 * @param {Readonly<{ binding: string, field: Field, index: number | undefined }>} change - The binding, its field, and
 *   which it replaces (undefined to add it)
 * @returns {Lists} The bindings after
 */
declare function withBinding(lists: Lists, { binding, field, index }: Readonly<{
    binding: string;
    field: Field;
    index: number | undefined;
}>): Lists;
/**
 * The lists without one binding
 * @param {Lists} lists - The bindings
 * @param {Field} field - Its field
 * @param {number} index - Which one
 * @returns {Lists} The bindings after
 */
declare function withoutBinding(lists: Lists, field: Field, index: number): Lists;
/**
 * The lists without any binding that's the same as one through an input
 * @param {Lists} lists - The bindings
 * @param {InputUI} input - The input
 * @param {string} binding - The binding
 * @returns {Lists} The bindings after
 */
declare function withoutSame(lists: Lists, input: InputUI, binding: string): Lists;
/**
 * Saves a command's bindings as the fields that differ from its defaults, or as none when nothing does
 * @param {AnyBindingsStore} store - The store
 * @param {string} id - The command
 * @param {Lists} lists - Its bindings
 * @returns {void}
 */
declare function saveLists(store: AnyBindingsStore, id: string, lists: Lists): void;
/**
 * Takes away a command's override, so its defaults are in effect again
 * @param {AnyBindingsStore} store - The store
 * @param {string} id - The command
 * @returns {void}
 */
declare function resetOne(store: AnyBindingsStore, id: string): void;
export { listsOf, resetOne, saveLists, withBinding, withoutBinding, withoutSame };
