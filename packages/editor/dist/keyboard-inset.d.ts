/**
 * How much of the bottom of the window an on-screen keyboard covers, from the visual viewport, so a toolbar can sit
 * above it. Zero where there is no visual viewport.
 */
export type Viewed = Readonly<{
    innerHeight: number;
    visualViewport: (EventTarget & Readonly<{
        height: number;
        offsetTop: number;
    }>) | null;
}>;
/**
 * What it reads: the window's height, and its visual viewport
 * @typedef {Readonly<{
 *   innerHeight: number,
 *   visualViewport: (EventTarget & Readonly<{ height: number, offsetTop: number }>) | null,
 * }>} Viewed
 */
/**
 * Follows the keyboard's inset
 * @param {Readonly<{ window?: Viewed }>} [options] - The window (default the global one)
 * @returns {Readonly<{ get: () => number, watch: (listener: () => void) => () => void, stop: () => void }>} The inset in
 *   CSS pixels, told when it changes, and stopping
 */
declare function keyboardInset({ window }?: Readonly<{
    window?: Viewed;
}>): Readonly<{
    get: () => number;
    watch: (listener: () => void) => () => void;
    stop: () => void;
}>;
export { keyboardInset };
