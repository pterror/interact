/**
 * CommandHub. Sources are re-read on refresh(); the hub lays people's overrides over their commands, listens, and keeps
 * its components and buttons in step. What fails is left out and reported as an `error` event, or to reportError().
 */

/**
 * @import { KeybindCheatsheet } from './cheatsheet.js'
 * @import { AxisDef, AxisValue, Command, Context } from './command.js'
 * @import { ContextMenu } from './components/context-menu.js'
 * @import { KeybindSettings } from './components/settings.js'
 * @import { CommandDefinition, Source } from './hub-commands.js'
 * @import { HubComponents } from './hub-components.js'
 * @import { CommandHubOptions } from './hub-options.js'
 * @import { Input } from './input.js'
 * @import { CommandPalette } from './palette.js'
 * @import { BindingsStore } from './store.js'
 */

import { HubBindings } from './hub-bindings.js'
import { CommandButtons } from './hub-buttons.js'
import { commandOf } from './hub-commands.js'
import { componentsOf, listenOptions, reporterFor, storageOf } from './hub-options.js'

/**
 * Every command on the page, from every source, with one store of people's rebindings
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
   * @type {() => C}
   */
  #base
  /**
   * @readonly
   * @type {HubComponents | undefined}
   */
  #components
  /** @type {readonly Source<D>[]} */
  #sources = []
  /** @type {readonly Source<AxisDef>[]} */
  #axisSources = []
  /** @type {readonly (() => Partial<C>)[]} */
  #contexts = []
  #scope = 'global'
  /** @readonly */
  #buttons = new CommandButtons({
    applies: (id) => this.#bindings.applying(id, this.context()) !== undefined,
    run: (id, event) => this.run(id, event),
  })

  /**
   * Makes the hub, and its components inside `host`
   * @param {CommandHubOptions<D, C>} options - Its context, inputs, storage and components
   * @throws {TypeError} If there are components but no host, or inputs they can't show
   */
  constructor(options) {
    super()
    this.#base = options.context
    this.#bindings = new HubBindings({
      adapt: options.adapt ?? commandOf,
      changed: this.refresh.bind(this),
      options: listenOptions(options),
      report: reporterFor(this),
      storage: storageOf(options),
    })
    this.#components = componentsOf(options, this.syncContext.bind(this))
  }

  /** @returns {readonly Input[]} What it listens to */
  get inputs() {
    return this.#bindings.inputs
  }

  /** @returns {CommandPalette | undefined} The palette it made */
  get palette() {
    return this.#components?.palette
  }

  /** @returns {KeybindCheatsheet | undefined} The cheatsheet it made */
  get cheatsheet() {
    return this.#components?.cheatsheet
  }

  /** @returns {KeybindSettings | undefined} The settings panel it made */
  get settings() {
    return this.#components?.settings
  }

  /** @returns {ContextMenu | undefined} The context menu it made */
  get menu() {
    return this.#components?.menu
  }

  /** @returns {BindingsStore | undefined} The store of people's rebindings, as the settings panel edits it */
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
   * Replaces the axes owned by `owner` (undefined removes them), from refresh() on. Axes are rebindable in the
   * settings panel like commands, and read with axis(id)
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
    this.#contexts = [...this.#contexts, get]
    return () => {
      this.#contexts = this.#contexts.filter((each) => each !== get)
    }
  }

  /** @returns {C} The context now: the app's, with every part added laid over it, later ones over earlier */
  context() {
    const context = { ...this.#base() }
    for (const get of this.#contexts) {
      Object.assign(context, get())
    }
    return context
  }

  /**
   * Keeps rebindings separately per scope (a document type, a game), so a key can mean different things in each,
   * from refresh() on
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
   * Pushes the context now into the components and command buttons, so commands that don't apply gray out
   * @returns {void}
   */
  syncContext() {
    this.#components?.sync(this.context())
    this.#buttons.paint()
  }

  /**
   * Opens the palette, with the commands as they are now
   * @returns {void}
   */
  openPalette() {
    if (this.palette !== undefined) {
      this.refresh()
      this.palette.open = true
    }
  }

  /**
   * Opens the context menu with the commands tagged `tag`, at a point on screen
   * @param {string} tag - The menu's tag
   * @param {number} x - Where, in pixels from the viewport's left
   * @param {number} y - Where, in pixels from the viewport's top
   * @returns {void}
   */
  openMenu(tag, x, y) {
    if (this.menu !== undefined) {
      this.syncContext()
      this.#components?.openMenu(tag, { x, y })
    }
  }

  /**
   * A command's or axis's bindings through one input right now, as shown to people ("Ctrl+Z" for keys, "Mouse ↔" for
   * axes)
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
   * Makes every element with `data-command="<id>"` under `root` run that command when clicked, and be disabled while
   * the command doesn't apply
   * @param {Element} root - Where the buttons are
   * @returns {() => void} A function that stops
   */
  bindButtons(root) {
    return this.#buttons.bind(root)
  }

  /**
   * Stops listening, and detaches from the store
   * @returns {void}
   */
  destroy() {
    this.#bindings.stop()
    this.#buttons.stop()
    this.#components?.stop()
  }
}

export { CommandHub }
