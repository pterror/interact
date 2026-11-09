/**
 * A Solid signal or memo of keys as a Drawn, for a list whose keys Solid holds.
 */
import type { Accessor } from 'solid-js';
/**
 * Keys in a signal or memo as a Drawn
 * @template K
 * @param {Accessor<readonly K[]>} accessor - The keys, in order, each once
 * @returns {Readonly<{ keys: () => readonly K[], watch: (listener: () => void) => () => void }>} The keys now, and
 *   hearing them change
 */
declare function toDrawn<K>(accessor: Accessor<readonly K[]>): Readonly<{
    keys: () => readonly K[];
    watch: (listener: () => void) => () => void;
}>;
export { toDrawn };
