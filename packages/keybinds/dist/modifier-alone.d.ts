/**
 * A modifier key pressed and let go on its own: `down` on a fresh press with no other modifier held; `spoiled` when
 * anything else happens while it is held (another key, a click, scrolling), after which nothing counts until it is let
 * go; `up` when let go, with whether the press stayed clean. Listens in the capture phase, so editors that stop events
 * don't hide them; the window losing focus lets go, not clean.
 */
export type ModifierAloneOptions = Readonly<{
    modifiers: readonly string[];
    target: EventTarget;
    down: () => void;
    spoiled: () => void;
    up: (clean: boolean) => void;
}>;
/**
 * Follows a modifier on its own
 * @param {ModifierAloneOptions} options - The modifiers ("Control", "Alt", "Shift", "Meta"); where to listen; and
 *   what happens
 * @returns {() => void} Stopping
 */
declare function modifierAlone({ down, modifiers, spoiled, target, up }: ModifierAloneOptions): () => void;
export { modifierAlone };
