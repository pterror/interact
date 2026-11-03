/**
 * Asking a palette's `source` for further commands: once typing pauses, and only keeping an answer for the query
 * still typed.
 */

/** @import { Command } from './command.js' */

/**
 * Further commands for a query, as they're found
 * @typedef {(query: string) => readonly Command[] | Promise<readonly Command[]>} PaletteSource
 */

/**
 * How one question goes: where to ask, how long to wait for typing to pause, and whether its query is still the one
 * typed when the answer comes
 * @typedef {Readonly<{ delay: number, source: PaletteSource, still: (query: string) => boolean }>} Question
 */

/**
 * What a source answers, or undefined if it failed: a source that fails adds nothing
 * @param {PaletteSource} source - Where to ask
 * @param {string} query - What was typed
 * @returns {Promise<readonly Command[] | undefined>} The answer
 */
async function attempt(source, query) {
  try {
    const answer = await source(query)
    return answer
  } catch {
    return undefined
  }
}

/** What a palette's source answered for the query typed */
class SourceAnswers {
  /**
   * @readonly
   * @type {() => void}
   */
  #changed
  /** @type {readonly Command[]} */
  #answer = []
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  #timer

  /**
   * Keeps answers, telling the palette when one arrives
   * @param {() => void} changed - Called when an answer for the query typed arrives
   */
  constructor(changed) {
    this.#changed = changed
  }

  /** @returns {readonly Command[]} What the source answered for the query typed, none until it does */
  get commands() {
    return this.#answer
  }

  /**
   * Forgets the answer, and asks again once typing pauses
   * @param {string} query - What was typed; nothing is asked for an empty query
   * @param {Question} question - Where to ask, how long to wait, and whether the query is still typed
   * @returns {void}
   */
  ask(query, question) {
    this.clear()
    if (query === '') {
      return
    }
    this.#timer = setTimeout(() => {
      void this.#hear(query, question)
    }, question.delay)
  }

  /**
   * Forgets the answer, and any question still waiting
   * @returns {void}
   */
  clear() {
    clearTimeout(this.#timer)
    this.#answer = []
  }

  /**
   * Keeps an answer if its query is still the one typed
   * @param {string} query - What was asked
   * @param {Question} question - Where it was asked
   * @returns {Promise<void>} When it's kept or dropped
   */
  async #hear(query, question) {
    const answer = await attempt(question.source, query)
    if (answer !== undefined && question.still(query)) {
      this.#answer = answer
      this.#changed()
    }
  }
}

export { SourceAnswers }
