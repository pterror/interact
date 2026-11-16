/**
 * A Test as a Solid accessor per key: whether it holds for the key, rerunning a computation only when that changes.
 */
import type { Adapter } from './adapter.js';
export type Test<K> = Readonly<{
    has: (key: K) => boolean;
    watch: (listener: (keys?: readonly K[]) => void) => () => void;
}>;
/**
 * A Test: whether it holds for a key, and hearing the keys it changed for (none: any)
 * @template K
 * @typedef {Readonly<{ has: (key: K) => boolean, watch: (listener: (keys?: readonly K[]) => void) => () => void }>} Test
 */
/**
 * `fromTest` for a version of Solid
 * @param {Adapter} solid - The version's adapter
 * @returns {<K>(test: Test<K>) => (key: K) => boolean} A Test as an accessor
 */
declare function fromTestWith(solid: Adapter): <K>(test: Test<K>) => (key: K) => boolean;
export { fromTestWith };
