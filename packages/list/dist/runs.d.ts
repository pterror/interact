/**
 * Whether each key continues the run of the key before it: the two belong together by the app's own measure (one
 * author, close in time). A run has no header and no element of its own; this is a Test, for `mark`.
 */
export type Adjacent<K> = Readonly<{
    of: (key: K) => Readonly<{
        key: K | undefined;
    }> | undefined;
    watch: (listener: (keys?: readonly K[]) => void) => () => void;
}>;
export type Together<K> = Readonly<{
    has: (before: K, key: K) => boolean;
    watch: (listener: (keys?: readonly K[]) => void) => () => void;
}>;
export type RunsOptions<K> = Readonly<{
    before: Adjacent<K>;
    together: Together<K>;
}>;
/**
 * A key's neighbour (`undefined`: not known yet; a key of none: there is none), and hearing the keys whose neighbour
 * changed (none: any)
 * @template K
 * @typedef {Readonly<{
 *   of: (key: K) => Readonly<{ key: K | undefined }> | undefined,
 *   watch: (listener: (keys?: readonly K[]) => void) => () => void,
 * }>} Adjacent
 */
/**
 * Whether a key belongs with the key before it, now (false while what it depends on isn't known), and hearing the
 * keys whose item changed (none: any)
 * @template K
 * @typedef {Readonly<{
 *   has: (before: K, key: K) => boolean,
 *   watch: (listener: (keys?: readonly K[]) => void) => () => void,
 * }>} Together
 */
/**
 * @template K
 * @typedef {Readonly<{ before: Adjacent<K>, together: Together<K> }>} RunsOptions
 */
/**
 * Tests whether a key continues a run
 * @template K
 * @param {RunsOptions<K>} options - Each key's neighbour before it, and whether two keys belong together
 * @returns {Readonly<{ has: (key: K) => boolean, watch: (listener: (keys?: readonly K[]) => void) => () => void }>}
 *   The test
 */
declare function runs<K>({ before, together }: RunsOptions<K>): Readonly<{
    has: (key: K) => boolean;
    watch: (listener: (keys?: readonly K[]) => void) => () => void;
}>;
export { runs };
