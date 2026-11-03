/**
 * A CommandHub's components: the cheatsheet and the settings panel, made inside its host from the classes given, kept
 * in step with its commands, store and context, and the panel giving focus back when it closes. Menus, a palette and
 * command buttons follow the hub as a command system instead (`hub.commandSystem()`).
 */

/**
 * @import { KeybindCheatsheet } from './cheatsheet.js'
 * @import { Command, Context, Schema } from './command.js'
 * @import { KeybindSettings } from './settings.js'
 * @import { Input, InputUI } from './input.js'
 * @import { BindingsStore } from './store.js'
 */

import { createComponent } from './create-component.js'
import { FocusReturn } from './hub-focus.js'
import { isInputUI } from './input.js'

/**
 * A class to make a component from: an element class, and the kind its name ends in
 * @template {HTMLElement} E
 * @typedef {(new () => E) & Readonly<{ kind: string }>} ComponentClass
 */

/**
 * The components a hub makes inside its host and keeps in step, each as the class to make it from
 * @typedef {Readonly<{ cheatsheet?: ComponentClass<KeybindCheatsheet>, settings?: ComponentClass<KeybindSettings> }>}
 *   ComponentClasses
 */

/**
 * Makes a component inside the host, showing bindings through the inputs
 * @template {HTMLElement & { inputs: readonly InputUI[] }} E
 * @param {ComponentClass<E> | undefined} component - Its class
 * @param {Readonly<{ host: HTMLElement, shown: readonly InputUI[] }>} where - The host, and the inputs
 * @returns {E | undefined} The component, if there's a class for it
 */
function made(component, { host, shown }) {
  if (component === undefined) {
    return undefined
  }
  const element = createComponent(component)
  element.inputs = shown
  host.append(element)
  return element
}

/**
 * The inputs components show bindings through: all of them, as each must be shown and recorded
 * @param {readonly Input[]} inputs - The inputs
 * @returns {readonly InputUI[]} The same inputs
 * @throws {TypeError} If one is only an input, without its UI half
 */
function shownInputs(inputs) {
  const bare = inputs.find((input) => !isInputUI(input))
  if (bare !== undefined) {
    throw new TypeError(
      `CommandHub: components need inputs that can be shown; use ${bare.field}UI() from keybinds/${bare.field}-ui`,
    )
  }
  return inputs.filter((input) => isInputUI(input))
}

/**
 * The elements there are among some that may not be
 * @param {readonly (HTMLElement | undefined)[]} elements - The elements, undefined where there's none
 * @returns {HTMLElement[]} Those there are
 */
function present(elements) {
  /** @type {HTMLElement[]} */
  const there = []
  for (const element of elements) {
    if (element !== undefined) {
      there.push(element)
    }
  }
  return there
}

/** The components a hub keeps in step */
class HubComponents {
  /**
   * @readonly
   * @type {KeybindCheatsheet | undefined}
   */
  cheatsheet
  /**
   * @readonly
   * @type {KeybindSettings | undefined}
   */
  settings
  /**
   * @readonly
   * @type {FocusReturn}
   */
  #focus

  /**
   * Makes the components inside the host
   * @param {ComponentClasses} classes - The components to make
   * @param {Readonly<{ host: HTMLElement, inputs: readonly Input[], opened: () => void }>} where - The host, the
   *   inputs bindings are shown through, and what to do when the cheatsheet opens
   * @throws {TypeError} If an input can't be shown
   */
  constructor(classes, { host, inputs, opened }) {
    const where = { host, shown: shownInputs(inputs) }
    this.cheatsheet = made(classes.cheatsheet, where)
    this.settings = made(classes.settings, where)
    this.cheatsheet?.addEventListener('open', opened)
    this.#focus = new FocusReturn(present([this.settings]))
  }

  /**
   * Gives each component the commands, store and syntax as they are now
   * @param {Readonly<{ live: ReadonlyMap<string, Command>, store: BindingsStore<Schema> | undefined, syntax: Readonly<{ holds:
   *   boolean, releases: boolean, sequences: boolean }> }>} bindings - The hub's commands as they listen, its store, and
   *   which binding syntax is on
   * @returns {void}
   */
  show({ live, store, syntax }) {
    if (store === undefined) {
      return
    }
    this.#give([...live.values()])
    if (this.settings !== undefined) {
      this.settings.holds = syntax.holds
      this.settings.releases = syntax.releases
      this.settings.sequences = syntax.sequences
      this.settings.store = store
    }
  }

  /**
   * Gives the cheatsheet the commands that aren't hidden
   * @param {readonly Command[]} commands - The commands as they listen
   * @returns {void}
   */
  #give(commands) {
    if (this.cheatsheet !== undefined) {
      this.cheatsheet.commands = commands.filter((command) => command.hidden !== true)
    }
  }

  /**
   * Gives the cheatsheet the context now
   * @param {Context} context - The context
   * @returns {void}
   */
  sync(context) {
    if (this.cheatsheet !== undefined) {
      this.cheatsheet.context = context
    }
  }

  /**
   * Stops giving focus back
   * @returns {void}
   */
  stop() {
    this.#focus.stop()
  }
}

export { HubComponents }
