/**
 * The keyboard as presses: a key going down is a press known by its physical key (`event.code`), its auto-repeat
 * goes on with it, and its coming up ends it. A modifier key on its own never presses (Shift, to type "G", mustn't
 * break off a sequence). When the window loses focus every held key is released: its keyup would go elsewhere.
 */
export type Modifiers = Readonly<{
    ctrl: boolean;
    alt: boolean;
    shift: boolean;
    meta: boolean;
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
    down: (press: Press) => unknown;
    up: (release: Release) => void;
}>;
export type Test<T> = Readonly<{
    has: (value: T) => boolean;
    watch: (listener: (values?: readonly T[]) => void) => () => void;
}>;
export type KeyListenOptions = Readonly<{
    target: EventTarget;
    to: Sink;
    capture?: boolean;
    blocked?: (event: Event) => boolean;
    query?: (event: KeyboardEvent) => Query;
}>;
export type Down = Readonly<{
    code: string;
    key: string;
    bare: readonly string[];
    typing: boolean;
}>;
/**
 * Listens to the keyboard. `held` holds for a lookup (without modifiers: "a", "keya") while a key it names is down,
 * pressed where text isn't typed and not inside an overlay
 * @param {KeyListenOptions} options - Where to listen; where presses go; whether in the capture phase; which events
 *   to leave alone (default none); and what a key event is looked up by (default keyQuery without syntax)
 * @returns {Readonly<{ held: Test<string>, stop: () => void }>} The keys held, and stopping
 */
declare function keyListen({ blocked, capture, query, target, to }: KeyListenOptions): Readonly<{
    held: Test<string>;
    stop: () => void;
}>;
export { keyListen };
