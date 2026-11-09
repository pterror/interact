/**
 * A binding string's parts: its steps ("g i" is two) and the suffix that names its phase (":up", ":hold", ":tap"),
 * whatever syntax is on.
 */
export type Suffix = '' | ':hold' | ':tap' | ':up';
/**
 * Splits a binding
 * @param {string} binding - The binding: "ctrl + k:HOLD", "g  i"
 * @returns {Readonly<{ steps: readonly string[], suffix: Suffix }>} Its steps, in order, with spaces around "+"
 *   taken out; and its suffix, lowercase, or "" for a press
 */
declare function splitBinding(binding: string): Readonly<{
    steps: readonly string[];
    suffix: Suffix;
}>;
export { splitBinding };
