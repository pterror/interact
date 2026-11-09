/**
 * Moving a key next to another in groups held in memory, into the other key's group; a group's header as the target
 * puts the key first in that group.
 */
export type Group<G, K> = readonly [G, readonly K[]];
export type Groups<G, K> = Readonly<{
    groups: () => readonly Group<G, K>[];
    set: (groups: readonly Group<G, K>[]) => void;
    groupOf: (key: K) => G | undefined;
    headerOf: (group: G) => K;
}>;
/**
 * @template G, K
 * @typedef {readonly [G, readonly K[]]} Group
 */
/**
 * @template G, K
 * @typedef {Readonly<{
 *   groups: () => readonly Group<G, K>[],
 *   set: (groups: readonly Group<G, K>[]) => void,
 *   groupOf: (key: K) => G | undefined,
 *   headerOf: (group: G) => K,
 * }>} Groups
 */
/**
 * @template G, K
 * @param {Groups<G, K>} groups - The groups
 * @returns {(key: K, target: K, after: boolean) => void} Moves `key` just after or before `target`, or first in the
 *   group whose header `target` is; nothing if either isn't there
 */
declare function groupReorder<G, K>(groups: Groups<G, K>): (key: K, target: K, after: boolean) => void;
export { groupReorder };
