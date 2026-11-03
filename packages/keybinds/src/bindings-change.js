/**
 * What a BindingsStore dispatches when people's overrides change.
 */

/**
 * @import { BindingOverrides } from './command.js'
 */

/**
 * A BindingsStore's 'change': the overrides now. The bindings in effect are read from the store, by id
 */
class BindingsChangeEvent extends Event {
  /**
   * @readonly
   * @type {BindingOverrides}
   */
  overrides

  /** @param {BindingOverrides} overrides - The overrides now */
  constructor(overrides) {
    super('change')
    this.overrides = overrides
  }
}

export { BindingsChangeEvent }
