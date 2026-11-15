/**
 * A mouse binding as people see it, one part per modifier and the button: "$mod+click" is ["⌘", "Click"] on a Mac.
 * One step, without a suffix: formatSteps() shows the rest.
 */
import type { StringsOption } from './strings.js';
/** @import { StringsOption } from './strings.js' */
/**
 * A mouse binding as display parts
 * @param {string} binding - One step of a binding, without a suffix: "alt+RightClick"
 * @param {StringsOption} [strings] - The words to show in place of English
 * @returns {string[]} The parts as shown; a part it doesn't know, as written
 */
declare function formatMouse(binding: string, strings?: StringsOption): string[];
export { formatMouse };
