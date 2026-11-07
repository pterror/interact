/** @import { ItemSource } from './source.js' */

/**
 * A question put to a source: one of a query's, which only that query can read the input of.
 * @typedef {Readonly<{ question: object }>} Question
 */

/**
 * A source's answer to a question, which only the query it answers can read.
 * @typedef {Readonly<{ answer: object }>} Answer
 */

/**
 * A kind of question a source may answer from its own indexes, with input `Q` and answer `A`: what can't be found
 * lazily from items by position (the first item whose text starts with what was typed, the items of a group, the items
 * sorted another way, as a source of their own). A source that doesn't know a query gives no answer, and whoever asked
 * does without.
 * @template Q, A
 */
class Query {
  /**
   * @readonly
   * @type {WeakMap<Question, Readonly<{ input: Q }>>}
   */
  #inputs = new WeakMap()
  /**
   * @readonly
   * @type {WeakMap<Answer, Readonly<{ answer: A | Promise<A> }>>}
   */
  #answers = new WeakMap()

  /**
   * Asks a source, if it answers questions.
   * @template T
   * @param {ItemSource<T>} source - The source
   * @param {Q} input - What is asked
   * @returns {Readonly<{ answer: A | Promise<A> }> | undefined} The answer, at once or later, or undefined if the
   *   source doesn't answer this query
   */
  ask(source, input) {
    /** @type {Question} */
    const question = { question: this }
    this.#inputs.set(question, { input })
    const answer = source.ask?.(question)
    return answer === undefined ? undefined : this.#answers.get(answer)
  }

  /**
   * What a question asks, if it is one of this query's.
   * @param {Question} question - The question
   * @returns {Readonly<{ input: Q }> | undefined} Its input, or undefined if it is another query's
   */
  input(question) {
    return this.#inputs.get(question)
  }

  /**
   * An answer to one of this query's questions, for a source to give back.
   * @param {A | Promise<A>} answer - The answer, at once or later
   * @returns {Answer} The answer, as the source gives it
   */
  answer(answer) {
    /** @type {Answer} */
    const made = { answer: this }
    this.#answers.set(made, { answer })
    return made
  }
}

/**
 * A kind of question for sources.
 * @template Q, A
 * @returns {Query<Q, A>} The query
 */
function defineQuery() {
  return new Query()
}

export { Query, defineQuery }
