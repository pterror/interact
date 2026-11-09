/**
 * Recording an axis binding from whichever comes first: the mouse moved far enough along one direction ("mouse:x"), a
 * stick or trigger pushed well past where it rested ("pad:rx"), or two different keys pressed, toward -1 and then
 * toward 1 ("keys:j/l").
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
export type Pad = Readonly<{
    index: number;
    axes: readonly number[];
    buttons: readonly Readonly<{
        value: number;
    }>[];
}>;
export type RecordAxisOptions = Readonly<{
    done: (binding: string) => void;
    target?: EventTarget;
    pads?: Readonly<{
        get: () => readonly Pad[];
        watch: (listener: () => void) => () => void;
    }>;
    syntax?: readonly KeySyntax[];
}>;
/**
 * Records an axis binding from what is done next
 * @param {RecordAxisOptions} options - What gets the binding; where to listen (default the window); the pads, to
 *   record a stick or trigger; and the key syntax on
 * @returns {() => void} Stopping
 */
declare function recordAxis({ done, pads, syntax, target }: RecordAxisOptions): () => void;
export { recordAxis };
