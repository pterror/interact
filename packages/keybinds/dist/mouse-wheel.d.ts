/**
 * Scroll bindings: a command runs once per step of scrolling (a wheel notch, or a trackpad's small deltas adding up
 * to one), the page holds still between steps, and a pause starts a new gesture.
 */
import type { Dispatch } from './input.js';
export type Gesture = {
    amount: number;
    last: number;
    ours: boolean;
};
/**
 * Which way a wheel event scrolls, as a binding names it: vertically if it does, otherwise horizontally
 * @param {WheelEvent} event - The event
 * @returns {string | undefined} "scrollup", "scrolldown", "scrollleft" or "scrollright"; undefined if it doesn't
 */
declare function wheelDirection(event: WheelEvent): string | undefined;
/** Scroll gestures, one per binding, for one keybinds() */
declare class WheelGestures {
    #private;
    /**
     * @param {Dispatch} dispatch - Where commands are found and run
     * @param {Readonly<{ idle?: number, step?: number }>} options - Pixels per step, and the pause that ends a gesture
     */
    constructor(dispatch: Dispatch, { idle, step }: Readonly<{
        idle?: number;
        step?: number;
    }>);
    /**
     * The wheel moved: a step runs the first command that takes it, one step per event so a fast flick doesn't queue
     * up a burst. Between steps the gesture is still the commands', so the page mustn't scroll or zoom meanwhile
     * @param {WheelEvent} event - The scroll
     * @returns {void}
     */
    scrolled(event: WheelEvent): void;
    /** @returns {void} */
    clear(): void;
}
export { WheelGestures, wheelDirection };
