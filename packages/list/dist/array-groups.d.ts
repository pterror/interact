/**
 * Keys held in memory in groups, each group in order and the groups in order, and the keys held from them. Its keys
 * are seen two ways: the rows (each group's header key, then its keys) and the options (the keys alone).
 */
import { arrayList } from './array-list.js';
export type Group<G, K> = readonly [G, readonly K[]];
export type Keys<K> = Readonly<{
    keys: () => readonly K[];
    watch: (listener: () => void) => () => void;
}>;
export type ArrayGroups<G, K> = Readonly<{
    groups: () => readonly Group<G, K>[];
    set: (groups: readonly Group<G, K>[]) => void;
    watch: (listener: () => void) => () => void;
    rows: Keys<K>;
    options: Keys<K>;
    sizes: Readonly<{
        get: () => readonly number[];
        watch: (listener: () => void) => () => void;
    }>;
    groupOf: (key: K) => G | undefined;
    headerOf: (group: G) => K;
    hold: ReturnType<typeof arrayList<K>>['hold'];
}>;
export type Views<G, K> = Readonly<{
    rows: readonly K[];
    options: readonly K[];
    sizes: readonly number[];
    groupOf: ReadonlyMap<K, G>;
}>;
/**
 * Keys in groups, in memory. Header keys are never among the keys
 * @template G, K
 * @param {Readonly<{ initial: readonly Group<G, K>[], headerOf: (group: G) => K }>} options - The groups, and each
 *   group's header key
 * @returns {ArrayGroups<G, K>} The groups
 */
declare function arrayGroups<G, K>({ headerOf, initial }: Readonly<{
    initial: readonly Group<G, K>[];
    headerOf: (group: G) => K;
}>): ArrayGroups<G, K>;
export { arrayGroups };
