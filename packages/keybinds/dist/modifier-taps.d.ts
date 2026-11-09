/**
 * Tapping a modifier on its own as a trigger: pressed and let go `count` times in quick succession (Shift twice).
 */
export type ModifierTapsOptions = Readonly<{
    modifiers: readonly string[];
    run: () => void;
    count?: number;
    within?: number;
    target?: EventTarget;
}>;
/**
 * Follows a modifier tapped on its own
 * @param {ModifierTapsOptions} options - The modifiers ("Control", "Alt", "Shift", "Meta"); what runs once they're
 *   tapped; how many taps (default 2); the most ms from one tap's press to the next tap's release (default 400); and
 *   where to listen (default the window)
 * @returns {() => void} Stopping
 * @example
 * const stop = modifierTaps({ modifiers: ['Shift'], run: () => palette.open() })
 */
declare function modifierTaps({ count, modifiers, run, target, within }: ModifierTapsOptions): () => void;
export { modifierTaps };
