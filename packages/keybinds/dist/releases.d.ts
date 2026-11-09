/**
 * Release bindings ("k:up"): handlers run as a press comes up, found by what the press was looked up by as it went
 * down. A handler that took the press's down always gets its release, whatever its `when` says, so a hold can't be
 * left open; the others run as usual until one takes the event.
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
export type ReleasesOptions<Q, H> = Readonly<{
    find: (query: Q) => readonly H[];
    took: (id: string) => readonly H[];
    to: Sink<Q, H>;
}>;
/**
 * @typedef {Readonly<{ run: (event: Event) => boolean | void, when?: () => boolean, typing?: boolean }>} Handler
 */
/**
 * @template Q
 * @typedef {Readonly<{ id: string, query: Q, event: Event, typing: boolean, repeat: boolean }>} Press
 */
/**
 * A press coming up: its id, its event, whether it happened where text is typed, and whether it happened where
 * handlers don't run (inside an overlay), so only handlers its down ran run
 * @typedef {Readonly<{ id: string, event: Event, typing: boolean, blocked: boolean }>} Release
 */
/**
 * Where presses go on to; `down` gives the handler that took the press, if any
 * @template Q, H
 * @typedef {Readonly<{ down: (press: Press<Q>) => H | undefined, up: (release: Release) => void }>} Sink
 */
/**
 * @template Q, H
 * @typedef {Readonly<{
 *   find: (query: Q) => readonly H[],
 *   took: (id: string) => readonly H[],
 *   to: Sink<Q, H>,
 * }>} ReleasesOptions
 */
/**
 * Runs release bindings, then passes the release on
 * @template Q
 * @template {Handler} H
 * @param {ReleasesOptions<Q, H>} options - The release handlers bound to a press, best first; the handlers a press
 *   that is still down took; and where presses go on to
 * @returns {Sink<Q, H>} Where presses go
 */
declare function releases<Q, H extends Handler>({ find, to, took }: ReleasesOptions<Q, H>): Sink<Q, H>;
export { releases };
