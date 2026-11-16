/**
 * A Solid signal or memo as a Watched. A listener hears each change to the value as soon as Solid applies the write
 * that made it (in Solid 1 synchronously with it, or at the end of the batch it is in; in Solid 2 at the flush), and
 * only when the value is another one: an accessor that reran to the same value tells no one. Made inside a Solid
 * owner, it stops telling its listeners when that owner goes.
 */
import type { Accessor } from 'solid-js';
import type { Adapter } from './adapter.js';
export type Watched<T> = Readonly<{
    get: () => T;
    watch: (listener: () => void) => () => void;
}>;
/**
 * `toWatched` for a version of Solid
 * @param {Adapter} solid - The version's adapter
 * @returns {<T>(accessor: Accessor<T>) => Watched<T>} A signal or memo as a Watched
 */
declare function toWatchedWith(solid: Adapter): <T>(accessor: Accessor<T>) => Watched<T>;
export { toWatchedWith };
