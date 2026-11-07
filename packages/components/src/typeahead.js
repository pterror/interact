/**
 * Typing to move to an item, as the WAI-ARIA Authoring Practices listbox pattern describes: a character moves to the
 * next item whose text starts with it, and characters typed in quick succession to the next whose text starts with
 * all of them. What was typed is forgotten after `WAIT` without a key, the APG example's 500ms. The whole of what was
 * typed is always looked for first, so "aa" reaches "Aaron"; only when nothing starts with it, and it is one character
 * typed again and again, does it move on to the next item starting with that character.
 */

const WAIT = 500

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
 * What to look for: the text, whether to start after the active item (a first character) rather than at it (more
 * characters of the same word, which the active item may already match), and, when the text is one character typed
 * again and again, that character, to look for after the active item if nothing starts with the whole text.
 * @typedef {Readonly<{ text: string, after: boolean, cycle: string | undefined }>} Search
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
  #searches = 0
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
    const characters = graphemes(this.#typed)
    const first = characters.length === 1
    const repeated = !first && characters.every((typed) => typed === character)
    return { after: first, cycle: repeated ? character : undefined, text: this.#typed }
  }

  /**
   * Looks for an item by a character typed, with what was typed a moment before it: the whole of it first, then, for
   * one character typed again and again, the next item after the active one starting with that character.
   * @param {string} character - What was typed
   * @param {number | undefined} active - The active item
   * @param {number} top - The top, where looking starts while nothing is active
   * @param {(text: string, from: number) => Promise<number | undefined>} find - Looks for an item from a position
   * @returns {Promise<number | undefined>} Where it is, unless none was found or more was typed meanwhile
   */
  async seek(character, active, top, find) {
    const { after, cycle, text } = this.type(character)
    const next = active === undefined ? top : active + 1
    const from = active === undefined ? top : active + (after ? 1 : 0)
    this.#searches += 1
    const search = this.#searches
    const whole = await find(text, from)
    const found = whole === undefined && cycle !== undefined ? await find(cycle, next) : whole
    return search === this.#searches ? found : undefined
  }
}

export { Typeahead, WAIT, graphemes }
