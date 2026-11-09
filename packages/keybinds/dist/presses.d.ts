/**
 * Presses running what they are bound to: a press runs the first handler bound to it that applies, which takes its
 * event; its auto-repeat runs again, as the press it repeats; it ends when it comes up.
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
export type Test<T> = Readonly<{
    has: (value: T) => boolean;
    watch: (listener: (values?: readonly T[]) => void) => () => void;
}>;
export type Presses<Q, H> = Readonly<{
    down: (press: Press<Q>) => H | undefined;
    up: (release: Readonly<{
        id: string;
    }>) => void;
    held: Test<H>;
    took: (id: string) => readonly H[];
}>;
/**
 * @typedef {Readonly<{ run: (event: Event) => boolean | void, when?: () => boolean, typing?: boolean }>} Handler
 */
/**
 * A press going down, or repeating: the id it is known by until it comes up, what it is looked up by, its event, and
 * whether it happened where text is typed
 * @template Q
 * @typedef {Readonly<{ id: string, query: Q, event: Event, typing: boolean, repeat: boolean }>} Press
 */
/**
 * Whether something holds, and hearing those it changed for (none: any)
 * @template T
 * @typedef {Readonly<{ has: (value: T) => boolean, watch: (listener: (values?: readonly T[]) => void) => () => void }>}
 *   Test
 */
/**
 * @template Q, H
 * @typedef {Readonly<{
 *   down: (press: Press<Q>) => H | undefined,
 *   up: (release: Readonly<{ id: string }>) => void,
 *   held: Test<H>,
 *   took: (id: string) => readonly H[],
 * }>} Presses
 */
/**
 * Runs presses' handlers. `down` gives the handler that took the press; `held` holds for a handler while a press it
 * took is down; `took` is the handlers a press that is down took
 * @template Q
 * @template {Handler} H
 * @param {(query: Q) => readonly H[]} find - The handlers bound to a press, best first
 * @returns {Presses<Q, H>} The presses
 */
declare function presses<Q, H extends Handler>(find: (query: Q) => readonly H[]): Presses<Q, H>;
export { presses };
