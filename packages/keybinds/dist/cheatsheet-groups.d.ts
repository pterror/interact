/**
 * What the cheatsheet shows: each category's commands, with every binding through the inputs it shows, and those that
 * don't apply now marked.
 */
import type { Command, Context } from './command.js';
import type { InputUI } from './input.js';
/**
 * Every category's group
 * @param {readonly Command[]} commands - The commands
 * @param {Context} context - What `when` conditions see
 * @param {readonly InputUI[]} inputs - Which bindings are shown, and how
 * @returns {HTMLDivElement[]} The groups
 */
declare function cheatsheetGroups(commands: readonly Command[], context: Context, inputs: readonly InputUI[]): HTMLDivElement[];
export { cheatsheetGroups };
