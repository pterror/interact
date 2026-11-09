/**
 * A value handed on once it has stopped changing for a while, so a change made in many small steps (typing) is handed
 * on once, after a pause. `flush` hands on a change still waiting now (a field losing focus); `stop` drops it.
 */
export type Watched<T> = Readonly<{
    get: () => T;
    watch: (listener: () => void) => () => void;
}>;
export type RestedOptions<T> = Readonly<{
    value: Watched<T>;
    to: (value: T) => void;
    rest?: number;
}>;
/**
 * @template T
 * @typedef {Readonly<{ get: () => T, watch: (listener: () => void) => () => void }>} Watched
 */
/**
 * @template T
 * @typedef {Readonly<{ value: Watched<T>, to: (value: T) => void, rest?: number }>} RestedOptions
 */
/**
 * Hands on a value once it rests
 * @template T
 * @param {RestedOptions<T>} options - The value, where it goes, and how long it rests first (default 800 ms)
 * @returns {Readonly<{ flush: () => void, waiting: () => boolean, stop: () => void }>} Handing on what waits now,
 *   whether a change waits, and stopping
 */
declare function rested<T>({ rest, to, value }: RestedOptions<T>): Readonly<{
    flush: () => void;
    waiting: () => boolean;
    stop: () => void;
}>;
export { rested };
