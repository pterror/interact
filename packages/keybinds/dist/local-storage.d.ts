/**
 * A storage for bindingStore() in localStorage, under one key. What is stored is read leniently: anything that isn't a
 * list of bindings in a field an override sets is left out. Storage that can't be read or written (private browsing,
 * a full quota) reads as no overrides, and overrides set then still apply until the page reloads. Another tab saving
 * is heard.
 */
export type Override = Readonly<{
    keys?: readonly string[];
    mouse?: readonly string[];
    pad?: readonly string[];
    axes?: readonly string[];
}>;
export type Overrides = Readonly<Record<string, Override>>;
/**
 * Overrides kept in localStorage
 * @param {string} key - The key they are kept under
 * @param {EventTarget} [view] - The window whose storage events say another tab saved (default the global one)
 * @returns {Readonly<{ load: () => Overrides, save: (overrides: Overrides) => void,
 *   subscribe: (listener: (overrides: Overrides) => void) => () => void }>} The storage
 */
declare function localStorageBindings(key: string, view?: EventTarget): Readonly<{
    load: () => Overrides;
    save: (overrides: Overrides) => void;
    subscribe: (listener: (overrides: Overrides) => void) => () => void;
}>;
export { localStorageBindings };
