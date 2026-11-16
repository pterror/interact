/**
 * A Solid signal or memo of keys as a Drawn, for a list whose keys Solid holds.
 */
import type { Accessor } from 'solid-js';
import type { Adapter } from './adapter.js';
export type Drawn<K> = Readonly<{
    keys: () => readonly K[];
    watch: (listener: () => void) => () => void;
}>;
/**
 * Keys now, and hearing them change
 * @template K
 * @typedef {Readonly<{ keys: () => readonly K[], watch: (listener: () => void) => () => void }>} Drawn
 */
/**
 * `toDrawn` for a version of Solid
 * @param {Adapter} solid - The version's adapter
 * @returns {<K>(accessor: Accessor<readonly K[]>) => Drawn<K>} Keys in a signal or memo as a Drawn
 */
declare function toDrawnWith(solid: Adapter): <K>(accessor: Accessor<readonly K[]>) => Drawn<K>;
export { toDrawnWith };
