/**
 * A CommandHub's components: made inside its host from the classes given, kept in step with its commands, store and
 * context, and giving focus back when an overlay closes.
 */

/**
 * @import { KeybindCheatsheet } from './cheatsheet.js'
 * @import { Command, Context, Schema } from './command.js'
 * @import { ContextMenu } from './components/context-menu.js'
 * @import { KeybindSettings } from './components/settings.js'
 * @import { Input, InputUI } from './input.js'
 * @import { CommandPalette } from './palette.js'
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
 * @typedef {Readonly<{ cheatsheet?: ComponentClass<KeybindCheatsheet>, menu?: ComponentClass<ContextMenu>,
 *   palette?: ComponentClass<CommandPalette>, settings?: ComponentClass<KeybindSettings> }>} ComponentClasses
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
   * @type {CommandPalette | undefined}
   */
  palette
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
   * @type {ContextMenu | undefined}
   */
  menu
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
    this.palette = made(classes.palette, where)
    this.cheatsheet = made(classes.cheatsheet, where)
    this.settings = made(classes.settings, where)
    this.menu = made(classes.menu, where)
    this.cheatsheet?.addEventListener('open', opened)
    this.#focus = new FocusReturn(present([this.palette, this.settings, this.menu]))
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
      Object.assign(this.settings, { ...syntax, store })
    }
  }

  /**
   * Gives the palette and cheatsheet the commands that aren't hidden, and the menu all of them
   * @param {readonly Command[]} commands - The commands as they listen
   * @returns {void}
   */
  #give(commands) {
    const visible = commands.filter((command) => command.hidden !== true)
    if (this.palette !== undefined) {
      this.palette.commands = visible
    }
    if (this.cheatsheet !== undefined) {
      this.cheatsheet.commands = visible
    }
    if (this.menu !== undefined) {
      this.menu.commands = commands
    }
  }

  /**
   * Opens the context menu with the commands tagged `tag`, at a point on screen
   * @param {string} tag - The menu's tag
   * @param {Readonly<{ x: number, y: number }>} position - Where, in viewport pixels
   * @returns {void}
   */
  openMenu(tag, position) {
    if (this.menu !== undefined) {
      Object.assign(this.menu, { menu: tag, position })
      this.menu.open = true
    }
  }

  /**
   * Gives the components the context now. An open palette or menu keeps acting on where it was opened from, though
   * taking focus changed the context
   * @param {Context} context - The context
   * @returns {void}
   */
  sync(context) {
    if (this.palette !== undefined && !this.palette.open) {
      this.palette.context = context
    }
    if (this.cheatsheet !== undefined) {
      this.cheatsheet.context = context
    }
    if (this.menu !== undefined && !this.menu.open) {
      this.menu.context = context
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
