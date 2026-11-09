/**
 * The mouse as presses: a button going down is a press known by its name ("click", "middle", "back"), and its coming
 * up ends it. A button let go where the page doesn't see it is released by the next mouse event, which says which
 * buttons are down. A side button whose press or release a handler took doesn't navigate. With `wheel`, scrolling is
 * steps: a press per notch, or per `step` px of a trackpad's small deltas; the page holds still during a bound
 * gesture, and a pause of `idle` ms ends it. A step no handler takes gives the rest of the gesture to the page.
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
export type WheelOptions = Readonly<{
    bound: (query: Query) => boolean;
    step?: number;
    idle?: number;
}>;
export type MouseListenOptions = Readonly<{
    target: EventTarget;
    to: Sink;
    capture?: boolean;
    blocked?: (event: Event) => boolean;
    wheel?: WheelOptions;
}>;
export type Gesture = {
    amount: number;
    last: number;
    ours: boolean;
};
/**
 * Listens to the mouse
 * @param {MouseListenOptions} options - Where to listen; where presses go; whether in the capture phase; which events
 *   to leave alone (default none); and, to listen to scrolling, how it steps
 * @returns {() => void} Stopping
 */
declare function mouseListen({ blocked, capture, target, to, wheel }: MouseListenOptions): () => void;
export { mouseListen };
