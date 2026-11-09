/**
 * Whether a modifier is held now, alone or with other keys (Alt held during a drag to copy instead of move). It follows
 * the modifier flags every key and pointer event carries, so a press that began before the page had focus, or a
 * release it missed, is caught up by the next event. Listens in the capture phase, so handlers that stop events don't
 * hide them; the window losing focus lets go.
 */
export type ModifierHeldOptions = Readonly<{
    modifier: 'Alt' | 'Control' | 'Meta' | 'Shift';
    target?: EventTarget;
}>;
export type ModifierHeld = Readonly<{
    get: () => boolean;
    watch: (listener: () => void) => () => void;
    stop: () => void;
}>;
/**
 * @typedef {Readonly<{
 *   modifier: 'Alt' | 'Control' | 'Meta' | 'Shift',
 *   target?: EventTarget,
 * }>} ModifierHeldOptions
 */
/**
 * @typedef {Readonly<{
 *   get: () => boolean,
 *   watch: (listener: () => void) => () => void,
 *   stop: () => void,
 * }>} ModifierHeld
 */
/**
 * Follows whether a modifier is held
 * @param {ModifierHeldOptions} options - The modifier ("Alt", "Control", "Meta" or "Shift"), and where to listen (default
 *   the window)
 * @returns {ModifierHeld} Whether it is held, told when that changes, and stopping
 * @example
 * const alt = modifierHeld({ modifier: 'Alt' })
 * alt.watch(() => label.textContent = alt.get() ? 'Keep both' : 'Move')
 */
declare function modifierHeld({ modifier, target }: ModifierHeldOptions): ModifierHeld;
export { modifierHeld };
