/**
 * What a CommandHub builds from its sources: the commands and axes they give, the schema people rebind, and the
 * commands and axes as they listen, with people's rebindings laid over them.
 */

/**
 * @import { AxisDef, BindingField, BindingSchema, Command, Schema } from './command.js'
 * @import { KeybindsOptions } from './core.js'
 * @import { AxisInput } from './input.js'
 * @import { BindingsStore } from './store.js'
 */

import { validateCommands } from './core.js'

const NONE = 0

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
 * Everything the sources give, the earlier source winning an id; a source that throws gives nothing
 * @template {Readonly<{ id: string }>} T
 * @param {readonly Source<T>[]} sources - The sources
 * @param {Readonly<{ kind: string, report: Report }>} how - What they give ("command", "axis"), and where failures go
 * @returns {Map<string, T>} What they gave, by id
 */
function fromSources(sources, { kind, report }) {
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
 * A command's bindings as people can rebind them: keys always, and its other bindings through the inputs listened to
 * @param {CommandDefinition} command - The command's definition
 * @param {readonly BindingField[]} fields - The inputs' fields
 * @returns {BindingSchema} Its schema
 */
function commandSchema(command, fields) {
  return {
    category: command.category,
    description: command.description,
    hidden: command.hidden,
    keys: command.keys ?? [],
    label: command.label,
    ...(fields.includes('gamepad') && command.gamepad !== undefined ? { gamepad: command.gamepad } : {}),
    ...(fields.includes('mouse') && command.mouse !== undefined ? { mouse: command.mouse } : {}),
  }
}

/**
 * An axis's bindings as people can rebind them
 * @param {AxisDef} axis - The axis
 * @returns {BindingSchema} Its schema
 */
function axisSchema({ axes, category, description, hidden, label }) {
  return { axes, category, description, hidden, label }
}

/**
 * The schema of every command and axis, by id
 * @param {ReadonlyMap<string, CommandDefinition>} commands - The commands' definitions
 * @param {ReadonlyMap<string, AxisDef>} axes - The axes
 * @param {readonly BindingField[]} fields - The inputs' fields
 * @returns {Schema} The schema
 */
function schemaOf(commands, axes, fields) {
  /** @type {Map<string, BindingSchema>} */
  const schema = new Map()
  for (const command of commands.values()) {
    schema.set(command.id, commandSchema(command, fields))
  }
  for (const axis of axes.values()) {
    schema.set(axis.id, axisSchema(axis))
  }
  return Object.fromEntries(schema)
}

/**
 * Bindings through each kind of trigger input
 * @typedef {Readonly<{ [field in BindingField]?: readonly string[] | undefined }>} FieldBindings
 */

const NO_BINDINGS = { gamepad: [], keys: [], mouse: [] }

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
 * The commands as they listen: each adapted from its definition, with people's rebindings laid over it. One that
 * can't be adapted is left out; one whose bindings can't be read listens to none
 * @template {CommandDefinition} D
 * @param {ReadonlyMap<string, D>} definitions - The definitions
 * @param {BindingsStore<Schema>} bound - The bindings in effect
 * @param {Readonly<{ adapt: Adapt<D>, fields: readonly BindingField[], options: KeybindsOptions, report: Report }>}
 *   how - How definitions become commands, the inputs' fields, the syntax that's on, and where failures go
 * @returns {Map<string, Command>} The commands, by id
 */
function liveCommands(definitions, bound, { adapt, fields, options, report }) {
  /** @type {Map<string, Command>} */
  const live = new Map()
  for (const definition of definitions.values()) {
    try {
      live.set(definition.id, listening(adapt(definition), bound, { fields, options, report }))
    } catch (error) {
      report(new Error(`keybinds: leaving out "${definition.id}"`, { cause: error }))
    }
  }
  return live
}

/**
 * A command with people's rebindings laid over it, or listening to none if they can't be read
 * @param {Command} command - The command
 * @param {BindingsStore<Schema>} bound - The bindings in effect
 * @param {Readonly<{ fields: readonly BindingField[], options: KeybindsOptions, report: Report }>} how - The inputs'
 *   fields, the syntax that's on, and where failures go
 * @returns {Command} The command as it listens
 */
function listening(command, bound, { fields, options, report }) {
  const rebinding = rebound(command, bound.lookup(command.id), fields)
  try {
    validateCommands([rebinding], options)
    return rebinding
  } catch (error) {
    report(new Error(`keybinds: dropping the bindings of "${command.id}"`, { cause: error }))
    return rebound(command, NO_BINDINGS, fields)
  }
}

/**
 * The axes as they're read: each with people's rebindings, and one whose sources can't be read reading none
 * @param {ReadonlyMap<string, AxisDef>} axes - The axes
 * @param {BindingsStore<Schema>} bound - The bindings in effect
 * @param {Readonly<{ input: AxisInput | undefined, report: Report }>} how - What reads axes, and where failures go
 * @returns {AxisDef[]} The axes
 */
function liveAxes(axes, bound, { input, report }) {
  return [...axes.values()].map((axis) => {
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
}

/**
 * Whether a command listens through any of the inputs
 * @param {Command} command - The command
 * @param {readonly BindingField[]} fields - The inputs' fields
 * @returns {boolean} Whether it has bindings there
 */
function hasBindings(command, fields) {
  return fields.some((field) => (command[field] ?? []).length > NONE)
}

export { fromSources, hasBindings, liveAxes, liveCommands, schemaOf }
