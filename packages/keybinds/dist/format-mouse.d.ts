/**
 * A mouse binding as people see it, one part per modifier and the button: "$mod+click" is ["⌘", "Click"] on a Mac.
 * One step, without a suffix: formatSteps() shows the rest.
 */
/**
 * A mouse binding as display parts
 * @param {string} binding - One step of a binding, without a suffix: "alt+RightClick"
 * @returns {string[]} The parts as shown; a part it doesn't know, as written
 */
declare function formatMouse(binding: string): string[];
export { formatMouse };
