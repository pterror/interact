/**
 * A CommandHub's bindings: the commands and axes its sources give, the store of people's rebindings over them, and
 * keybinds() listening with the result.
 */

/**
 * @import { AxisDef, AxisValue, BindingField, Command, Context, Schema } from './command.js'
 * @import { Keybinds, KeybindsOptions } from './core.js'
 * @import { Adapt, CommandDefinition, Report, Source } from './hub-commands.js'
 * @import { Input } from './input.js'
 * @import { BindingsStorage } from './store.js'
 */

import { formatBinding } from './binding-format.js'
import { isActive } from './command.js'
import { keybinds } from './core.js'
import { fromSources, hasBindings, liveAxes, liveCommands, schemaOf } from './hub-commands.js'
import { isInputUI } from './input.js'
import { BindingsStore } from './store.js'

const STILL = { delta: 0, position: 0 }

/**
 * What the bindings are rebuilt from: the sources, the scope rebindings are kept in, and the context now
 * @template {CommandDefinition} D
 * @typedef {Readonly<{ axisSources: readonly Source<AxisDef>[], context: () => Context, scope: string,
 *   sources: readonly Source<D>[] }>} Rebuild
 */

/**
 * What the bindings are made with: how definitions become commands, keybinds()' options, where rebindings are kept
 * per scope, what to do when they change, and where failures go
 * @template {CommandDefinition} D
 * @typedef {Readonly<{ adapt: Adapt<D>, changed: () => void, options: KeybindsOptions, report: Report,
 *   storage: (scope: string) => BindingsStorage }>} Made
 */

/**
 * A hub's commands, axes, rebindings, and the listening they make
 * @template {CommandDefinition} D - What its sources give
 */
class HubBindings {
  /**
   * @readonly
   * @type {Made<D>}
   */
  #made
  /** @type {ReadonlyMap<string, D>} */
  #commands = new Map()
  /** @type {ReadonlyMap<string, Command>} */
  #live = new Map()
  /** @type {BindingsStore | undefined} */
  #store
  /** @type {Keybinds | undefined} */
  #unbind

  /**
   * Bindings with nothing yet, until rebuilt
   * @param {Made<D>} made - What they're made with
   */
  constructor(made) {
    this.#made = made
  }

  /** @returns {readonly Input[]} The inputs listened to */
  get inputs() {
    return this.#made.options.inputs ?? []
  }

  /** @returns {Readonly<{ holds: boolean, releases: boolean, sequences: boolean }>} Which binding syntax is on */
  get syntax() {
    const { holds, releases, sequences } = this.#made.options
    return { holds: holds !== undefined, releases: releases !== undefined, sequences: sequences !== undefined }
  }

  /** @returns {BindingsStore | undefined} The store of people's rebindings */
  get store() {
    return this.#store
  }

  /** @returns {ReadonlyMap<string, D>} Every definition, as its source gave it, by id */
  get commands() {
    return this.#commands
  }

  /** @returns {ReadonlyMap<string, Command>} Every command as it listens, with people's rebindings, by id */
  get live() {
    return this.#live
  }

  /**
   * Re-reads the sources, and rebuilds the store and the listening
   * @param {Rebuild<D>} rebuild - The sources, the scope, and the context
   * @returns {void}
   */
  rebuild({ axisSources, context, scope, sources }) {
    const { adapt, options, report } = this.#made
    const commands = fromSources(sources, { kind: 'command', report })
    const axes = fromSources(axisSources, { kind: 'axis', report })
    for (const id of commands.keys()) {
      axes.delete(id)
    }
    const fields = this.#fields()
    const bound = this.#newStore(schemaOf(commands, axes, fields), scope).get()
    this.#commands = commands
    this.#live = liveCommands(commands, bound, { adapt, fields, options, report })
    this.#listen(liveAxes(axes, bound, { input: this.inputs.find((input) => input.axis === true), report }), context)
  }

  /**
   * @param {string} id - A command
   * @param {Context} context - The context now
   * @returns {Command | undefined} The command as it listens, if it applies in the context
   */
  applying(id, context) {
    const command = this.#live.get(id)
    return command !== undefined && isActive(command, context) ? command : undefined
  }

  /**
   * @param {string} id - A command
   * @returns {boolean} Whether its press fired and that key or button hasn't come up
   */
  held(id) {
    return this.#unbind?.held(id) ?? false
  }

  /**
   * @param {string} id - An axis
   * @returns {AxisValue} Its value now; reading it takes the mouse movement since its last read
   */
  axis(id) {
    return this.#unbind?.axis(id) ?? STILL
  }

  /**
   * A command's or axis's bindings through one input right now, as shown to people. A command's are what it listens
   * with (an unreadable binding was dropped); an axis's are in the store
   * @param {string} id - The command or axis
   * @param {string} field - The input's field: "keys", "mouse", "gamepad", "axes"
   * @returns {string[]} The bindings
   */
  bindingsFor(id, field) {
    const input = this.inputs.find((each) => each.field === field)
    if (input === undefined) {
      return []
    }
    const bindings = (input.axis === true ? this.#store?.get()[id]?.axes : this.#live.get(id)?.[input.field]) ?? []
    if (!isInputUI(input)) {
      return [...bindings]
    }
    const join = input.axis === true ? ' ' : '+'
    return bindings.map((binding) => formatBinding(input, binding).join(join).replaceAll('+then+', ' then '))
  }

  /**
   * @param {string} id - A command
   * @param {Event} event - An event
   * @returns {boolean} Whether the event is one of the command's press bindings
   */
  matches(id, event) {
    const command = this.#live.get(id)
    return command !== undefined && this.inputs.some((input) => input.matches?.(command, event) === true)
  }

  /**
   * Stops listening, and detaches from the store
   * @returns {void}
   */
  stop() {
    this.#unbind?.()
    this.#unbind = undefined
    this.#store?.removeEventListener('change', this.#made.changed)
    this.#store?.dispose()
  }

  /** @returns {BindingField[]} The fields of the inputs that trigger commands */
  #fields() {
    return this.inputs.filter((input) => input.axis !== true).map(({ field }) => field)
  }

  /**
   * Replaces the store with one over a new schema
   * @param {Schema} schema - The schema
   * @param {string} scope - The scope rebindings are kept in
   * @returns {BindingsStore} The new store
   */
  #newStore(schema, scope) {
    this.stop()
    const store = new BindingsStore(schema, this.#made.storage(scope))
    store.addEventListener('change', this.#made.changed)
    this.#store = store
    return store
  }

  /**
   * Listens with the commands as they listen now, and the axes given
   * @param {readonly AxisDef[]} axes - The axes
   * @param {() => Context} context - The context now
   * @returns {void}
   */
  #listen(axes, context) {
    const fields = this.#fields()
    const listening = [...this.#live.values()].filter((command) => hasBindings(command, fields))
    this.#unbind = keybinds(listening, context, { ...this.#made.options, axes })
  }
}

export { HubBindings }
