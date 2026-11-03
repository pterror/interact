/**
 * @import { KeybindCheatsheet } from './cheatsheet.js'
 * @import { AxisDef, AxisValue, Command, Context, Schema } from './command.js'
 * @import { CommandSystem, CommandSystemOptions } from './command-system.js'
 * @import { KeybindSettings } from './settings.js'
 * @import { CommandDefinition, Source } from './hub-commands.js'
 * @import { HubComponents } from './hub-components.js'
 * @import { CommandHubOptions } from './hub-options.js'
 * @import { Input } from './input.js'
 * @import { BindingsStore } from './store.js'
 */

import { listenFor, systemOf } from './command-system.js'
import { commandOf } from './definition.js'
import { HubBindings } from './hub-bindings.js'
import { HubContext } from './hub-context.js'
import { componentsOf, listenOptions, reporterFor, storageOf } from './hub-options.js'

/**
 * Every command on the page, from every source, with one store of people's rebindings. Sources are re-read on
 * refresh(); the hub lays people's overrides over their commands, listens, and keeps its components in step. Menus, a
 * palette and command buttons follow it as a command system (`commandSystem()`). What fails is left out and reported
 * as an `error` event, or to reportError()
 * @template {CommandDefinition} [D=Command] - What its sources give: commands, or definitions `adapt` turns into them
 * @template {Context} [C=Context] - The context `when` conditions see
 * @example
 *   const hub = new CommandHub({ context: () => ({ editing: editor.focused }), inputs: [keysUI()] })
 *   hub.setSource('editor', () => editorCommands)
 */
class CommandHub extends EventTarget {
  /**
   * @readonly
   * @type {HubBindings<D>}
   */
  #bindings
  /**
   * @readonly
   * @type {HubContext<C>}
   */
  #context
  /**
   * @readonly
   * @type {HubComponents | undefined}
   */
  #components
  /** @type {readonly Source<D>[]} */
  #sources = []
  /** @type {readonly Source<AxisDef>[]} */
  #axisSources = []
  #scope = 'global'

  /**
   * Makes the hub, and its components inside `host`
   * @param {CommandHubOptions<D, C>} options - Its context, inputs, storage and components
   * @throws {TypeError} If there are components but no host, or inputs they can't show
   */
  constructor(options) {
    super()
    this.#context = new HubContext(options.context)
    this.#bindings = new HubBindings({
      adapt: options.adapt ?? commandOf,
      changed: this.refresh.bind(this),
      options: listenOptions(options),
      report: reporterFor((event) => this.dispatchEvent(event)),
      storage: storageOf(options),
    })
    this.#components = componentsOf(options, this.syncContext.bind(this))
  }

  /** @returns {readonly Input[]} What it listens to */
  get inputs() {
    return this.#bindings.inputs
  }

  /** @returns {KeybindCheatsheet | undefined} The cheatsheet it made */
  get cheatsheet() {
    return this.#components?.cheatsheet
  }

  /** @returns {KeybindSettings | undefined} The settings panel it made */
  get settings() {
    return this.#components?.settings
  }

  /** @returns {BindingsStore<Schema> | undefined} The store of people's rebindings, as the settings panel edits it */
  get store() {
    return this.#bindings.store
  }

  /**
   * Replaces the commands owned by `owner` (undefined removes them), from refresh() on. Earlier sources win an id
   * @param {string} owner - Which part of the app they're from
   * @param {(() => readonly D[]) | undefined} get - Gives the commands, or their definitions
   * @returns {void}
   */
  setSource(owner, get) {
    this.#sources = [...this.#sources.filter((source) => source.owner !== owner), ...(get ? [{ get, owner }] : [])]
  }

  /**
   * Replaces the axes owned by `owner` (undefined removes them) from refresh() on, rebindable and read with axis(id)
   * @param {string} owner - Which part of the app they're from
   * @param {(() => readonly AxisDef[]) | undefined} get - Gives the axes
   * @returns {void}
   */
  setAxes(owner, get) {
    const others = this.#axisSources.filter((source) => source.owner !== owner)
    this.#axisSources = [...others, ...(get ? [{ get, owner }] : [])]
  }

  /**
   * Adds a part laid over the context `when` conditions see
   * @param {() => Partial<C>} get - Gives part of the context
   * @returns {() => void} A function that removes it again
   */
  addContext(get) {
    return this.#context.add(get)
  }

  /** @returns {C} The context now: the app's, with every part added laid over it, later ones over earlier */
  context() {
    return this.#context.now()
  }

  /**
   * Keeps rebindings per scope (a document type, a game) from refresh() on, so a key can mean different things in each
   * @param {string} scope - The scope
   * @returns {void}
   */
  setScope(scope) {
    this.#scope = scope
  }

  /**
   * @param {string} id - A command
   * @returns {boolean} Whether it's held right now: its press fired and that key or button hasn't come up
   */
  held(id) {
    return this.#bindings.held(id)
  }

  /**
   * @param {string} id - An axis
   * @returns {AxisValue} Its value right now; reading it takes the mouse movement since its last read
   */
  axis(id) {
    return this.#bindings.axis(id)
  }

  /** @returns {D[]} Every command or definition, as its source gave it */
  all() {
    return [...this.#bindings.commands.values()]
  }

  /**
   * @param {string} id - A command's id
   * @returns {D | undefined} The command or definition, as its source gave it
   */
  get(id) {
    return this.#bindings.commands.get(id)
  }

  /**
   * This hub as a command system, for a bridge to menus, a palette and buttons
   * @param {CommandSystemOptions} [options] - How it searches and ranks: a matcher, a scorer, a source of further
   *   commands
   * @returns {CommandSystem} The command system
   */
  commandSystem(options = {}) {
    return systemOf(
      {
        commands: () => [...this.#bindings.live.values()],
        context: () => this.context(),
        listen: (listener) => listenFor(this, 'context', listener),
        run: (id) => this.run(id),
        shortcut: (id) => this.#firstBinding(id),
      },
      options,
    )
  }

  /**
   * A command's first binding as people read it, through the first input that has one
   * @param {string} id - The command
   * @returns {string | undefined} The binding, if it has any
   */
  #firstBinding(id) {
    for (const input of this.inputs) {
      const [first] = input.axis === true ? [] : this.bindingsFor(id, input.field)
      if (first !== undefined) {
        return first
      }
    }
    return undefined
  }

  /**
   * Runs a command if it applies now
   * @param {string} id - The command
   * @param {Event} [event] - What made it run
   * @returns {boolean} Whether it ran
   */
  run(id, event) {
    const context = this.context()
    const command = this.#bindings.applying(id, context)
    if (command === undefined) {
      return false
    }
    command.execute(context, event)
    return true
  }

  /**
   * Re-reads the sources, rebuilds bindings and listeners, and updates every component
   * @returns {void}
   */
  refresh() {
    this.#bindings.rebuild({
      axisSources: this.#axisSources,
      context: () => this.context(),
      scope: this.#scope,
      sources: this.#sources,
    })
    this.#components?.show(this.#bindings)
    this.syncContext()
    this.dispatchEvent(new Event('refresh'))
  }

  /**
   * Pushes the context now into the cheatsheet, and tells whoever listens for `context` events (a command system's
   * bridge, so its menus, palette and buttons) that which commands apply may have changed
   * @returns {void}
   */
  syncContext() {
    this.#components?.sync(this.context())
    this.dispatchEvent(new Event('context'))
  }

  /**
   * A command's or axis's bindings through one input now, as shown to people ("Ctrl+Z" for keys, "Mouse ↔" for axes)
   * @param {string} id - The command or axis
   * @param {string} field - The input's field: "keys", "mouse", "gamepad", "axes"
   * @returns {string[]} The bindings
   */
  bindingsFor(id, field) {
    return this.#bindings.bindingsFor(id, field)
  }

  /**
   * Whether an event is one of a command's press bindings, for code that handles the press itself, like a drag that
   * should start on a rebindable mouse button
   * @param {string} id - The command
   * @param {Event} event - The event
   * @returns {boolean} Whether it is
   */
  matches(id, event) {
    return this.#bindings.matches(id, event)
  }

  /**
   * Stops listening, and detaches from the store
   * @returns {void}
   */
  destroy() {
    this.#bindings.stop()
    this.#components?.stop()
  }
}

export { CommandHub }
