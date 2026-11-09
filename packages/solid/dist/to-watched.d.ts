/**
 * A Solid signal or memo as a Watched. A listener hears each change to the value, synchronously with the write that
 * made it (or at the end of the batch it is in), and only when the value is another one: an accessor that reran to
 * the same value tells no one. Made inside a Solid owner, it stops telling its listeners when that owner goes.
 */
import type { Accessor } from 'solid-js';
/**
 * A signal or memo as a Watched
 * @template T
 * @param {Accessor<T>} accessor - The signal, memo or derived function
 * @returns {Readonly<{ get: () => T, watch: (listener: () => void) => () => void }>} Its value now, and hearing it
 *   change
 */
declare function toWatched<T>(accessor: Accessor<T>): Readonly<{
    get: () => T;
    watch: (listener: () => void) => () => void;
}>;
export { toWatched };
