/**
 * Opening and closing regions. Closing one that holds the active item first moves the active item to the region's
 * head, so the active item is never one that is no longer drawn.
 */
export type CollapseOptions<K> = Readonly<{
    closed: Readonly<{
        add: (key: K) => void;
        delete: (key: K) => void;
    }>;
    active: Readonly<{
        get: () => K | undefined;
        set: (key: K) => void;
    }>;
    inside: (key: K, region: K) => Promise<boolean>;
}>;
/**
 * @template K
 * @typedef {Readonly<{
 *   closed: Readonly<{ add: (key: K) => void, delete: (key: K) => void }>,
 *   active: Readonly<{ get: () => K | undefined, set: (key: K) => void }>,
 *   inside: (key: K, region: K) => Promise<boolean>,
 * }>} CollapseOptions
 */
/**
 * @template K
 * @param {CollapseOptions<K>} options - Where the closed regions are kept (the app's; `keySet` in memory), the active
 *   key, and whether a key is inside a region (the source answers, now or later)
 * @returns {Readonly<{ open: (region: K) => void, close: (region: K) => Promise<void> }>} Opening and closing
 */
declare function collapse<K>({ active, closed, inside }: CollapseOptions<K>): Readonly<{
    open: (region: K) => void;
    close: (region: K) => Promise<void>;
}>;
export { collapse };
