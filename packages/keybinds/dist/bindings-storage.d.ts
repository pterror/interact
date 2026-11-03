/**
 * Where a BindingsStore keeps people's overrides, and the one that keeps them in localStorage.
 */
import type { BindingOverrides } from './command.js';
export type BindingsStorageFields = {
    /**
     * - The current overrides
     */
    load: () => BindingOverrides;
    /**
     * - Keeps new overrides
     */
    save: (overrides: BindingOverrides) => void;
    /**
     * - Follows changes made
     * elsewhere; returns a function that stops
     */
    subscribe?: (onChange: (overrides: BindingOverrides) => void) => () => void;
};
export type BindingsStorage = Readonly<BindingsStorageFields>;
/**
 * Storage that keeps overrides in localStorage under one key. Unreadable or unavailable storage (private browsing, a
 * full quota) reads as no overrides, and overrides saved then still apply until the page reloads
 * @param {string} key - The key
 * @returns {BindingsStorage} The storage
 */
declare function localStorageBindings(key: string): BindingsStorage;
export { localStorageBindings };
