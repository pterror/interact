/**
 * Every binding of an id as people see it, one list of display parts per binding: keys, then mouse, gamepad and axis
 * bindings, each through its format.
 */
export type Entry = Readonly<{
    keys?: readonly string[];
    mouse?: readonly string[];
    pad?: readonly string[];
    axes?: readonly string[];
}>;
/**
 * @typedef {Readonly<{ keys?: readonly string[], mouse?: readonly string[], pad?: readonly string[],
 *   axes?: readonly string[] }>} Entry
 */
/**
 * The bindings as display parts
 * @param {Entry} entry - An id's bindings
 * @param {ReadonlyMap<string, string>} [layout] - What each physical key types on the person's layout (layout()'s
 *   value)
 * @returns {readonly (readonly string[])[]} Each binding's parts
 */
declare function bindingParts(entry: Entry, layout?: ReadonlyMap<string, string>): readonly (readonly string[])[];
export { bindingParts };
