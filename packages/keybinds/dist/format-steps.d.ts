/**
 * A whole binding as people see it: each step through a format for one step, "then" between steps, and the suffix
 * last ("Release", "Hold", "Tap"): "g i" is ["G", "then", "I"], "k:up" is ["K", "Release"].
 */
/**
 * A binding as display parts
 * @param {string} binding - The binding
 * @param {(step: string) => readonly string[]} format - How one step is shown: formatKey, formatMouse, formatPad
 * @returns {string[]} The parts as shown
 */
declare function formatSteps(binding: string, format: (step: string) => readonly string[]): string[];
export { formatSteps };
