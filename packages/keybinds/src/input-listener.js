/**
 * One input's presses: what keybinds() hands an input to report them to, and the commands each runs.
 */

/**
 * @import { AxisValue, Command } from './command.js'
 * @import { PhaseRun } from './core.js'
 * @import { Dispatch, Input, InputHandle, Press, PressEnd, PressStart, PressWhere } from './input.js'
 * @import { Runner } from './runner.js'
 * @import { Step } from './sequences.js'
 */

import { BindingIndex } from './binding-index.js'

/**
 * A press's event, and where it happened
 * @typedef {Readonly<{ event: Event, where: PressWhere }>} Happened
 */

/** @type {AxisValue} */
const STILL = { delta: 0, position: 0 }

/** One input's presses, and the commands they run */
class InputListener {
  /**
   * @readonly
   * @type {Runner}
   */
  #runner
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
   * @param {Runner} runner - What runs commands
   * @param {readonly Command[]} commands - The commands
   * @param {Input} input - The input
   */
  constructor(runner, commands, input) {
    this.#runner = runner
    this.#index = new BindingIndex(commands, input, runner.options)
    this.#handle = input.listen(this.#dispatch())
  }

  /** @returns {Dispatch} What the input works with */
  #dispatch() {
    const { options } = this.#runner
    return {
      axes: options.axes ?? [],
      bound: this.#index.bound,
      candidates: (lookups, loose, mods) => this.#index.candidates(lookups, loose, mods),
      capture: options.capture ?? false,
      context: () => this.#runner.context(),
      down: (id, event, start) => this.#down(id, event, start),
      execute: (command, event) => this.#runner.execute(command, event),
      isActive: (command) => this.#runner.active(command),
      presses: this.#presses,
      target: options.target ?? globalThis,
      up: (id, event, where) => this.#up(id, event, where),
    }
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
      allowed: (command) => this.#runner.allowed(command, where),
      bound: (suffix) => this.#bound(press, suffix),
      event,
      execute: (command) => this.#runner.execute(command, event),
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
    const command = found.find(
      (each) => this.#runner.allowed(each, happened.where) && this.#runner.execute(each, happened.event),
    )
    if (command === undefined) {
      return false
    }
    this.#fired.get(press)?.add(command)
    return true
  }

  /**
   * A new press
   * @param {string} id - Its id
   * @param {PressStart} start - What the input said about it
   * @returns {Press} The press, held
   */
  #start(id, start) {
    /** @type {Set<Command>} */
    const fired = new Set()
    /** @type {Press} */
    const press = { at: performance.now(), fired, lookups: start.lookups, mods: start.mods }
    this.#fired.set(press, fired)
    this.#presses.set(id, press)
    return press
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
    const press = held === undefined || start.repeat !== true ? this.#start(id, start) : held
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
    for (const phase of fresh ? this.#runner.phases : []) {
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
    const consumed = this.#runner.phases.map((phase) => phase.up?.(run) === true).includes(true)
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

export { InputListener, STILL }
