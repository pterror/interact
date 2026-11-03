/**
 * Running commands in the app's context, for every input alike: whether one may run for a press, and running it.
 */

/**
 * @import { Command, Context } from './command.js'
 * @import { KeybindsOptions, Phase } from './core.js'
 * @import { PressWhere } from './input.js'
 */

import { isActive } from './command.js'

/** Running commands, for every input alike */
class Runner {
  /**
   * @readonly
   * @type {() => Context}
   */
  #context
  /**
   * @readonly
   * @type {KeybindsOptions}
   */
  #options
  /**
   * @readonly
   * @type {readonly Phase[]}
   */
  #phases

  /**
   * Runs commands in the app's context
   * @param {() => Context} context - The app's state now
   * @param {KeybindsOptions} options - What keybinds() was given
   */
  constructor(context, options) {
    this.#context = context
    this.#options = options
    this.#phases = [options.releases, options.holds].filter((phase) => phase !== undefined)
  }

  /** @returns {KeybindsOptions} What keybinds() was given */
  get options() {
    return this.#options
  }

  /** @returns {readonly Phase[]} The phases that are on */
  get phases() {
    return this.#phases
  }

  /** @returns {Context} The app's state now */
  context() {
    return this.#context()
  }

  /**
   * Whether a command applies now
   * @param {Command} command - The command
   * @returns {boolean} Whether it does
   */
  active(command) {
    return isActive(command, this.#context())
  }

  /**
   * Whether a command may run for a press
   * @param {Command} command - The command
   * @param {PressWhere} where - Where the press happened
   * @returns {boolean} Whether it may
   */
  allowed(command, where) {
    return where.blocked !== true && (where.inInput !== true || command.captureInput === true) && this.active(command)
  }

  /**
   * Runs a command; unless it returns false, it takes the event
   * @param {Command} command - The command
   * @param {Event} event - What triggered it
   * @returns {boolean} Whether it took the event
   */
  execute(command, event) {
    const context = this.#context()
    if (command.execute(context, event) === false) {
      return false
    }
    event.preventDefault()
    event.stopPropagation()
    this.#options.onExecute?.(command, context)
    return true
  }
}

export { Runner }
