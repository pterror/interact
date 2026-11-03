/**
 * Where a context menu shows: at a point on screen, kept inside the viewport.
 */
export type Point = Readonly<{
    x: number;
    y: number;
}>;
/**
 * A point on screen, in viewport pixels
 * @typedef {Readonly<{ x: number, y: number }>} Point
 */
/**
 * Puts a box at a point, then moves it back inside the viewport once it has been laid out
 * @param {HTMLElement} box - The box
 * @param {Point} point - Where its corner goes
 * @returns {void}
 */
declare function placeAt(box: HTMLElement, { x, y }: Point): void;
/** A box kept inside the viewport at a point, until it's moved again or stopped */
declare class OnScreen {
    #private;
    /**
     * Puts the box at a point, and keeps it on screen there
     * @param {HTMLElement} box - The box
     * @param {Point} point - Where its corner goes
     * @returns {void}
     */
    place(box: HTMLElement, point: Point): void;
    /**
     * Stops following the box's size
     * @returns {void}
     */
    stop(): void;
}
export { OnScreen, placeAt };
