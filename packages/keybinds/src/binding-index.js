/**
 * Every command's bindings through one input, by lookup, checked as they're added: what keybinds() looks presses up
 * in.
 */

/**
 * @import { LooseTable } from './any-modifiers.js'
 * @import { ParsedBinding } from './binding.js'
 * @import { Modifiers } from './binding-mods.js'
 * @import { BindingField, Command } from './command.js'
 * @import { KeybindsOptions } from './core.js'
 * @import { Input } from './input.js'
 * @import { SequenceTable, Step } from './sequences.js'
 */

import { parseBinding } from './binding.js'
import { bindingsOf } from './command.js'

/** @type {readonly BindingField[]} */
const BINDING_FIELDS = ['keys', 'mouse', 'gamepad']

const NONE = 0
const ONE_STEP = 1

/**
 * Checks that every command's bindings have an input to read them
 * @param {readonly Command[]} commands - The commands
 * @param {KeybindsOptions} options - The inputs and axes
 * @returns {void}
 * @throws {Error} If a command or axis has bindings no input reads
 */
function checkInputs(commands, options) {
  const inputs = options.inputs ?? []
  const unread = BINDING_FIELDS.filter((field) => !inputs.some((input) => input.field === field))
  for (const field of unread) {
    const command = commands.find((each) => bindingsOf(each, field).length > NONE)
    if (command !== undefined) {
      throw new Error(`Command "${command.id}" has ${field} bindings, but no input reads ${field}`)
    }
  }
  const axes = options.axes ?? []
  if (axes.some((axis) => axis.axes.length > NONE) && !inputs.some((input) => input.axis === true)) {
    throw new Error('There are axes, but no input reads them')
  }
}

/** Every command's bindings through one input, by lookup */
class BindingIndex {
  /**
   * @readonly
   * @type {Map<string, Command[]>}
   */
  #exact = new Map()
  /**
   * @readonly
   * @type {LooseTable | undefined}
   */
  #loose
  /**
   * @readonly
   * @type {SequenceTable | undefined}
   */
  #sequences
  /**
   * @readonly
   * @type {Input}
   */
  #input
  /**
   * @readonly
   * @type {KeybindsOptions}
   */
  #options

  /**
   * Indexes and checks every binding
   * @param {readonly Command[]} commands - The commands
   * @param {Input} input - The input; an axis input has no command bindings
   * @param {KeybindsOptions} options - Which syntax modules are on
   * @throws {Error} If a binding is invalid or uses syntax that isn't on
   */
  constructor(commands, input, options) {
    this.#input = input
    this.#options = options
    this.#loose = options.anyModifiers?.table()
    this.#sequences = options.sequences?.table()
    if (input.axis !== true) {
      const { field } = input
      for (const command of commands) {
        for (const binding of bindingsOf(command, field)) {
          this.#add(command, binding)
        }
      }
    }
    this.#sequences?.check(this.#exact.keys())
  }

  /**
   * Adds one binding
   * @param {Command} command - Whose binding it is
   * @param {string} binding - The binding
   * @returns {void}
   */
  #add(command, binding) {
    if (command.anyModifiers === true && this.#loose === undefined) {
      throw new Error(`Command "${command.id}" sets anyModifiers, which needs anyModifiers()`)
    }
    const parsed = this.#parse(command, binding)
    if (command.anyModifiers === true) {
      this.#loose?.add(parsed, command)
      return
    }
    const list = this.#exact.get(parsed.lookup)
    if (list === undefined) {
      this.#exact.set(parsed.lookup, [command])
    } else {
      list.push(command)
    }
  }

  /**
   * Parses one binding, noting it as a sequence if it has several steps
   * @param {Command} command - Whose binding it is
   * @param {string} binding - The binding
   * @returns {ParsedBinding} It parsed
   */
  #parse(command, binding) {
    try {
      const parsed = parseBinding(this.#input, binding, this.#options)
      if (parsed.steps.length > ONE_STEP) {
        this.#sequences?.add(parsed.steps, command)
      }
      return parsed
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`Command "${command.id}": ${message}`, { cause: error })
    }
  }

  /**
   * Checks every binding, as building an index does
   * @param {readonly Command[]} commands - The commands
   * @param {Input} input - The input
   * @param {KeybindsOptions} options - Which syntax modules are on
   * @returns {BindingIndex} The index
   * @throws {Error} If a binding is invalid or uses syntax that isn't on
   */
  static check(commands, input, options) {
    return new BindingIndex(commands, input, options)
  }

  /** @returns {boolean} Whether any command has a binding here */
  get bound() {
    return this.#exact.size > NONE || (this.#loose?.size() ?? NONE) > NONE
  }

  /**
   * The commands bound exactly
   * @param {readonly string[]} lookups - An event's lookups, best first
   * @returns {readonly Command[] | undefined} The commands bound to the first that has any
   */
  exact(lookups) {
    for (const lookup of lookups) {
      const found = this.#exact.get(lookup)
      if (found !== undefined) {
        return found
      }
    }
    return undefined
  }

  /**
   * Adds the `anyModifiers` commands that match
   * @param {readonly string[]} loose - The lookups without modifiers
   * @param {Modifiers} mods - The modifiers held
   * @param {readonly Command[] | undefined} found - What exact bindings found
   * @returns {readonly Command[] | undefined} Those, then the `anyModifiers` commands that match
   */
  withLoose(loose, mods, found) {
    return this.#loose === undefined ? found : this.#loose.find(loose, mods, found)
  }

  /**
   * Every command bound to an event
   * @param {readonly string[]} lookups - An event's lookups, best first
   * @param {readonly string[]} loose - The same without modifiers
   * @param {Modifiers} mods - The modifiers held
   * @returns {readonly Command[] | undefined} The commands bound
   */
  candidates(lookups, loose, mods) {
    return this.withLoose(loose, mods, this.exact(lookups))
  }

  /**
   * A fresh press as a step of a sequence
   * @param {readonly string[]} lookups - The press's lookups
   * @param {(commands: readonly Command[]) => boolean} starts - Whether any of these may run now
   * @returns {Step | undefined} The step resolved, or undefined without sequences
   */
  step(lookups, starts) {
    return this.#sequences?.resolve(lookups, (each) => this.exact(each), starts)
  }
}

export { BindingIndex, checkInputs }
