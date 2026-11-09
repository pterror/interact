/**
 * A key binding as people see it, one part per modifier and the key: "$mod+k" is ["⌘", "K"] on a Mac. A physical key
 * named in a binding ("slash", "digit1") shows as the character it types on the person's layout, given its glyph map,
 * or on a US layout without one. One step, without a suffix: formatSteps() shows the rest.
 */
/**
 * A key binding as display parts
 * @param {string} binding - One step of a binding, without a suffix: "ctrl+shift+slash"
 * @param {ReadonlyMap<string, string>} [layout] - What each physical key types on the person's layout, by
 *   `event.code` (layout()'s value)
 * @returns {string[]} The parts as shown
 */
declare function formatKey(binding: string, layout?: ReadonlyMap<string, string>): string[];
export { formatKey };
