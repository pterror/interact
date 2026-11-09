/**
 * Recording a key binding from the next key pressed, or with `release` pressed and let go ("k:up", bound with the
 * modifiers held as it went down). It is written in the syntax given: a typed character as itself ("?") where the
 * syntax reads it, the physical key otherwise ("shift+slash"). Escape and modifiers alone are left alone.
 */
export type Modifiers = Readonly<{
    ctrl: boolean;
    alt: boolean;
    shift: boolean;
    meta: boolean;
}>;
export type KeySyntax = Readonly<{
    alias?: (name: string) => string | undefined;
    accepts?: (key: string, mods: Modifiers) => boolean;
    shifted?: (key: string) => string | undefined;
}>;
export type RecordKeyOptions = Readonly<{
    done: (binding: string) => void;
    target?: EventTarget;
    release?: boolean;
    syntax?: readonly KeySyntax[];
    ignore?: (event: Event) => boolean;
}>;
/**
 * A key event as a binding ("$mod+shift+k"). A letter key typing something no binding names (Option+A types "å" on a
 * Mac) is the letter
 * @param {KeyboardEvent} event - The keydown
 * @param {readonly KeySyntax[]} [syntax] - The syntax on
 * @returns {string | undefined} The binding, without a suffix; nothing for a modifier alone or a key that can't be
 *   bound
 */
declare function keyBinding(event: KeyboardEvent, syntax?: readonly KeySyntax[]): string | undefined;
/**
 * Records a key binding from the next key pressed
 * @param {RecordKeyOptions} options - What gets the binding; where to listen (default the window); whether to record
 *   a release; the syntax on; and which events to leave alone (the recording's own controls)
 * @returns {() => void} Stopping
 */
declare function recordKey({ done, ignore, release, syntax, target }: RecordKeyOptions): () => void;
export { keyBinding, recordKey };
