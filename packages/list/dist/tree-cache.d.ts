/**
 * The answers a server gives about a tree drawn by its top level: for a span of top-level ranks, each top-level node
 * with its subtree, cut short at every level. It holds the latest answers, gives the top-level keys to `windowing`,
 * and each node's children to the list drawn inside it. Ranks exist only at the top level.
 */
export type TreeCacheOptions<K, N> = Readonly<{
    fetch: (from: number, to: number) => Promise<readonly N[]>;
    locate: (key: K) => Promise<number | undefined>;
    changes: Readonly<{
        watch: (listener: () => void) => () => void;
    }>;
}>;
export type TreeCache<K, N> = Readonly<{
    keysAt: (from: number, to: number) => Promise<readonly K[]>;
    watch: (listener: () => void) => () => void;
    locate: (key: K) => Promise<number | undefined>;
    children: (key: K) => Readonly<{
        keys: () => readonly K[];
        watch: (listener: () => void) => () => void;
    }>;
    node: (key: K) => N | undefined;
    watchNodes: (listener: (keys?: readonly K[]) => void) => () => void;
}>;
/**
 * Holds a server's answers about a tree
 * @template K
 * @template {Readonly<{ key: K, children?: readonly N[] }>} N
 * @param {TreeCacheOptions<K, N>} options - The server's top-level nodes for a span of ranks, a top-level key's rank,
 *   and hearing the tree change
 * @returns {TreeCache<K, N>} The top-level keys at ranks, a top-level key's rank (with its node fetched), each node's
 *   children, each node, and hearing the keys whose node now says something else about itself
 */
declare function treeCache<K, N extends Readonly<{
    key: K;
    children?: readonly N[];
}>>({ changes, fetch, locate }: TreeCacheOptions<K, N>): TreeCache<K, N>;
export { treeCache };
