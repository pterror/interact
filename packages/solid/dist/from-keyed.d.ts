/**
 * Something answered per key, with the keys whose answer changed heard (a Test's `has`, a node by key, ...), as a
 * Solid accessor per key. Only keys some computation is reading are followed (a key no computation reads any more is
 * let go in a microtask, so a computation rerunning keeps it), so a change reruns the computations that read a key it
 * names, and only when that key's answer is another one; a change naming no keys rereads the followed keys alone. It
 * is owned by the Solid owner it is made in, and stops listening when that is disposed.
 */
export type Followed<T> = {
    readonly get: () => T;
    readonly set: (value: T) => void;
    readers: number;
};
/**
 * A key some computation reads: its answer, setting it, and how many computations read it
 * @template T
 * @typedef {{ readonly get: () => T, readonly set: (value: T) => void, readers: number }} Followed
 */
/**
 * Answers per key as accessors
 * @template K, T
 * @param {(key: K) => T} read - A key's answer now
 * @param {(listener: (keys?: readonly K[]) => void) => () => void} watch - Hearing the keys whose answer changed (none:
 *   any)
 * @returns {(key: K) => T} A key's answer, tracked when read in a computation
 */
declare function fromKeyed<K, T>(read: (key: K) => T, watch: (listener: (keys?: readonly K[]) => void) => () => void): (key: K) => T;
export { fromKeyed };
