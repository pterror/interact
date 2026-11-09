/**
 * An axis binding as people see it: "mouse:x" is ["Mouse ↔"], "-pad:ry" is ["Right stick ↕", "Inverted"],
 * "keys:a/d" is ["A", "/", "D"]. One it can't read shows as written.
 */
/**
 * An axis binding as display parts
 * @param {string} binding - The binding
 * @param {ReadonlyMap<string, string>} [layout] - What each physical key types on the person's layout, as for
 *   formatKey()
 * @returns {string[]} The parts as shown
 */
declare function formatAxis(binding: string, layout?: ReadonlyMap<string, string>): string[];
export { formatAxis };
