/**
 * Holding a modifier on its own, or tapping it, as a trigger (the cheatsheet opens this way).
 */
export type ModifierEvents = Readonly<{
    down: () => void;
    spoiled: () => void;
    up: (clean: boolean) => void;
}>;
export type ModifierOptions = Readonly<{
    count?: number;
    delay?: number;
    target?: EventTarget;
    within?: number;
}>;
/**
 * Calls back when a modifier is held on its own for a while, and again when it's let go
 * @example
 *   const stop = onModifierHold('Control', (held) => {
 *     cheatsheet.open = held
 *   }, { delay: 300 })
 * @param {string | readonly string[]} modifiers - The modifier or modifiers: "Control", "Alt", "Shift", "Meta"
 * @param {(held: boolean) => void} onHeld - Called with true once it's been held `delay` ms, false when let go
 * @param {ModifierOptions} [options] - `delay` in ms (default 200), and where to listen (default the window)
 * @returns {() => void} A function that stops
 */
declare function onModifierHold(modifiers: string | readonly string[], onHeld: (held: boolean) => void, options?: ModifierOptions): () => void;
/**
 * Calls back when a modifier is tapped (pressed and let go on its own) `count` times in quick succession, as in
 * double-tapping Shift
 * @example
 *   onModifierTaps('Control', () => {
 *     cheatsheet.open = !cheatsheet.open
 *   })
 * @param {string | readonly string[]} modifiers - The modifier or modifiers: "Control", "Alt", "Shift", "Meta"
 * @param {() => void} onTaps - Called once they've happened
 * @param {ModifierOptions} [options] - `count`: taps in a row (default 2); `within`: most ms from one tap's press to
 *   the next tap's release (default 400); and where to listen (default the window)
 * @returns {() => void} A function that stops
 */
declare function onModifierTaps(modifiers: string | readonly string[], onTaps: () => void, options?: ModifierOptions): () => void;
export { onModifierHold, onModifierTaps };
