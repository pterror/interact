/**
 * Bindings of several steps: "g i", "ctrl+k ctrl+s", "k k" for a double tap. Each step must come within `timeout` of
 * the last. A press that starts or continues a sequence whose handlers may run is the sequence's: it is taken and goes
 * no further. A press that completes one runs the first of its handlers that applies; if none does, or a press goes
 * on from no sequence, it goes on as a press of its own.
 */
export type Handler = Readonly<{
    run: (event: Event) => boolean | void;
    when?: () => boolean;
    typing?: boolean;
}>;
export type Query = Readonly<{
    exact: readonly string[];
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
export type SequencesOptions<Q extends Query, H> = Readonly<{
    entries: readonly (readonly [readonly string[], H])[];
    timeout?: number;
    to: Sink<Q, H>;
}>;
/**
 * Runs sequences, passing on every press that isn't one's
 * @template {Query} Q
 * @template {Handler} H
 * @param {SequencesOptions<Q, H>} options - Each sequence's steps' lookups with its handler; most ms between steps
 *   (default 1000); and where presses go on to
 * @returns {Sink<Q, H>} Where presses go
 */
declare function sequences<Q extends Query, H extends Handler>({ entries, timeout, to }: SequencesOptions<Q, H>): Sink<Q, H>;
export { sequences };
