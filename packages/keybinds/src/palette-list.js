/**
 * The palette's list of matches: an option for each, which one is active, and what the pointer and keys do to it.
 */

/**
 * @import { InputUI } from './input.js'
 * @import { ScoredCommand } from './search.js'
 */

import { bindingParts } from './binding-format.js'
import { make, namesOf } from './component-dom.js'

const EMPTY = 'No commands found'
const STEP = 1
const FIRST = 0

/**
 * A command's label, with the characters a search matched marked
 * @param {string} label - The label
 * @param {readonly number[] | undefined} positions - The matched characters' indexes, if the search gave them
 * @returns {HTMLSpanElement} The label
 */
function labelOf(label, positions) {
  const span = make('span', { className: 'palette__item-label', part: 'item-label' })
  if (positions === undefined || positions.length === FIRST) {
    span.textContent = label
  } else {
    span.append(...marked(label, new Set(positions)))
  }
  return span
}

/**
 * A label's characters, each matched one in a `<mark>`
 * @param {string} label - The label
 * @param {ReadonlySet<number>} positions - The matched characters' indexes
 * @returns {(HTMLElement | string)[]} The characters
 */
function marked(label, positions) {
  /** @type {(HTMLElement | string)[]} */
  const parts = []
  for (let index = FIRST; index < label.length; index += STEP) {
    const char = label.charAt(index)
    parts.push(
      positions.has(index)
        ? make('mark', { className: 'palette__item-label-match', part: 'item-label-match', text: char })
        : char,
    )
  }
  return parts
}

/**
 * A binding's keys, shown as `<kbd>`s
 * @param {readonly string[]} keys - The binding's display parts
 * @returns {HTMLSpanElement} The keys
 */
function keysOf(keys) {
  const span = make('span', { className: 'palette__item-keys', part: 'item-keys' })
  span.append(...keys.map((key) => make('kbd', { className: 'palette__item-key', part: 'item-key', text: key })))
  return span
}

/**
 * Fills an option with a match: its label, description, category and first binding
 * @param {HTMLLIElement} item - The option
 * @param {ScoredCommand} result - The match
 * @param {readonly InputUI[]} inputs - How bindings are shown
 * @returns {void}
 */
function fill(item, result, inputs) {
  const { command } = result
  /** @type {HTMLElement[]} */
  const parts = [labelOf(command.label, result.positions)]
  if (command.description !== undefined && command.description !== '') {
    parts.push(
      make('span', { className: 'palette__item-description', part: 'item-description', text: command.description }),
    )
  }
  if (command.category !== undefined && command.category !== '') {
    parts.push(make('span', { className: 'palette__item-category', part: 'item-category', text: command.category }))
  }
  const [first] = bindingParts(command, inputs)
  if (first !== undefined) {
    parts.push(keysOf(first))
  }
  item.replaceChildren(...parts)
}

/** The list of matches in a palette, and which is active */
class PaletteList {
  /**
   * @readonly
   * @type {HTMLUListElement}
   */
  #list
  /**
   * @readonly
   * @type {(index: number) => void}
   */
  #choose
  /**
   * One option per match shown, kept to be filled again
   * @readonly
   * @type {HTMLLIElement[]}
   */
  #items = []
  /**
   * @readonly
   * @type {HTMLLIElement}
   */
  #empty = make('li', { className: 'palette__empty', part: 'empty', text: EMPTY })
  /** @type {readonly ScoredCommand[]} */
  #results = []
  #active = FIRST
  /** Whether the pointer, rather than the keys, moved last */
  #pointer = false

  /**
   * Lists matches in a list element
   * @param {HTMLUListElement} list - Where the options go
   * @param {(index: number) => void} choose - Runs the match at an index
   */
  constructor(list, choose) {
    this.#list = list
    this.#choose = choose
    for (const type of ['click', 'mousemove', 'mouseover']) {
      list.addEventListener(type, this)
    }
  }

  /** @returns {number} Which match is active */
  get active() {
    return this.#active
  }

  /** @returns {readonly ScoredCommand[]} The matches shown */
  get results() {
    return this.#results
  }

  /**
   * Shows matches, the first active
   * @param {readonly ScoredCommand[]} results - The matches
   * @param {readonly InputUI[]} inputs - How bindings are shown
   * @returns {void}
   */
  show(results, inputs) {
    this.#results = results
    this.#active = FIRST
    if (results.length === FIRST) {
      this.#list.replaceChildren(this.#empty)
      return
    }
    const items = results.map((result, index) => {
      const item = this.#itemAt(index)
      fill(item, result, inputs)
      return item
    })
    this.#list.replaceChildren(...items)
    this.#mark()
    this.#list.scrollTop = FIRST
  }

  /**
   * Moves the active match by keys: down or up a step, wrapping, or to either end
   * @param {'down' | 'end' | 'home' | 'up'} where - Which way
   * @returns {void}
   */
  move(where) {
    this.#pointer = false
    const last = this.#results.length - STEP
    const next = {
      down: this.#active < last ? this.#active + STEP : FIRST,
      end: last,
      home: FIRST,
      up: this.#active > FIRST ? this.#active - STEP : last,
    }
    this.#setActive(next[where])
    this.#items[this.#active]?.scrollIntoView({ block: 'nearest' })
  }

  /**
   * Starts over in keyboard mode, as on opening
   * @returns {void}
   */
  reset() {
    this.#pointer = false
    this.#active = FIRST
  }

  /**
   * Hears the pointer: moving it, over an option, and clicking one
   * @param {Event} event - A click, mousemove or mouseover
   * @returns {void}
   */
  handleEvent(event) {
    if (event.type === 'mousemove') {
      this.#pointer = true
      return
    }
    const index = this.#indexOf(event.target)
    if (index === undefined) {
      return
    }
    if (event.type === 'click') {
      this.#choose(index)
    } else if (this.#pointer && index !== this.#active) {
      this.#setActive(index)
    }
  }

  /**
   * The option for a match, made the first time it's needed
   * @param {number} index - The match's index
   * @returns {HTMLLIElement} Its option
   */
  #itemAt(index) {
    const found = this.#items[index]
    if (found !== undefined) {
      return found
    }
    const item = make('li', { className: 'palette__item' })
    item.setAttribute('role', 'option')
    this.#items[index] = item
    return item
  }

  /**
   * Which match's option an event happened in
   * @param {EventTarget | null} target - Where it happened
   * @returns {number | undefined} The match's index, if it was in one shown
   */
  #indexOf(target) {
    const item = target instanceof Element ? target.closest('.palette__item') : undefined
    const index = item instanceof HTMLLIElement ? this.#items.indexOf(item) : -STEP
    return index >= FIRST && index < this.#results.length ? index : undefined
  }

  /**
   * @param {number} index - The match to make active
   * @returns {void}
   */
  #setActive(index) {
    this.#active = index
    this.#mark()
  }

  /**
   * Shows on each option whether it's active and whether its command applies
   * @returns {void}
   */
  #mark() {
    for (const [index, result] of this.#results.entries()) {
      const item = this.#itemAt(index)
      const active = index === this.#active
      item.className = namesOf({
        palette__item: true,
        'palette__item--active': active,
        'palette__item--disabled': !result.active,
      })
      item.setAttribute('part', namesOf({ item: true, 'item-active': active, 'item-disabled': !result.active }))
      item.setAttribute('aria-selected', String(active))
    }
  }
}

export { PaletteList }
