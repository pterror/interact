/**
 * People's rebindings, kept in a storage: read, set (and saved), and heard changing, from here or from elsewhere when
 * the storage can say so (another tab, an undo, sync).
 */
export type Overrides = Readonly<Record<string, Readonly<{
    keys?: readonly string[];
    mouse?: readonly string[];
    pad?: readonly string[];
    axes?: readonly string[];
}>>>;
export type Storage = Readonly<{
    load: () => Overrides;
    save: (overrides: Overrides) => void;
    subscribe?: (listener: (overrides: Overrides) => void) => () => void;
}>;
/**
 * A person's rebindings, by id: only the fields they changed
 * @typedef {Readonly<Record<string, Readonly<{ keys?: readonly string[], mouse?: readonly string[],
 *   pad?: readonly string[], axes?: readonly string[] }>>>} Overrides
 */
/**
 * Where overrides are kept; `subscribe` hears them changed elsewhere, and returns stopping
 * @typedef {Readonly<{
 *   load: () => Overrides,
 *   save: (overrides: Overrides) => void,
 *   subscribe?: (listener: (overrides: Overrides) => void) => () => void,
 * }>} Storage
 */
/**
 * The overrides, kept in a storage
 * @param {Storage} storage - Where they are kept
 * @returns {Readonly<{ get: () => Overrides, watch: (listener: () => void) => () => void,
 *   set: (overrides: Overrides) => void, stop: () => void }>} The overrides now; hearing them change; setting them
 *   (in place of the ones before), which saves them; and no longer following the storage
 * @example
 * const overrides = bindingStore(localStorageBindings('app:keys'))
 * overrides.set({ save: { keys: ['$mod+shift+s'] } })
 */
declare function bindingStore(storage: Storage): Readonly<{
    get: () => Overrides;
    watch: (listener: () => void) => () => void;
    set: (overrides: Overrides) => void;
    stop: () => void;
}>;
export { bindingStore };
