/**
 * Showing and recording axis sources, for the settings panel. Recording takes whichever comes first: enough mouse
 * movement along one direction, a stick or trigger pushed well past where it rested, or two keys (toward -1, then
 * toward 1).
 */
import type { InputUI } from './input.js';
import type { KeySyntax } from './keys.js';
/**
 * An axis source as display parts ("-mouse:y" is ["Mouse ↕", "Inverted"]); one it can't read is shown as written
 * @param {string} binding - The source
 * @returns {string[]} The parts as shown
 */
declare function formatAxisParts(binding: string): string[];
/** One recording of an axis source */
declare class AxesRecorder {
    #private;
    /**
     * Starts listening and reading pads
     * @param {Window} target - The window recording happens in
     * @param {readonly KeySyntax[]} syntax - For key pairs, as for keys()
     * @param {(binding: string) => void} done - Gets the source
     */
    constructor(target: Window, syntax: readonly KeySyntax[], done: (binding: string) => void);
    /**
     * Hears the mouse moving and keys
     * @param {Event} event - A mousemove or keydown
     * @returns {void}
     */
    handleEvent(event: Event): void;
    /** @returns {void} */
    stop(): void;
}
/**
 * Axes, shown and recorded as well as read
 * @param {readonly KeySyntax[]} syntax - As for axes()
 * @returns {InputUI} Axes, as an input that can be shown and recorded
 */
declare function axesUI(...syntax: readonly KeySyntax[]): InputUI;
export { AxesRecorder, axesUI, formatAxisParts };
