/**
 * The CommandHub: every command on the page from every source, the store of people's rebindings over them, keybinds()
 * listening with the result, the context `when` conditions see, and the cheatsheet and settings panel it makes and
 * keeps in step. Menus, a palette and command buttons follow it as a command system instead (`hub.commandSystem()`).
 */

/**
 * @import { AnyModifiers } from './any-modifiers.js'
 * @import { BindingsStorage } from './bindings-storage.js'
 * @import { KeybindCheatsheet } from './cheatsheet.js'
 * @import { AxisDef, AxisValue, BindingField, BindingSchema, Command, Context, Schema } from './command.js'
 * @import { CommandSystem, CommandSystemOptions } from './command-system.js'
 * @import { Keybinds, KeybindsOptions, Phase } from './core.js'
 * @import { Input, InputUI } from './input.js'
 * @import { Sequences } from './sequences.js'
 * @import { KeybindSettings } from './settings.js'
 */

import { formatBinding } from './binding-format.js'
import { localStorageBindings } from './bindings-storage.js'
import { listenFor, systemOf } from './command-system.js'
import { isActive } from './command.js'
import { keybinds, validateCommands } from './core.js'
import { createComponent } from './create-component.js'
import { isInputUI } from './input.js'
import { BindingsStore } from './store.js'

const STILL = { delta: 0, position: 0 }

const NO_BINDINGS = { gamepad: [], keys: [], mouse: [] }

/**
 * Commands or axes owned by one part of the app, re-read on refresh
 * @template {Readonly<{ id: string }>} T
 * @typedef {Readonly<{ get: () => readonly T[], owner: string }>} Source
 */

/**
 * Where a failure goes: one source or binding failing mustn't take the others down with it
 * @typedef {(error: Error) => void} Report
 */

/**
 * What a source gives the hub: a command, or a definition of one in the app's own shape that `adapt` turns into a
 * command. It has what the schema of people's rebindings is made from
 * @typedef {Readonly<{ category?: string | undefined, description?: string | undefined, gamepad?: readonly string[] |
 *   undefined, hidden?: boolean | undefined, id: string, keys?: readonly string[] | undefined, label: string,
 *   mouse?: readonly string[] | undefined }>} CommandDefinition
 */

/**
 * Turns a definition into a command
 * @template {CommandDefinition} D
 * @typedef {(definition: D) => Command} Adapt
 */

/**
 * Bindings through each kind of trigger input
 * @typedef {Readonly<{ [field in BindingField]?: readonly string[] | undefined }>} FieldBindings
 */

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
 * @typedef {object} CommandHubFields
 * @property {readonly Input[]} [inputs] - What to listen to: [keys(), mouse()]. With components, their UI halves,
 *   which can also be shown and recorded: [keysUI(), mouseUI()]
 * @property {ComponentClasses} [components] - Components to make inside `host`
 * @property {HTMLElement} [host] - Where the components go
 * @property {string} [storageKey] - localStorage key for people's rebindings (default "keybinds"); the scope is
 *   appended
 * @property {(scope: string) => BindingsStorage} [storage] - Keeps rebindings somewhere other than localStorage,
 *   separately per scope, in place of `storageKey`
 * @property {Phase} [releases] - From releases(), for release bindings ("k:up")
 * @property {Phase} [holds] - From holds(), for "k:hold" and "k:tap"
 * @property {Sequences} [sequences] - From sequences(), for bindings of several steps ("g i")
 * @property {AnyModifiers} [anyModifiers] - From anyModifiers(), for commands with `anyModifiers`
 * @property {Omit<KeybindsOptions, 'anyModifiers' | 'axes' | 'holds' | 'inputs' | 'releases' | 'sequences'>} [listen]
 *   - Passed on to keybinds(): target, capture, onExecute
 */

/**
 * What a CommandHub is made with, besides its definitions' adapt and its context
 * @typedef {Readonly<CommandHubFields>} HubSettings
 */

/**
 * What a CommandHub is made with: `context` gives the app's state, which parts added with addContext() are laid over;
 * `adapt` turns the sources' definitions into commands, when they aren't commands already
 * @template {CommandDefinition} D
 * @template {Context} C
 * @typedef {HubSettings & Readonly<{ adapt?: Adapt<D>, context: () => C }>} CommandHubOptions
 */

/**
 * Whether a value is a list of strings
 * @param {unknown} value - The value
 * @returns {value is readonly string[]} Whether it is
 */
function isStrings(value) {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

/**
 * A field of a definition beyond what its type says, which must be absent or one type
 * @template V
 * @param {CommandDefinition} definition - The definition
 * @param {string} field - The field
 * @param {(value: unknown) => value is V} is - Whether a value is of its type
 * @returns {V | undefined} Its value, or undefined if it has none of its own
 * @throws {TypeError} If it holds anything else
 */
function optional(definition, field, is) {
  /** @type {unknown} */
  const value = Object.hasOwn(definition, field) ? Reflect.get(definition, field) : undefined
  if (value !== undefined && !is(value)) {
    throw new TypeError(`"${definition.id}" has a ${field} that isn't one`)
  }
  return value
}

/**
 * @param {unknown} value - A value
 * @returns {value is boolean} Whether it's a boolean
 */
function isBoolean(value) {
  return typeof value === 'boolean'
}

/**
 * @param {unknown} value - A value
 * @returns {value is number} Whether it's a number
 */
function isNumber(value) {
  return typeof value === 'number'
}

/**
 * @param {unknown} value - A value
 * @returns {value is string | readonly string[]} Whether it's menu tags
 */
function isMenu(value) {
  return typeof value === 'string' || isStrings(value)
}

/**
 * @param {unknown} value - A value
 * @returns {value is Function} Whether it's a function
 */
function isFunction(value) {
  return typeof value === 'function'
}

/**
 * A definition as a command, when it is one: it has a function to run, and each field a command has beyond a
 * definition's is absent or of the command's type; its `when` holds when its answer is truthy. The default `adapt`
 * @param {CommandDefinition} definition - The definition
 * @returns {Command} The command, running the definition's `execute`
 * @throws {TypeError} If it has no `execute` function, so the hub needs an `adapt` for it, or a field of the wrong type
 */
function commandOf(definition) {
  const run = optional(definition, 'execute', isFunction)
  if (run === undefined) {
    throw new TypeError(`"${definition.id}" has no execute function; give the hub an adapt for its definitions`)
  }
  const when = optional(definition, 'when', isFunction)
  return {
    ...definition,
    anyModifiers: optional(definition, 'anyModifiers', isBoolean),
    captureInput: optional(definition, 'captureInput', isBoolean),
    execute: (context, event) => {
      /** @type {unknown} */
      const result = Reflect.apply(run, definition, [context, event])
      return result
    },
    menu: optional(definition, 'menu', isMenu),
    rank: optional(definition, 'rank', isNumber),
    when: when === undefined ? undefined : (context) => Boolean(Reflect.apply(when, definition, [context])),
  }
}

/**
 * Everything the sources give, the earlier source winning an id; a source that throws gives nothing
 * @template {Readonly<{ id: string }>} T
 * @param {readonly Source<T>[]} sources - The sources
 * @param {string} kind - What they give: "command", "axis"
 * @param {Report} report - Where failures go
 * @returns {Map<string, T>} What they gave, by id
 */
function fromSources(sources, kind, report) {
  /** @type {Map<string, T>} */
  const found = new Map()
  for (const { get, owner } of sources) {
    try {
      for (const item of get()) {
        if (!found.has(item.id)) {
          found.set(item.id, item)
        }
      }
    } catch (error) {
      report(new Error(`keybinds: ${kind} source "${owner}" threw`, { cause: error }))
    }
  }
  return found
}

/**
 * The schema of every command and axis, by id: a command's bindings as people can rebind them are keys always, and
 * its other bindings through the inputs listened to
 * @param {ReadonlyMap<string, CommandDefinition>} commands - The commands' definitions
 * @param {ReadonlyMap<string, AxisDef>} axes - The axes
 * @param {readonly BindingField[]} fields - The inputs' fields
 * @returns {Schema} The schema
 */
function schemaOf(commands, axes, fields) {
  /** @type {Map<string, BindingSchema>} */
  const schema = new Map()
  for (const command of commands.values()) {
    schema.set(command.id, {
      category: command.category,
      description: command.description,
      hidden: command.hidden,
      keys: command.keys ?? [],
      label: command.label,
      ...(fields.includes('gamepad') && command.gamepad !== undefined ? { gamepad: command.gamepad } : {}),
      ...(fields.includes('mouse') && command.mouse !== undefined ? { mouse: command.mouse } : {}),
    })
  }
  for (const { axes: sources, category, description, hidden, id, label } of axes.values()) {
    schema.set(id, { axes: sources, category, description, hidden, label })
  }
  return Object.fromEntries(schema)
}

/**
 * A command with its bindings through the inputs replaced
 * @param {Command} command - The command
 * @param {FieldBindings | undefined} bindings - Its bindings in effect
 * @param {readonly BindingField[]} fields - The inputs' fields
 * @returns {Command} The command as it listens
 */
function rebound(command, bindings, fields) {
  return {
    ...command,
    ...(fields.includes('gamepad') ? { gamepad: bindings?.gamepad } : {}),
    ...(fields.includes('keys') ? { keys: bindings?.keys } : {}),
    ...(fields.includes('mouse') ? { mouse: bindings?.mouse } : {}),
  }
}

/**
 * Makes a component inside the host, showing bindings through the inputs
 * @template {HTMLElement & { inputs: readonly InputUI[] }} E
 * @param {ComponentClass<E> | undefined} component - Its class
 * @param {HTMLElement} host - Where it goes
 * @param {readonly InputUI[]} shown - The inputs
 * @returns {E | undefined} The component, if there's a class for it
 */
function made(component, host, shown) {
  if (component === undefined) {
    return undefined
  }
  const element = createComponent(component)
  element.inputs = shown
  host.append(element)
  return element
}

/**
 * The element a node's shadow tree is attached to, if it's in one
 * @param {Element} node - The node
 * @returns {Element | undefined} Its shadow host
 */
function hostOf(node) {
  const root = node.getRootNode()
  return root instanceof ShadowRoot ? root.host : undefined
}

/**
 * Giving focus back: closing the settings panel returns focus to where it was outside the overlays (the text being
 * edited, say), before the chosen command runs; the command can still move it elsewhere
 */
class FocusReturn {
  /**
   * @readonly
   * @type {readonly HTMLElement[]}
   */
  #overlays
  /** @type {HTMLElement | undefined} */
  #last

  /**
   * Starts following focus, and the overlays closing
   * @param {readonly HTMLElement[]} overlays - The settings panel, if there is one
   */
  constructor(overlays) {
    this.#overlays = overlays
    document.addEventListener('focusin', this, true)
    for (const overlay of overlays) {
      overlay.addEventListener('close', this)
    }
  }

  /**
   * Notes where focus went, unless it's inside a component, even in a component's shadow DOM, which isn't somewhere to
   * come back to; or gives it back when an overlay closes, if focus is lost: nowhere, on the page itself, or still in
   * the overlay
   * @param {Event} event - A focusin, or an overlay's close
   * @returns {void}
   */
  handleEvent(event) {
    const { target } = event
    if (event.type === 'close') {
      const overlay = this.#overlays.find((each) => each === target)
      const now = document.activeElement
      const lost =
        overlay !== undefined &&
        (now === null ||
          now === document.body ||
          now === overlay ||
          overlay.contains(now) ||
          now.getRootNode() === overlay.shadowRoot)
      if (lost && this.#last?.isConnected === true) {
        this.#last.focus({ preventScroll: true })
      }
      return
    }
    if (!(target instanceof HTMLElement)) {
      return
    }
    /** @type {Element | undefined} */
    let node = target
    while (node !== undefined) {
      if (node.closest('[data-keybinds]') !== null) {
        return
      }
      node = hostOf(node)
    }
    this.#last = target
  }

  /**
   * Stops following focus
   * @returns {void}
   */
  stop() {
    document.removeEventListener('focusin', this, true)
    for (const overlay of this.#overlays) {
      overlay.removeEventListener('close', this)
    }
  }
}

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
   * Gives the app's context
   * @readonly
   * @type {() => C}
   */
  #base
  /**
   * The parts laid over the app's context, later ones over earlier
   * @type {readonly (() => Partial<C>)[]}
   */
  #parts = []
  /**
   * @readonly
   * @type {Adapt<D>}
   */
  #adapt
  /**
   * What keybinds() is given besides the commands and axes: the listening options, the inputs, and the syntax that's on
   * @readonly
   * @type {KeybindsOptions}
   */
  #options
  /**
   * Where people's rebindings are kept, per scope
   * @readonly
   * @type {(scope: string) => BindingsStorage}
   */
  #storage
  /** @readonly */
  #changed = this.refresh.bind(this)
  /** @type {ReadonlyMap<string, D>} */
  #commands = new Map()
  /**
   * Every command as it listens, with people's rebindings, by id
   * @type {ReadonlyMap<string, Command>}
   */
  #live = new Map()
  /** @type {BindingsStore<Schema> | undefined} */
  #store
  /** @type {Keybinds | undefined} */
  #unbind
  /**
   * @readonly
   * @type {KeybindCheatsheet | undefined}
   */
  #cheatsheet
  /**
   * @readonly
   * @type {KeybindSettings | undefined}
   */
  #settings
  /**
   * @readonly
   * @type {FocusReturn | undefined}
   */
  #focus
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
    this.#base = options.context
    this.#adapt = options.adapt ?? commandOf
    const { anyModifiers, components, holds, host, inputs = [], releases, sequences, storage } = options
    const { storageKey = 'keybinds' } = options
    this.#options = {
      ...options.listen,
      inputs: options.inputs ?? [],
      ...(anyModifiers === undefined ? {} : { anyModifiers }),
      ...(holds === undefined ? {} : { holds }),
      ...(releases === undefined ? {} : { releases }),
      ...(sequences === undefined ? {} : { sequences }),
    }
    this.#storage = storage ?? ((scope) => localStorageBindings(`${storageKey}:${scope}`))
    if (components === undefined || Object.keys(components).length === 0) {
      return
    }
    if (host === undefined) {
      throw new TypeError('CommandHub: components need a host to go in')
    }
    // Components show and record bindings through every input, so each needs its UI half
    const bare = inputs.find((input) => !isInputUI(input))
    if (bare !== undefined) {
      throw new TypeError(
        `CommandHub: components need inputs that can be shown; use ${bare.field}UI() from keybinds/${bare.field}-ui`,
      )
    }
    const shown = inputs.filter((input) => isInputUI(input))
    this.#cheatsheet = made(components.cheatsheet, host, shown)
    this.#settings = made(components.settings, host, shown)
    this.#cheatsheet?.addEventListener('open', this.syncContext.bind(this))
    this.#focus = new FocusReturn(this.#settings === undefined ? [] : [this.#settings])
  }

  /** @returns {readonly Input[]} What it listens to */
  get inputs() {
    return this.#options.inputs ?? []
  }

  /** @returns {KeybindCheatsheet | undefined} The cheatsheet it made */
  get cheatsheet() {
    return this.#cheatsheet
  }

  /** @returns {KeybindSettings | undefined} The settings panel it made */
  get settings() {
    return this.#settings
  }

  /** @returns {BindingsStore<Schema> | undefined} The store of people's rebindings, as the settings panel edits it */
  get store() {
    return this.#store
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
    this.#parts = [...this.#parts, get]
    return () => {
      this.#parts = this.#parts.filter((each) => each !== get)
    }
  }

  /** @returns {C} The context now: the app's, with every part added laid over it, later ones over earlier */
  context() {
    const context = { ...this.#base() }
    for (const get of this.#parts) {
      Object.assign(context, get())
    }
    return context
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
    return this.#unbind?.held(id) ?? false
  }

  /**
   * @param {string} id - An axis
   * @returns {AxisValue} Its value right now; reading it takes the mouse movement since its last read
   */
  axis(id) {
    return this.#unbind?.axis(id) ?? STILL
  }

  /** @returns {D[]} Every command or definition, as its source gave it */
  all() {
    return [...this.#commands.values()]
  }

  /**
   * @param {string} id - A command's id
   * @returns {D | undefined} The command or definition, as its source gave it
   */
  get(id) {
    return this.#commands.get(id)
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
        commands: () => [...this.#live.values()],
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
    const command = this.#live.get(id)
    if (command === undefined || !isActive(command, context)) {
      return false
    }
    command.execute(context, event)
    return true
  }

  /**
   * Re-reads the sources, rebuilds the store over a new schema and the listening, and updates every component. A
   * definition that can't be adapted is left out; a command whose bindings can't be read listens to none, and an axis
   * whose sources can't be read reads none
   * @returns {void}
   */
  refresh() {
    const report = this.#report.bind(this)
    const commands = fromSources(this.#sources, 'command', report)
    const axes = fromSources(this.#axisSources, 'axis', report)
    for (const id of commands.keys()) {
      axes.delete(id)
    }
    const inputs = this.inputs
    const fields = inputs.filter((input) => input.axis !== true).map(({ field }) => field)
    const schema = schemaOf(commands, axes, fields)
    this.#stop()
    const bound = new BindingsStore(schema, this.#storage(this.#scope))
    bound.addEventListener('change', this.#changed)
    this.#store = bound
    this.#commands = commands
    /** @type {Map<string, Command>} */
    const live = new Map()
    for (const definition of commands.values()) {
      try {
        const command = this.#adapt(definition)
        const rebinding = rebound(command, bound.lookup(command.id), fields)
        try {
          validateCommands([rebinding], this.#options)
          live.set(definition.id, rebinding)
        } catch (error) {
          report(new Error(`keybinds: dropping the bindings of "${command.id}"`, { cause: error }))
          live.set(definition.id, rebound(command, NO_BINDINGS, fields))
        }
      } catch (error) {
        report(new Error(`keybinds: leaving out "${definition.id}"`, { cause: error }))
      }
    }
    this.#live = live
    const input = inputs.find((each) => each.axis === true)
    const readAxes = [...axes.values()].map((axis) => {
      const sources = bound.lookup(axis.id)?.axes ?? axis.axes
      try {
        for (const source of sources) {
          input?.parse(source, '')
        }
        return { ...axis, axes: sources }
      } catch (error) {
        report(new Error(`keybinds: dropping the sources of axis "${axis.id}"`, { cause: error }))
        return { ...axis, axes: [] }
      }
    })
    const listening = [...live.values()].filter((command) => fields.some((field) => (command[field] ?? []).length > 0))
    this.#unbind = keybinds(listening, () => this.context(), { ...this.#options, axes: readAxes })
    if (this.#cheatsheet !== undefined) {
      this.#cheatsheet.commands = [...live.values()].filter((command) => command.hidden !== true)
    }
    if (this.#settings !== undefined) {
      this.#settings.holds = this.#options.holds !== undefined
      this.#settings.releases = this.#options.releases !== undefined
      this.#settings.sequences = this.#options.sequences !== undefined
      this.#settings.store = bound
    }
    this.syncContext()
    this.dispatchEvent(new Event('refresh'))
  }

  /**
   * Pushes the context now into the cheatsheet, and tells whoever listens for `context` events (a command system's
   * bridge, so its menus, palette and buttons) that which commands apply may have changed
   * @returns {void}
   */
  syncContext() {
    if (this.#cheatsheet !== undefined) {
      this.#cheatsheet.context = this.context()
    }
    this.dispatchEvent(new Event('context'))
  }

  /**
   * A command's or axis's bindings through one input now, as shown to people ("Ctrl+Z" for keys, "Mouse ↔" for axes).
   * A command's are what it listens with (an unreadable binding was dropped); an axis's are in the store
   * @param {string} id - The command or axis
   * @param {string} field - The input's field: "keys", "mouse", "gamepad", "axes"
   * @returns {string[]} The bindings
   */
  bindingsFor(id, field) {
    const input = this.inputs.find((each) => each.field === field)
    if (input === undefined) {
      return []
    }
    const bindings = (input.axis === true ? this.#store?.lookup(id)?.axes : this.#live.get(id)?.[input.field]) ?? []
    if (!isInputUI(input)) {
      return [...bindings]
    }
    const join = input.axis === true ? ' ' : '+'
    return bindings.map((binding) => formatBinding(input, binding).join(join).replaceAll('+then+', ' then '))
  }

  /**
   * Whether an event is one of a command's press bindings, for code that handles the press itself, like a drag that
   * should start on a rebindable mouse button
   * @param {string} id - The command
   * @param {Event} event - The event
   * @returns {boolean} Whether it is
   */
  matches(id, event) {
    const command = this.#live.get(id)
    return command !== undefined && this.inputs.some((input) => input.matches?.(command, event) === true)
  }

  /**
   * Stops listening, and detaches from the store
   * @returns {void}
   */
  destroy() {
    this.#stop()
    this.#focus?.stop()
  }

  /**
   * Stops listening, and detaches from the store and disposes of it
   * @returns {void}
   */
  #stop() {
    this.#unbind?.()
    this.#unbind = undefined
    this.#store?.removeEventListener('change', this.#changed)
    this.#store?.dispose()
  }

  /**
   * Reports a failure: as an `error` event (an ErrorEvent) on the hub, and to reportError() when nobody prevents it
   * @param {Error} error - The failure
   * @returns {void}
   */
  #report(error) {
    const event = new ErrorEvent('error', { cancelable: true, error, message: error.message })
    if (this.dispatchEvent(event)) {
      reportError(error)
    }
  }
}

export { CommandHub, FocusReturn, commandOf }
