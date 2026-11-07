/**
 * Answers asked for one after another, of which only the latest counts: what a search field asks as its text changes,
 * where an answer to text no longer typed is dropped, however late it comes.
 */
class Latest {
  /** How many were asked for, so an answer to one before the last is dropped. */
  #asked = 0

  /**
   * Asks for an answer, which counts only if nothing was asked for, and nothing dropped, while it came.
   * @template A
   * @param {() => A | Promise<A>} find - Finds the answer, at once or later
   * @returns {Promise<Readonly<{ answer: A }> | undefined>} The answer, or nothing if it no longer counts
   */
  async ask(find) {
    this.#asked += 1
    const asked = this.#asked
    const answer = await find()
    return asked === this.#asked ? { answer } : undefined
  }

  /**
   * Drops every answer still to come.
   * @returns {void}
   */
  drop() {
    this.#asked += 1
  }
}

export { Latest }
