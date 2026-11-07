/** @import { Change, Key, Source } from '@interact/core/source' */

import { Listeners } from '@interact/core'

import { Listbox } from './legacy-listbox.js'

const START = 0
const STEP = 1

/** @typedef {Readonly<{ id: number }>} Numbered */
/** @typedef {Readonly<{ start: number, end: number }>} Range */

/**
 * A source of numbered items, any number of them, made as they are read, with the reads counted.
 * @typedef {Readonly<{ source: Source<Numbered, Range>, reads: () => number, emit: (change: Change) => void }>} Numbers
 */

/**
 * The numbered items from `start` up to `end`.
 * @param {number} start - The first position
 * @param {number} end - The position after the last
 * @returns {Numbered[]} The items
 */
function itemsBetween(start, end) {
  return Array.from({ length: end - start }, (_skip, offset) => ({ id: start + offset }))
}

/**
 * Where a numbered item's key is: its own number, while that is a position.
 * @param {Key} key - The key
 * @param {number} count - How many items there are
 * @returns {number | undefined} Its position, if there is one
 */
function numberAt(key, count) {
  return typeof key === 'number' && Number.isInteger(key) && key >= START && key < count ? key : undefined
}

/**
 * The first number in a range not passed over: no more steps than `except` has keys.
 * @param {Range} range - The range
 * @param {ReadonlySet<Key>} except - Numbers to pass over
 * @returns {number | undefined} The number, if the range has one left
 */
function firstInRange(range, except) {
  for (let position = range.start; position < range.end; position += STEP) {
    if (!except.has(position)) {
      return position
    }
  }
  return undefined
}

/**
 * Items numbered by position, `count` of them, given at once. Positions are their keys, so a range of positions is
 * a filter, counted without reading anything, and the source places items (`positionOf`, `firstMatching`) unless
 * `places` is false.
 * @param {number} count - How many there are
 * @param {boolean} [places] - Whether it can place items
 * @returns {Numbers} The source, how many reads it answered, and a way to report a change
 */
function numbers(count, places = true) {
  let reads = 0
  /** @type {Listeners<Change>} */
  const changes = new Listeners()
  /** @type {Source<Numbered, Range>} */
  const source = {
    count: () => count,
    countMatching: (range) => range.end - range.start,
    key: (item) => item.id,
    matches: (range, item) => item.id >= range.start && item.id < range.end,
    read: (start, end) => {
      reads += end - start
      return itemsBetween(start, end)
    },
    span: (start, end) => ({ end, start }),
    subscribe: (listener) => changes.add(listener),
    ...(places ? { firstMatching: firstInRange, positionOf: (key) => numberAt(key, count) } : {}),
  }
  return {
    emit: (change) => {
      changes.emit(change)
    },
    reads: () => reads,
    source,
  }
}

/**
 * What a numbered item is called.
 * @param {Numbered} item - The item
 * @returns {string} Its text
 */
function numberText(item) {
  return `Item ${String(item.id)}`
}

const TEN_BILLION = 10_000_000_000
const ROWS = 10

/**
 * The listbox the browser tests use: ten billion numbered items, ten rows, multiple selection, starting at `top`. The
 * server and the page each make one, so their markup matches.
 * @param {Source<Numbered, Range>} source - Where the items come from
 * @param {number} top - The position shown first
 * @returns {Listbox<Numbered, Range>} The listbox
 */
function tenBillionListbox(source, top) {
  return new Listbox({ id: 'list', label: 'Numbers', mode: 'multiple', rows: ROWS, source, text: numberText, top })
}

export { TEN_BILLION, numberText, numbers, tenBillionListbox }
