/** @import { Change, Source } from '@interact/core/source' */

import { Listeners } from '@interact/core'

import { Listbox } from './listbox.js'

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
 * Items numbered by position, `count` of them, given at once. Positions are their keys, so a range of positions is
 * a filter, counted without reading anything.
 * @param {number} count - How many there are
 * @returns {Numbers} The source, how many reads it answered, and a way to report a change
 */
function numbers(count) {
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
