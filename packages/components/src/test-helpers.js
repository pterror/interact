/**
 * @import { ListPipeline } from '@interact/core/list-pipeline'
 * @import { Change, Key, Source } from '@interact/core/source'
 * @import { Extension } from '@interact/core/state'
 * @import { TemplateResult } from '@interact/dom/template'
 * @import { ActiveItem } from './active-item.js'
 * @import { Listbox } from './listbox.js'
 * @import { ListSelection, SelectionMode } from './list-selection.js'
 * @import { Typeahead } from './typeahead.js'
 * @import { Windowing } from './windowing.js'
 */

import { Listeners, Store, keyInput, listPipeline } from '@interact/core'
import { defaultRendering } from '@interact/dom'

import { active } from './active-item.js'
import { focusEntering } from './focus-entering.js'
import { selection } from './list-selection.js'
import { listbox } from './listbox.js'
import { navigation } from './navigation.js'
import { typeahead } from './typeahead.js'
import { windowing } from './windowing.js'

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
 * A listbox made of its core and every extension it has, and handles on each, for tests to drive and look at.
 * @template T, F
 * @template {Source<T, F>} S
 * @typedef {Readonly<{
 *   store: Store,
 *   list: ListPipeline<T, TemplateResult, S>,
 *   current: ActiveItem<T, TemplateResult, S>,
 *   core: Listbox<T, S>,
 *   chosen: ListSelection<T, TemplateResult, F, S>,
 *   typing: Typeahead<T, TemplateResult, S>,
 *   windowed: Windowing<T, TemplateResult, S> | undefined,
 * }>} Made
 */

/**
 * How a test's listbox is made: its selection mode, whether it is windowed and how many rows show, the top at first,
 * the clock typing is timed by, what an item is called and which items focus passes over, and anything more.
 * @template T
 * @typedef {Readonly<{
 *   mode?: SelectionMode,
 *   rows?: number,
 *   top?: number,
 *   now?: () => number,
 *   text?: (item: T) => string,
 *   skip?: (item: T) => boolean,
 *   id?: string,
 *   label?: string,
 *   more?: Extension,
 * }>} Making
 */

/**
 * A listbox over a source with every extension: navigation, typeahead, selection, focus entering, the default
 * rendering, and windowing when `rows` is given.
 * @template T, F
 * @template {Source<T, F>} S
 * @param {S & Source<T, F>} source - Where the items come from
 * @param {Making<T>} [making] - How it is made
 * @returns {Made<T, F, S>} The listbox and its handles
 */
function listboxOver(source, making = {}) {
  /** @type {ListPipeline<T, TemplateResult, S>} */
  const list = listPipeline(source)
  const current = active(list)
  const core = listbox(current, { id: making.id, label: making.label })
  const chosen = selection(current, { mode: making.mode })
  const typing = typeahead(current, { now: making.now })
  const windowed = making.rows === undefined ? undefined : windowing(list, { rows: making.rows, top: making.top })
  const { skip, text } = making
  const store = new Store([
    core,
    navigation(current),
    typing,
    chosen,
    focusEntering(current),
    windowed ?? [],
    text === undefined ? [] : list.text.of(text),
    skip === undefined ? [] : current.skip.of(skip),
    defaultRendering(list),
    making.more ?? [],
  ])
  return { chosen, core, current, list, store, typing, windowed }
}

/**
 * The listbox the browser tests use: ten billion numbered items, ten rows, multiple selection, starting at `top`. The
 * server and the page each make one, so their markup matches.
 * @param {Source<Numbered, Range>} source - Where the items come from
 * @param {number} top - The position shown first
 * @returns {Made<Numbered, Range, Source<Numbered, Range>>} The listbox
 */
function tenBillionListbox(source, top) {
  return listboxOver(source, { id: 'list', label: 'Numbers', mode: 'multiple', rows: ROWS, text: numberText, top })
}

/**
 * A key pressed in a store, with what was held.
 * @param {Store} store - The store
 * @param {string} key - The key, as `KeyboardEvent.key` names it
 * @param {Readonly<{ shift?: boolean, toggle?: boolean, alt?: boolean }>} [held] - What was held
 * @returns {boolean} Whether an extension took it
 */
function press(store, key, held = {}) {
  const { alt = false, shift = false, toggle = false } = held
  return store.handle(keyInput.of({ alt, key, shift, toggle }))
}

export { TEN_BILLION, listboxOver, numberText, numbers, press, tenBillionListbox }
