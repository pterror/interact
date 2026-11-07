/**
 * The keybinds() function: commands as data, context as state. Every kind of input (keys, mouse, gamepad, axes) is its own
 * module, handed to keybinds() by whoever uses it; this knows only commands, context and presses.
 */

/**
 * @import { AnyModifiers, LooseTable } from './any-modifiers.js'
 * @import { ParsedBinding } from './binding.js'
 * @import { Modifiers } from './binding-mods.js'
 * @import { AxisDef, AxisValue, BindingField, Command, Context } from './command.js'
 * @import { Dispatch, Input, InputHandle, Press, PressEnd, PressStart, PressWhere } from './input.js'
 * @import { SequenceTable, Sequences, Step } from './sequences.js'
 */

import { parseBinding } from './binding.js'
import { bindingsOf, isActive } from './command.js'

/** @type {readonly BindingField[]} */
const BINDING_FIELDS = ['keys', 'mouse', 'gamepad']

/** @type {AxisValue} */
const STILL = { delta: 0, position: 0 }

/**
 * @typedef {object} PhaseRunFields
 * @property {Press} press - The press
 * @property {Event} event - The event that started or ended it
 * @property {(suffix: string) => readonly Command[] | undefined} bound - Commands bound to this press with a suffix
 * @property {(candidates: readonly Command[]) => boolean} fire - Runs the first candidate that may run and takes the
 *   event, noting it on the press
 * @property {(command: Command) => boolean} allowed - Whether a command may run now: it applies, the input isn't
 *   blocked, and it isn't being typed into (unless the command captures input)
 * @property {(command: Command) => boolean} execute - Runs a command whatever `allowed` says; true if it took the event
 * @property {() => boolean} held - Whether the press is still going
 */

/**
 * What a phase (releases(), holds()) gets at a press's start or end
 * @typedef {Readonly<PhaseRunFields>} PhaseRun
 */

/**
 * Something that happens at a press's start or end beyond the press itself, owning the binding suffixes that say
 * so: releases() (":up"), holds() (":hold", ":tap"). `up` returns whether a command took the end
 * @typedef {Readonly<{ down?: (run: PhaseRun) => void, suffixes: readonly string[],
 *   up?: (run: PhaseRun) => boolean }>} Phase
 */

/**
 * @typedef {object} KeybindsFields
 * @property {readonly Input[]} [inputs] - What to listen to: [keys(), mouse()]. A command bound through an input that
 *   isn't here is an error
 * @property {Phase} [releases] - From releases(): bindings to an input coming up ("k:up")
 * @property {Phase} [holds] - From holds(): bindings to holding an input ("k:hold") and to a short press ("k:tap")
 * @property {Sequences} [sequences] - From sequences(): bindings of several steps ("g i")
 * @property {AnyModifiers} [anyModifiers] - From anyModifiers(): commands whose bindings match whatever other
 *   modifiers are held
 * @property {EventTarget} [target] - Where to listen (default: the window)
 * @property {(command: Command, ctx: Context) => void} [onExecute] - Called after a command takes an event
 * @property {boolean} [capture] - Listen in the capture phase, so a bound key reaches its command before anything
 *   under the target (an editor, say) handles it. A command that doesn't apply, or returns false, leaves the event be
 * @property {readonly AxisDef[]} [axes] - Continuous inputs, read with `axis(id)` on what keybinds() returns
 */

/**
 * What keybinds() is given besides the commands. Syntax whose module isn't here is an error naming it, never a
 * binding that silently doesn't fire
 * @typedef {Readonly<KeybindsFields>} KeybindsOptions
 */

/**
 * What keybinds() returns: a function that stops listening, with `held(id)` (whether a command is held right now:
 * its press fired and that key or button hasn't come up) and `axis(id)` (an axis's value; reading it takes the mouse
 * movement since its last read)
 * @typedef {(() => void) & Readonly<{ axis: (id: string) => AxisValue, held: (id: string) => boolean }>} Keybinds
 */

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
    const command = commands.find((each) => bindingsOf(each, field).length > 0)
    if (command !== undefined) {
      throw new Error(`Command "${command.id}" has ${field} bindings, but no input reads ${field}`)
    }
  }
  const axes = options.axes ?? []
  if (axes.some((axis) => axis.axes.length > 0) && !inputs.some((input) => input.axis === true)) {
    throw new Error('There are axes, but no input reads them')
  }
}

/** Every command's bindings through one input, by lookup, checked as they're added: what presses are looked up in */
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
      if (parsed.steps.length > 1) {
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
    return this.#exact.size > 0 || (this.#loose?.size() ?? 0) > 0
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

/**
 * A press's event, and where it happened
 * @typedef {Readonly<{ event: Event, where: PressWhere }>} Happened
 */

/**
 * One input's presses: what keybinds() hands the input to report them to, and the commands each runs in the app's
 * context
 */
class InputListener {
  /**
   * The app's state now
   * @readonly
   * @type {() => Context}
   */
  #context
  /**
   * What keybinds() was given
   * @readonly
   * @type {KeybindsOptions}
   */
  #options
  /**
   * The phases that are on
   * @readonly
   * @type {readonly Phase[]}
   */
  #phases
  /**
   * @readonly
   * @type {BindingIndex}
   */
  #index
  /**
   * @readonly
   * @type {Map<string, Press>}
   */
  #presses = new Map()
  /**
   * @readonly
   * @type {WeakMap<Press, Set<Command>>}
   */
  #fired = new WeakMap()
  /**
   * @readonly
   * @type {InputHandle}
   */
  #handle

  /**
   * Starts listening through an input
   * @param {() => Context} context - The app's state now
   * @param {KeybindsOptions} options - What keybinds() was given
   * @param {readonly Command[]} commands - The commands
   * @param {Input} input - The input
   */
  constructor(context, options, commands, input) {
    this.#context = context
    this.#options = options
    this.#phases = [options.releases, options.holds].filter((phase) => phase !== undefined)
    this.#index = new BindingIndex(commands, input, options)
    /** @type {Dispatch} */
    const dispatch = {
      axes: options.axes ?? [],
      bound: this.#index.bound,
      candidates: (lookups, loose, mods) => this.#index.candidates(lookups, loose, mods),
      capture: options.capture ?? false,
      context: () => this.#context(),
      down: (id, event, start) => this.#down(id, event, start),
      execute: (command, event) => this.#execute(command, event),
      isActive: (command) => isActive(command, this.#context()),
      presses: this.#presses,
      target: options.target ?? globalThis,
      up: (id, event, where) => this.#up(id, event, where),
    }
    this.#handle = input.listen(dispatch)
  }

  /**
   * Whether a command may run for a press: it applies, the input isn't blocked, and it isn't being typed into (unless
   * the command captures input)
   * @param {Command} command - The command
   * @param {PressWhere} where - Where the press happened
   * @returns {boolean} Whether it may
   */
  #allowed(command, where) {
    return (
      where.blocked !== true &&
      (where.inInput !== true || command.captureInput === true) &&
      isActive(command, this.#context())
    )
  }

  /**
   * Runs a command; unless it returns false, it takes the event
   * @param {Command} command - The command
   * @param {Event} event - What triggered it
   * @returns {boolean} Whether it took the event
   */
  #execute(command, event) {
    const context = this.#context()
    if (command.execute(context, event) === false) {
      return false
    }
    event.preventDefault()
    event.stopPropagation()
    this.#options.onExecute?.(command, context)
    return true
  }

  /**
   * A press's view of running commands
   * @param {string} id - The press's id
   * @param {Press} press - The press
   * @param {Happened} happened - Its event, and where it happened
   * @returns {PhaseRun} What phases work with
   */
  #run(id, press, happened) {
    const { event, where } = happened
    return {
      allowed: (command) => this.#allowed(command, where),
      bound: (suffix) => this.#bound(press, suffix),
      event,
      execute: (command) => this.#execute(command, event),
      fire: (found) => this.#fire(press, happened, found),
      held: () => this.#presses.get(id) === press,
      press,
    }
  }

  /**
   * The commands bound to a press with a suffix
   * @param {Press} press - The press
   * @param {string} suffix - The suffix, or ""
   * @returns {readonly Command[] | undefined} The commands
   */
  #bound(press, suffix) {
    const [lookups, loose] = press.lookups(suffix, press.mods)
    return this.#index.candidates(lookups, loose, press.mods)
  }

  /**
   * Runs the first candidate that may run and takes the event, noting it on the press
   * @param {Press} press - The press
   * @param {Happened} happened - Its event, and where it happened
   * @param {readonly Command[]} found - The candidates
   * @returns {boolean} Whether one took the event
   */
  #fire(press, happened, found) {
    const command = found.find((each) => this.#allowed(each, happened.where) && this.#execute(each, happened.event))
    if (command === undefined) {
      return false
    }
    this.#fired.get(press)?.add(command)
    return true
  }

  /**
   * A press started, or repeated: the same press goes on
   * @param {string} id - Its id
   * @param {Event} event - The event
   * @param {PressStart} start - What the input said about it
   * @returns {Press} The press
   */
  #down(id, event, start) {
    const held = this.#presses.get(id)
    let press = held
    if (press === undefined || start.repeat !== true) {
      /** @type {Set<Command>} */
      const fired = new Set()
      press = { at: performance.now(), fired, lookups: start.lookups, mods: start.mods }
      this.#fired.set(press, fired)
      this.#presses.set(id, press)
    }
    if (start.blocked !== true) {
      this.#pressed(this.#run(id, press, { event, where: { inInput: start.inInput ?? false } }), press !== held)
    }
    return press
  }

  /**
   * What a press is bound to: a sequence's step first, since a press that starts or continues one is the
   * sequence's, not the page's
   * @param {PhaseRun} run - The press's view
   * @param {boolean} fresh - Whether it's new rather than repeating
   * @returns {Step} The commands bound, or that the press is part of a sequence under way
   */
  #found(run, fresh) {
    const { press } = run
    const [lookups, loose] = press.lookups('', press.mods)
    const step = fresh ? this.#index.step(lookups, (commands) => commands.some((each) => run.allowed(each))) : undefined
    if (step === undefined) {
      return { found: this.#index.candidates(lookups, loose, press.mods), pending: false }
    }
    return step.pending ? step : { found: this.#index.withLoose(loose, press.mods, step.found), pending: false }
  }

  /**
   * Runs what a press is bound to, then the phases' start of it
   * @param {PhaseRun} run - The press's view
   * @param {boolean} fresh - Whether it's new rather than repeating
   * @returns {void}
   */
  #pressed(run, fresh) {
    const { event } = run
    const { found, pending } = this.#found(run, fresh)
    if (pending) {
      event.preventDefault()
      event.stopPropagation()
      return
    }
    if (found !== undefined) {
      run.fire(found)
    }
    for (const phase of fresh ? this.#phases : []) {
      phase.down?.(run)
    }
  }

  /**
   * A press ended
   * @param {string} id - Its id
   * @param {Event} event - The event
   * @param {PressWhere} [where] - Where it happened
   * @returns {PressEnd | undefined} The press and whether a command took its end; undefined if it wasn't going
   */
  #up(id, event, where = {}) {
    const press = this.#presses.get(id)
    if (press === undefined) {
      return undefined
    }
    this.#presses.delete(id)
    const run = this.#run(id, press, { event, where })
    const consumed = this.#phases.map((phase) => phase.up?.(run) === true).includes(true)
    return { consumed, press }
  }

  /**
   * Whether a command is held through this input
   * @param {string} id - The command's id
   * @returns {boolean} Whether a press it fired for is still going
   */
  held(id) {
    return [...this.#presses.values()].some((press) => [...press.fired].some((command) => command.id === id))
  }

  /** @returns {boolean} Whether this input reads axes */
  get readsAxes() {
    return this.#handle.axis !== undefined
  }

  /**
   * An axis's value
   * @param {string} id - The axis's id
   * @returns {AxisValue} Its value, still if this input doesn't read axes
   */
  axis(id) {
    return this.#handle.axis?.(id) ?? STILL
  }

  /** @returns {void} */
  stop() {
    this.#handle()
    this.#presses.clear()
  }
}

/**
 * Listens for commands' bindings through the inputs given
 * @param {readonly Command[]} commands - The commands
 * @param {() => Context} [getContext] - The app's state now, which `when` conditions and commands see
 * @param {KeybindsOptions} [options] - The inputs, syntax modules and axes
 * @returns {Keybinds} A function that stops listening, with `held(id)` and `axis(id)`
 * @throws {Error} If a binding is invalid, uses syntax that isn't on, or has no input to read it
 * @example
 * const stop = keybinds([
 *   { id: 'delete', label: 'Delete selected', keys: ['Backspace', 'Delete'],
 *     when: (ctx) => ctx.hasSelection === true, execute: () => deleteSelected() },
 * ], () => ({ hasSelection: selectedId() !== undefined }), { inputs: [keys(), mouse()] })
 */
function keybinds(commands, getContext = () => ({}), options = {}) {
  checkInputs(commands, options)
  const listeners = (options.inputs ?? []).map((input) => new InputListener(getContext, options, commands, input))
  /** @type {Readonly<{ axis: (id: string) => AxisValue, held: (id: string) => boolean }>} */
  const reads = {
    axis: (id) => listeners.find((listener) => listener.readsAxes)?.axis(id) ?? STILL,
    held: (id) => listeners.some((listener) => listener.held(id)),
  }
  return Object.assign(() => {
    for (const listener of listeners) {
      listener.stop()
    }
  }, reads)
}

/**
 * Checks every command up front, to catch typos early
 * @param {readonly Command[]} commands - The commands
 * @param {KeybindsOptions} options - As for keybinds(): the inputs, and the syntax modules used
 * @returns {true} When every command is fine
 * @throws {Error} If a command has no id, or a binding is invalid
 */
function validateCommands(commands, options) {
  for (const command of commands) {
    if (!command.id) {
      throw new Error('Command missing id')
    }
  }
  checkInputs(commands, options)
  for (const input of options.inputs ?? []) {
    BindingIndex.check(commands, input, options)
  }
  return true
}

export { keybinds, validateCommands }
