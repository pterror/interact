/**
 * Every binding of an id as people see it, one list of display parts per binding: keys, then mouse, gamepad and axis
 * bindings, each through its format.
 */
import type { StringsOption } from './strings.js';
export type Entry = Readonly<{
    keys?: readonly string[];
    mouse?: readonly string[];
    pad?: readonly string[];
    axes?: readonly string[];
}>;
/** @import { StringsOption } from './strings.js' */
/**
 * @typedef {Readonly<{ keys?: readonly string[], mouse?: readonly string[], pad?: readonly string[],
 *   axes?: readonly string[] }>} Entry
 */
/**
 * The bindings as display parts
 * @param {Entry} entry - An id's bindings
 * @param {ReadonlyMap<string, string>} [layout] - What each physical key types on the person's layout (layout()'s
 *   value)
 * @param {StringsOption} [strings] - The words to show in place of English
 * @returns {readonly (readonly string[])[]} Each binding's parts
 */
declare function bindingParts(entry: Entry, layout?: ReadonlyMap<string, string>, strings?: StringsOption): readonly (readonly string[])[];
export { bindingParts };
