/**
 * The mouse, listened to for one keybinds(): buttons going down and up, held buttons released when the page never
 * sees them let go, side buttons kept from navigating while bound, and scrolling run in steps.
 */
import type { Dispatch } from './input.js';
export type WheelOptions = Readonly<{
    idle?: number;
    step?: number;
}>;
/**
 * A pointer button's name as bindings write it, by `MouseEvent.button`
 * @param {number} button - The button
 * @returns {string | undefined} Its name, or undefined for a button no binding names
 */
declare function pointerButtonName(button: number): string | undefined;
/** The mouse, listened to for one keybinds() */
declare class MouseListener {
    #private;
    /**
     * Starts listening
     * @param {Dispatch} dispatch - Where presses are reported
     * @param {WheelOptions} wheel - How scrolling steps
     */
    constructor(dispatch: Dispatch, wheel: WheelOptions);
    /**
     * Hears the mouse
     * @param {Event} event - A mouse or wheel event
     * @returns {void}
     */
    handleEvent(event: Event): void;
    /** @returns {void} */
    stop(): void;
}
export { MouseListener, pointerButtonName };
