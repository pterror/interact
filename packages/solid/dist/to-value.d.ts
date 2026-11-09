/**
 * A Solid signal or memo as a Value: read when asked, never tracked by whatever Solid computation asks.
 */
import type { Accessor } from 'solid-js';
/**
 * A signal or memo as a Value
 * @template T
 * @param {Accessor<T>} accessor - The signal, memo or derived function
 * @returns {() => T} Its value now
 */
declare function toValue<T>(accessor: Accessor<T>): () => T;
export { toValue };
