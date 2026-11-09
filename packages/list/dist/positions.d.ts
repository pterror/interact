/**
 * Each key's index in an array, worked out once per array.
 */
/**
 * A key's index in an array
 * @template K
 * @param {readonly K[]} keys - The array
 * @param {K} key - The key
 * @returns {number | undefined} Its index, if it is there
 */
declare function indexIn<K>(keys: readonly K[], key: K): number | undefined;
export { indexIn };
