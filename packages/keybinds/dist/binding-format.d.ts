/**
 * Bindings as people see them: each step through its input's format, "then" between steps, and a last part for a
 * suffix ("Release", "Hold", "Tap").
 */
import type { Command } from './command.js';
import type { InputUI } from './input.js';
/**
 * A binding's parts, with a last "Release" part for ":up" bindings
 * @param {string} binding - The binding
 * @param {(part: string) => string} formatPart - How one part is shown
 * @returns {string[]} The parts as shown
 */
declare function formatWithRelease(binding: string, formatPart: (part: string) => string): string[];
/**
 * A binding as display parts
 * @param {InputUI} input - Whose binding it is
 * @param {string} binding - The binding
 * @returns {string[]} Each step's parts, "then" between steps, and the suffix's label last
 */
declare function formatBinding(input: InputUI, binding: string): string[];
/**
 * A command's bindings through each input, as display parts, in the order of `inputs`
 * @param {Command} command - The command
 * @param {readonly InputUI[]} inputs - How each kind of binding is shown
 * @returns {string[][]} One list of parts per binding
 */
declare function bindingParts(command: Command, inputs: readonly InputUI[]): string[][];
export { bindingParts, formatBinding, formatWithRelease };
