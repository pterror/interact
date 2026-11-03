/**
 * Typing to move to an item, as the WAI-ARIA Authoring Practices listbox pattern describes: a character moves to the
 * next item whose text starts with it, and characters typed in quick succession to the next whose text starts with
 * all of them. What was typed is forgotten after `WAIT` without a key, the APG example's 500ms. Typing the same
 * character again moves on to the next item starting with it, rather than looking for it twice over.
 */

const WAIT = 500
const NONE = 0
const ONE = 1

/** @type {Intl.Segmenter | undefined} */
let segmenter = undefined

/**
 * A text's characters as a person sees them: an emoji or a letter with its accents is one.
 * @param {string} text - The text
 * @returns {string[]} Its characters
 */
function graphemes(text) {
  segmenter ??= new Intl.Segmenter(undefined, { granularity: 'grapheme' })
  /** @type {string[]} */
  const found = []
  for (const { segment } of segmenter.segment(text)) {
    found.push(segment)
  }
  return found
}

/**
 * What to look for: the text, and whether to start after the active item (a first or repeated character) rather than
 * at it (more characters of the same word, which the active item may already match).
 * @typedef {Readonly<{ text: string, after: boolean }>} Search
 */

/** What has been typed in quick succession, and when the last of it was. */
class Typeahead {
  /** @type {string} */
  #typed = ''
  /** @type {number} */
  #at = Number.NEGATIVE_INFINITY
  /**
   * How many searches have started, so one that answers after a later one started is dropped.
   * @type {number}
   */
  #searches = NONE
  /**
   * @readonly
   * @type {() => number}
   */
  #now

  /** @param {() => number} now - What time it is, in milliseconds */
  constructor(now) {
    this.#now = now
  }

  /**
   * Whether something was typed a moment ago, so a space continues it instead of meaning itself.
   * @returns {boolean} Whether typing is going on
   */
  get typing() {
    return this.#typed !== '' && this.#now() - this.#at < WAIT
  }

  /**
   * Notes a character typed, and says what to look for now.
   * @param {string} character - What was typed
   * @returns {Search} What to look for
   */
  type(character) {
    const now = this.#now()
    this.#typed = `${now - this.#at < WAIT ? this.#typed : ''}${character}`
    this.#at = now
    const repeated = graphemes(this.#typed).every((typed) => typed === character)
    return repeated ? { after: true, text: character } : { after: false, text: this.#typed }
  }

  /**
   * Looks for an item by a character typed, with what was typed a moment before it.
   * @param {string} character - What was typed
   * @param {Readonly<{ active: number | undefined, top: number }>} at - The active item, and the top, where looking
   *   starts while nothing is active
   * @param {(text: string, from: number) => Promise<number | undefined>} find - Looks for an item from a position
   * @returns {Promise<number | undefined>} Where it is, unless none was found or more was typed meanwhile
   */
  async seek(character, at, find) {
    const { after, text } = this.type(character)
    const from = at.active === undefined ? at.top : at.active + (after ? ONE : NONE)
    this.#searches += ONE
    const search = this.#searches
    const found = await find(text, from)
    return search === this.#searches ? found : undefined
  }
}

export { Typeahead, WAIT, graphemes }
