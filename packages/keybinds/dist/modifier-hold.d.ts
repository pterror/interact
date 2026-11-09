/**
 * Holding a modifier on its own as a trigger: true once it has been held `delay` ms, false when let go (a cheatsheet
 * shown while Control is held).
 */
export type ModifierHoldOptions = Readonly<{
    modifiers: readonly string[];
    to: (held: boolean) => void;
    delay?: number;
    target?: EventTarget;
}>;
/**
 * Follows a modifier held on its own
 * @param {ModifierHoldOptions} options - The modifiers ("Control", "Alt", "Shift", "Meta"); what hears it held and let
 *   go; how long a hold takes, in ms (default 200); and where to listen (default the window)
 * @returns {() => void} Stopping
 * @example
 * const stop = modifierHold({ modifiers: ['Control'], to: (held) => cheatsheet.set(held) })
 */
declare function modifierHold({ delay, modifiers, target, to }: ModifierHoldOptions): () => void;
export { modifierHold };
