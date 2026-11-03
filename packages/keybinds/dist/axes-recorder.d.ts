/**
 * Recording an axis source from whichever comes first: enough mouse movement along one direction, a stick or
 * trigger pushed well past where it rested, or two keys (toward -1, then toward 1).
 */
import type { KeySyntax } from './keys.js';
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
export { AxesRecorder };
