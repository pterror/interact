/**
 * Choosing by platform, with the same idea of a Mac as `$mod` and the symbols modifiers show: a command whose default
 * binding differs on a Mac gives both, `keys: byPlatform({ mac: ['alt+Escape'], other: ['ctrl+Space'] })`.
 */
/**
 * The choice for this platform
 * @template T
 * @param {Readonly<{ mac: T, other: T }>} choices - What to use on a Mac, and elsewhere
 * @param {boolean} [onMac] - Whether this is a Mac (default: whether it is, as `$mod` has it)
 * @returns {T} The Mac's choice on a Mac, the other otherwise
 */
declare function byPlatform<T>({ mac, other }: Readonly<{
    mac: T;
    other: T;
}>, onMac?: boolean): T;
export { byPlatform };
