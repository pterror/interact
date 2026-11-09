/**
 * A ready-made composition for pages and simple apps: bindings as data, each string routed by what it names to the
 * table that runs it ("k" presses, "k:up" releases, "k:hold" and "k:tap" holds, "g i" sequences), each input (keys,
 * mouse, gamepad) listened to with the overlay rule, and axes read through what it returns. An app that wants more
 * wires the modules itself.
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
export type Command = Readonly<{
    keys?: readonly string[];
    mouse?: readonly string[];
    pad?: readonly string[];
    run: (event: Event) => boolean | void;
    when?: () => boolean;
    typing?: boolean;
    anyModifiers?: boolean;
}>;
export type Axis = Readonly<{
    axes: readonly string[];
    when?: () => boolean;
}>;
export type Binding = Command | Axis;
export type AxisValue = Readonly<{
    position: number;
    delta: number;
}>;
export type Pad = Readonly<{
    index: number;
    axes: readonly number[];
    buttons: readonly Readonly<{
        pressed: boolean;
        value: number;
    }>[];
}>;
export type Pads = Readonly<{
    get: () => readonly Pad[];
    watch: (listener: () => void) => () => void;
}>;
export type Test<T> = Readonly<{
    has: (value: T) => boolean;
    watch: (listener: (values?: readonly T[]) => void) => () => void;
}>;
export type KeybindsOptions = Readonly<{
    target?: EventTarget;
    capture?: boolean;
    syntax?: readonly KeySyntax[];
    releases?: boolean;
    holds?: boolean | Readonly<{
        delay?: number;
    }>;
    sequences?: boolean | Readonly<{
        timeout?: number;
    }>;
    wheel?: Readonly<{
        step?: number;
        idle?: number;
    }>;
    pads?: Pads;
}>;
export type Query = Readonly<{
    exact: readonly string[];
    bare: readonly string[];
    mods: Modifiers;
}>;
export type Press = Readonly<{
    id: string;
    query: Query;
    event: Event;
    typing: boolean;
    repeat: boolean;
}>;
export type Release = Readonly<{
    id: string;
    event: Event;
    typing: boolean;
    blocked: boolean;
}>;
export type Sink = Readonly<{
    down: (press: Press) => Command | undefined;
    up: (release: Release) => void;
}>;
export type Parsed = Readonly<{
    lookup: string;
    bare: string;
    mods: Modifiers;
}>;
export type Input = Readonly<{
    field: Field;
    parse: (step: string, suffix: string) => Parsed;
    listen: (to: Sink, blocked: (event: Event) => boolean, bound: (query: Query) => boolean) => Readonly<{
        stop: () => void;
        held?: Test<string>;
    }>;
}>;
export type Field = 'keys' | 'mouse' | 'pad';
export type Table = Readonly<{
    exact: readonly (readonly [string, Command])[];
    loose: readonly (readonly [string, Modifiers, Command])[];
}>;
export type Routes = Readonly<{
    press: Table;
    up: Table;
    hold: Table;
    tap: Table;
    sequences: readonly (readonly [readonly string[], Command])[];
}>;
export type Phase = 'press' | 'up' | 'hold' | 'tap';
/**
 * Listens for bindings
 * @param {readonly Binding[]} bindings - The commands and axes
 * @param {KeybindsOptions} [options] - Where to listen, which syntax is on, and how inputs are read
 * @returns {(() => void) & Readonly<{ axis: (axis: Axis) => AxisValue }>} Stopping; and reading one of the axes now:
 *   its position, from -1 to 1, and its movement since it was last read (zero while its `when` is false or an
 *   overlay holds focus)
 * @throws {Error} If a binding is invalid or uses syntax that isn't on
 * @example
 * const look = { axes: ['mouse:x', 'pad:rx'] }
 * const kb = keybinds([{ keys: ['$mod+s'], run: () => save() }, { mouse: ['MiddleClick'], run: pan }, look])
 * const { delta } = kb.axis(look)
 */
declare function keybinds(bindings: readonly Binding[], options?: KeybindsOptions): (() => void) & Readonly<{
    axis: (axis: Axis) => AxisValue;
}>;
export { keybinds };
