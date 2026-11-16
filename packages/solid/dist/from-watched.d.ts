/**
 * A Watched as a Solid accessor, owned by the Solid owner it is made in: it stops listening when that owner is
 * disposed.
 */
import type { Accessor } from 'solid-js';
import type { Adapter } from './adapter.js';
/**
 * `fromWatched` for a version of Solid
 * @param {Adapter} solid - The version's adapter
 * @returns {<T>(watched: Readonly<{ get: () => T, watch: (listener: () => void) => () => void }>) => Accessor<T>} A
 *   Watched as an accessor
 */
declare function fromWatchedWith(solid: Adapter): <T>(watched: Readonly<{
    get: () => T;
    watch: (listener: () => void) => () => void;
}>) => Accessor<T>;
export { fromWatchedWith };
