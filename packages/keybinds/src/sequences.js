/**
 * Bindings of several steps, written with spaces: "g i", "ctrl+k ctrl+s", "k k" for a double tap. Each step must
 * come within `timeout` of the last. A step that starts a sequence is the sequence's: it doesn't reach the page, and
 * it can't also be a binding of its own.
 */

/** @import { Command } from './command.js' */

/**
 * A sequence step resolved: the commands it found, or that it started or continued a sequence
 * @typedef {Readonly<{ found: readonly Command[] | undefined, pending: boolean }>} Step
 */

/**
 * One input's sequences: `add` one, `check` no plain binding is also a sequence's start, `resolve` a press
 * @typedef {Readonly<{
 *   add: (steps: readonly string[], command: Command) => void,
 *   check: (lookups: Iterable<string>) => void,
 *   resolve: (lookups: readonly string[], find: (lookups: readonly string[]) => readonly Command[] | undefined,
 *     starts: (commands: readonly Command[]) => boolean) => Step,
 * }>} SequenceTable
 */

/**
 * Bindings of several steps ("g i", "ctrl+k ctrl+s"): what sequences() gives keybinds(). `steps` splits a binding
 * without its suffix into steps; `table` keeps one input's sequences
 * @typedef {Readonly<{ steps: (binding: string, suffix: string) => readonly string[], table: () => SequenceTable }>}
 *   Sequences
 */

/**
 * How a press is looked up as a step: the bindings to look in, when it happened, and whether commands may run now
 * @typedef {Readonly<{
 *   find: (lookups: readonly string[]) => readonly Command[] | undefined,
 *   now: number,
 *   starts: (commands: readonly Command[]) => boolean,
 * }>} Lookup
 */

const DEFAULT_TIMEOUT = 1000

/** @type {Step} */
const PENDING = { found: undefined, pending: true }

/** @type {Step} */
const NOTHING = { found: undefined, pending: false }

/** One input's sequences, and the one under way */
class SequenceSteps {
  /**
   * @readonly
   * @type {Map<string, Command[]>}
   */
  #prefixes = new Map()
  /** @type {Readonly<{ at: number, prefix: string }> | undefined} */
  #pending
  /**
   * @readonly
   * @type {number}
   */
  #timeout

  /**
   * Starts with no sequences
   * @param {number} timeout - Most ms between steps
   */
  constructor(timeout) {
    this.#timeout = timeout
  }

  /**
   * Adds one sequence, under each start of it ("g", for "g i")
   * @param {readonly string[]} steps - Its steps' lookups
   * @param {Command} command - Whose it is
   * @returns {void}
   * @throws {Error} If the command sets anyModifiers
   */
  add(steps, command) {
    if (command.anyModifiers === true) {
      throw new Error(`"${steps.join(' ')}" is a sequence, which can't use anyModifiers`)
    }
    for (let end = 1; end < steps.length; end += 1) {
      const prefix = steps.slice(0, end).join(' ')
      const list = this.#prefixes.get(prefix)
      if (list === undefined) {
        this.#prefixes.set(prefix, [command])
      } else {
        list.push(command)
      }
    }
  }

  /**
   * Checks that no plain binding is also the start of a sequence, which couldn't tell which was meant
   * @param {Iterable<string>} lookups - The plain bindings' lookups
   * @returns {void}
   * @throws {Error} If one is
   */
  check(lookups) {
    for (const lookup of lookups) {
      if (this.#prefixes.has(lookup)) {
        throw new Error(`"${lookup}" is both a binding and the start of a sequence`)
      }
    }
  }

  /**
   * A press as a step: one after others first tries to go on from them, and failing that it's a press of its own
   * @param {readonly string[]} lookups - The press's lookups
   * @param {(lookups: readonly string[]) => readonly Command[] | undefined} find - Plain bindings
   * @param {(commands: readonly Command[]) => boolean} starts - Whether any of these may run now
   * @returns {Step} What the press found, or that it's part of a sequence under way
   */
  resolve(lookups, find, starts) {
    const now = performance.now()
    const before =
      this.#pending !== undefined && now - this.#pending.at <= this.#timeout ? this.#pending.prefix : undefined
    this.#pending = undefined
    const tries = before === undefined ? [lookups] : [lookups.map((lookup) => `${before} ${lookup}`), lookups]
    for (const each of tries) {
      const step = this.#try(each, { find, now, starts })
      if (step !== undefined) {
        return step
      }
    }
    return NOTHING
  }

  /**
   * One way of reading a press: as the start or continuation of a sequence, or as a plain binding
   * @param {readonly string[]} lookups - The lookups to try
   * @param {Lookup} lookup - Where to look, and when
   * @returns {Step | undefined} What it found, or undefined if nothing
   */
  #try(lookups, { find, now, starts }) {
    const started = lookups.find((each) => {
      const commands = this.#prefixes.get(each)
      return commands !== undefined && starts(commands)
    })
    if (started !== undefined) {
      this.#pending = { at: now, prefix: started }
      return PENDING
    }
    const found = find(lookups)
    return found === undefined ? undefined : { found, pending: false }
  }
}

/**
 * For keybinds({ sequences: sequences() })
 * @param {Readonly<{ timeout?: number }>} [options] - Most ms between steps (default 1000)
 * @returns {Sequences} What keybinds() splits and resolves sequences with
 */
function sequences({ timeout = DEFAULT_TIMEOUT } = {}) {
  return {
    steps(binding, suffix) {
      const steps = binding
        .replaceAll(/\s*\+\s*/gu, '+')
        .split(/\s+/u)
        .filter((step) => step !== '')
      if (steps.length > 1 && suffix !== '') {
        throw new Error(`"${binding}${suffix}": a sequence can't end in "${suffix}"`)
      }
      return steps.length > 0 ? steps : [binding]
    },
    table: () => new SequenceSteps(timeout),
  }
}

export { sequences }
