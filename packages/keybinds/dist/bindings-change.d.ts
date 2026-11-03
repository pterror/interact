/**
 * What a BindingsStore dispatches when people's overrides change.
 */
import type { BindingOverrides } from './command.js';
/**
 * @import { BindingOverrides } from './command.js'
 */
/**
 * A BindingsStore's 'change': the overrides now. The bindings in effect are read from the store, by id
 */
declare class BindingsChangeEvent extends Event {
    /**
     * @readonly
     * @type {BindingOverrides}
     */
    readonly overrides: BindingOverrides;
    /** @param {BindingOverrides} overrides - The overrides now */
    constructor(overrides: BindingOverrides);
}
export { BindingsChangeEvent };
