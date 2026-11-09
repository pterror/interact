/**
 * A set of keys in memory, such as closed regions: for tests, and for an app that keeps them nowhere else. An app that
 * keeps them (on its server, with the view) gives its own implementation of the same shape instead.
 */
export type KeySet<K> = Readonly<{
    has: (key: K) => boolean;
    add: (key: K) => void;
    delete: (key: K) => void;
    watch: (listener: (keys?: readonly K[]) => void) => () => void;
}>;
/**
 * @template K
 * @typedef {Readonly<{
 *   has: (key: K) => boolean,
 *   add: (key: K) => void,
 *   delete: (key: K) => void,
 *   watch: (listener: (keys?: readonly K[]) => void) => () => void,
 * }>} KeySet
 */
/**
 * Holds keys
 * @template K
 * @param {readonly K[]} [initial] - The keys it starts with (default: none)
 * @returns {KeySet<K>} The set; listeners hear each key added or deleted
 */
declare function keySet<K>(initial?: readonly K[]): KeySet<K>;
export { keySet };
