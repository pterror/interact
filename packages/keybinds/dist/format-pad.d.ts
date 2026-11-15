/**
 * A gamepad binding as people see it, by its button's standard name whatever name the binding uses: "south" is ["A"].
 * One step, without a suffix: formatSteps() shows the rest.
 */
import type { StringsOption } from './strings.js';
/** @import { StringsOption } from './strings.js' */
/**
 * A gamepad binding as display parts
 * @param {string} binding - One step of a binding, without a suffix: "rt"
 * @param {StringsOption} [strings] - The words to show in place of English
 * @returns {string[]} The button as shown; one it doesn't know, as written
 */
declare function formatPad(binding: string, strings?: StringsOption): string[];
export { formatPad };
