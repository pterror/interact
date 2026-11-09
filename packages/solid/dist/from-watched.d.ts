/**
 * A Watched as a Solid accessor, owned by the Solid owner it is made in: it stops listening when that owner is
 * disposed.
 */
import type { Accessor } from 'solid-js';
/**
 * A Watched as an accessor
 * @template T
 * @param {Readonly<{ get: () => T, watch: (listener: () => void) => () => void }>} watched - The value, and hearing it
 *   change
 * @returns {Accessor<T>} The value, tracked; computations rerun only when it is another value
 */
declare function fromWatched<T>(watched: Readonly<{
    get: () => T;
    watch: (listener: () => void) => () => void;
}>): Accessor<T>;
export { fromWatched };
