/**
 * Each input as the settings panel rebinds it: the field its bindings are in, its name, what recording asks for,
 * its recorder, a binding's normal form (for conflicts) and how a binding looks. A gamepad's can be recorded only
 * while one is connected.
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
    lookups?: (key: string, mods: Modifiers, held: Modifiers) => readonly string[];
    fallback?: (key: string, held: Modifiers) => readonly string[];
}>;
export type Watched<T> = Readonly<{
    get: () => T;
    watch: (listener: () => void) => () => void;
}>;
export type Pad = Readonly<{
    index: number;
    axes: readonly number[];
    buttons: readonly Readonly<{
        pressed: boolean;
        value: number;
    }>[];
}>;
export type RecordOptions = Readonly<{
    done: (binding: string) => void;
    release: boolean;
    ignore: (event: Event) => boolean;
}>;
export type Input = Readonly<{
    field: 'axes' | 'keys' | 'mouse' | 'pad';
    label: string;
    prompt: (release: boolean) => string;
    record: (options: RecordOptions) => () => void;
    lookup: (binding: string) => string;
    parts: (binding: string) => readonly string[];
    available?: () => boolean;
    watch?: (listener: () => void) => () => void;
}>;
export type KeysOptions = Readonly<{
    syntax?: readonly KeySyntax[];
    layout?: Watched<ReadonlyMap<string, string> | undefined>;
}>;
/**
 * Key bindings
 * @param {KeysOptions} [options] - The key syntax on; and the person's keyboard layout (layout())
 * @returns {Input} The input
 */
declare function rebindKeys({ layout, syntax }?: KeysOptions): Input;
/**
 * Mouse bindings
 * @returns {Input} The input
 */
declare function rebindMouse(): Input;
/**
 * Gamepad bindings, recordable while a pad is connected
 * @param {Readonly<{ pads: Watched<readonly Pad[]> }>} options - The pads (pads())
 * @returns {Input} The input
 */
declare function rebindPad({ pads }: Readonly<{
    pads: Watched<readonly Pad[]>;
}>): Input;
/**
 * Axis bindings: the mouse, a stick or trigger, or two keys
 * @param {KeysOptions & Readonly<{ pads?: Watched<readonly Pad[]> }>} [options] - As for rebindKeys(); and the pads,
 *   to record a stick or trigger
 * @returns {Input} The input
 */
declare function rebindAxes({ layout, pads, syntax }?: KeysOptions & Readonly<{
    pads?: Watched<readonly Pad[]>;
}>): Input;
export { rebindAxes, rebindKeys, rebindMouse, rebindPad };
