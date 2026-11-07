/** @import { Change, Key, Source } from './source.js' */

import { Listeners } from './listeners.js'
import { plainText, startsWithTyped } from './text.js'

/**
 * The items from the one with key `first` to the one with key `last`, wherever they are now.
 * @typedef {Readonly<{ first: Key, last: Key }>} Span
 */

const NOT_FOUND = -1

/**
 * A source over items held in memory. Its filters are spans between two keys, so a span keeps meaning the same items
 * as others are inserted or removed around them. It searches its items' text, as `textOf` gives it.
 * @template T
 * @implements {Source<T, Span>}
 */
class MemorySource {
  /**
   * @readonly
   * @type {T[]}
   */
  #items
  /**
   * @readonly
   * @type {(item: T) => Key}
   */
  #keyOf
  /**
   * @readonly
   * @type {(item: T) => string}
   */
  #textOf
  /** @type {Map<Key, number> | undefined} */
  #positions = undefined
  /**
   * @readonly
   * @type {Listeners<Change>}
   */
  #changes = new Listeners()

  /**
   * @param {readonly T[]} items - The items, in order
   * @param {(item: T) => Key} keyOf - What identifies an item
   * @param {(item: T) => string} [textOf] - What an item is called, for searching (default: a string or number as
   *   itself, anything else as nothing)
   */
  constructor(items, keyOf, textOf = plainText) {
    this.#items = [...items]
    this.#keyOf = keyOf
    this.#textOf = textOf
  }

  /**
   * How many items there are.
   * @returns {number} The count
   */
  count() {
    return this.#items.length
  }

  /**
   * The items from `start` up to `end`.
   * @param {number} start - The first position
   * @param {number} end - The position after the last
   * @returns {readonly T[]} The items
   */
  read(start, end) {
    return this.#items.slice(start, end)
  }

  /**
   * What identifies an item.
   * @param {T} item - The item
   * @returns {Key} Its key
   */
  key(item) {
    return this.#keyOf(item)
  }

  /**
   * Calls `listener` with every change.
   * @param {(change: Change) => void} listener - Called with what changed
   * @returns {() => void} Stops calling it
   */
  subscribe(listener) {
    return this.#changes.add(listener)
  }

  /**
   * The items now from `start` up to `end`, as a span that follows them.
   * @param {number} start - The first position
   * @param {number} end - The position after the last, past `start`
   * @returns {Span} The span
   */
  span(start, end) {
    const first = this.#items.at(start)
    const last = this.#items.at(end - 1)
    if (start < 0 || end <= start || end > this.#items.length || first === undefined || last === undefined) {
      throw new RangeError(`No items from ${String(start)} up to ${String(end)}`)
    }
    return { first: this.#keyOf(first), last: this.#keyOf(last) }
  }

  /**
   * Whether an item is in a span.
   * @param {Span} span - The span
   * @param {T} item - The item
   * @returns {boolean} Whether it lies between the span's ends, as they are now
   */
  matches(span, item) {
    const [low, high] = this.#ends(span)
    const position = this.#position(this.#keyOf(item))
    return low !== NOT_FOUND && high !== NOT_FOUND && position >= low && position <= high
  }

  /**
   * How many items a span has now.
   * @param {Span} span - The span
   * @returns {number} Its count, or none when an end has gone
   */
  countMatching(span) {
    const [low, high] = this.#ends(span)
    return low === NOT_FOUND || high === NOT_FOUND ? 0 : high - low + 1
  }

  /**
   * The first position at or after `from` whose item's text starts with `text`, ignoring case and accents.
   * @param {string} text - What was typed
   * @param {number} from - Where to start
   * @returns {number | undefined} The position, if an item's text starts so
   */
  findPrefix(text, from) {
    for (let position = Math.max(from, 0); position < this.#items.length; position += 1) {
      const item = this.#items[position]
      if (item !== undefined && startsWithTyped(this.#textOf(item), text)) {
        return position
      }
    }
    return undefined
  }

  /**
   * Where the item with a key is now.
   * @param {Key} key - The key
   * @returns {number | undefined} Its position, if it is here
   */
  positionOf(key) {
    const position = this.#position(key)
    return position === NOT_FOUND ? undefined : position
  }

  /**
   * The first position in a span whose key isn't in `except`: no more steps than `except` has keys.
   * @param {Span} span - The span
   * @param {ReadonlySet<Key>} except - Keys to pass over
   * @returns {number | undefined} The position, if the span has such an item
   */
  firstMatching(span, except) {
    const [low, high] = this.#ends(span)
    if (low === NOT_FOUND || high === NOT_FOUND) {
      return undefined
    }
    for (let position = low; position <= high; position += 1) {
      const item = this.#items[position]
      if (item !== undefined && !except.has(this.#keyOf(item))) {
        return position
      }
    }
    return undefined
  }

  /**
   * Puts items in at a position.
   * @param {number} start - Where the first goes
   * @param {readonly T[]} items - The items
   * @returns {void}
   */
  insert(start, items) {
    this.#items.splice(start, 0, ...items)
    this.#changed({ end: start + items.length, kind: 'inserted', start })
  }

  /**
   * Takes out the items from `start` up to `end`.
   * @param {number} start - The first position
   * @param {number} end - The position after the last
   * @returns {void}
   */
  remove(start, end) {
    this.#items.splice(start, end - start)
    this.#changed({ end, kind: 'removed', start })
  }

  /**
   * Replaces the items from `start` on with others, as many.
   * @param {number} start - The first position
   * @param {readonly T[]} items - The new items
   * @returns {void}
   */
  replace(start, items) {
    this.#items.splice(start, items.length, ...items)
    this.#changed({ end: start + items.length, kind: 'changed', start })
  }

  /**
   * Notes a change and tells the listeners.
   * @param {Change} change - What changed
   * @returns {void}
   */
  #changed(change) {
    this.#positions = undefined
    this.#changes.emit(change)
  }

  /**
   * Where the item with a key is.
   * @param {Key} key - The key
   * @returns {number} Its position, or NOT_FOUND
   */
  #position(key) {
    this.#positions ??= new Map(this.#items.map((item, index) => [this.#keyOf(item), index]))
    return this.#positions.get(key) ?? NOT_FOUND
  }

  /**
   * Where a span's ends are, lower first.
   * @param {Span} span - The span
   * @returns {[number, number]} The positions, NOT_FOUND for an end that has gone
   */
  #ends(span) {
    const first = this.#position(span.first)
    const last = this.#position(span.last)
    return first <= last ? [first, last] : [last, first]
  }
}

export { MemorySource }
