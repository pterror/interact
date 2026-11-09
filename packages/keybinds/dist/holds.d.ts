/**
 * Holding and tapping ("k:hold", "k:tap"): hold handlers run once a press has lasted a while, tap handlers when it
 * comes up before that. Together they give one key two jobs. The press itself goes on to its own handlers as usual.
 */
export type Handler = Readonly<{
    run: (event: Event) => boolean | void;
    when?: () => boolean;
    typing?: boolean;
}>;
export type Press<Q> = Readonly<{
    id: string;
    query: Q;
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
export type Sink<Q, H> = Readonly<{
    down: (press: Press<Q>) => H | undefined;
    up: (release: Release) => void;
}>;
export type Test<T> = Readonly<{
    has: (value: T) => boolean;
    watch: (listener: (values?: readonly T[]) => void) => () => void;
}>;
export type HoldsOptions<Q, H> = Readonly<{
    hold: (query: Q) => readonly H[];
    tap: (query: Q) => readonly H[];
    delay?: number;
    to: Sink<Q, H>;
}>;
export type Holds<Q, H> = Sink<Q, H> & Readonly<{
    held: Test<H>;
    took: (id: string) => readonly H[];
    stop: () => void;
}>;
export type Timed<Q> = Readonly<{
    press: Press<Q>;
    at: number;
    timer: ReturnType<typeof setTimeout>;
}>;
/**
 * Times presses for their hold and tap handlers
 * @template Q
 * @template {Handler} H
 * @param {HoldsOptions<Q, H>} options - The hold and tap handlers bound to a press, best first; how long a press
 *   lasts before it is a hold, in ms (default 500); and where presses go on to
 * @returns {Holds<Q, H>} Where presses go, and what is held
 */
declare function holds<Q, H extends Handler>({ delay, hold, tap, to }: HoldsOptions<Q, H>): Holds<Q, H>;
export { holds };
