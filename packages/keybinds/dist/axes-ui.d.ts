/**
 * Showing and recording axis sources, for the settings panel.
 */
import type { InputUI } from './input.js';
import type { KeySyntax } from './keys.js';
/**
 * An axis source as display parts ("-mouse:y" is ["Mouse ↕", "Inverted"]); one it can't read is shown as written
 * @param {string} binding - The source
 * @returns {string[]} The parts as shown
 */
declare function formatAxisParts(binding: string): string[];
/**
 * Axes, shown and recorded as well as read
 * @param {readonly KeySyntax[]} syntax - As for axes()
 * @returns {InputUI} Axes, as an input that can be shown and recorded
 */
declare function axesUI(...syntax: readonly KeySyntax[]): InputUI;
export { axesUI, formatAxisParts };
