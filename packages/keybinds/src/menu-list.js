/**
 * A context menu's list: an item for each command, a separator between categories, which item is active, and what the
 * pointer and keys do to it. Both context menus show their commands through one.
 */

/**
 * @import { Command } from './command.js'
 * @import { InputUI } from './input.js'
 * @import { Move } from './menu-keys.js'
 * @import { ActiveCommand } from './search.js'
 */

import { bindingParts } from './binding-format.js'
import { make, namesOf } from './component-dom.js'
import { menuKey } from './menu-keys.js'

const NONE = -1
const FIRST = 0
const STEP = 1

/**
 * A command's category, if it has one that isn't empty
 * @param {Command} command - The command
 * @returns {string | undefined} Its category
 */
function categoryOf(command) {
  return command.category === '' ? undefined : command.category
}

/**
 * A binding's keys, shown as `<kbd>`s
 * @param {readonly string[]} keys - The binding's display parts
 * @returns {HTMLSpanElement} The keys
 */
function keysOf(keys) {
  const span = make('span', { className: 'context-menu__item-keys', part: 'item-keys' })
  span.append(...keys.map((key) => make('kbd', { className: 'context-menu__item-key', part: 'item-key', text: key })))
  return span
}

/**
 * An item for a command: its label and its first binding
 * @param {Command} command - The command
 * @param {readonly InputUI[]} inputs - How bindings are shown
 * @returns {HTMLLIElement} The item
 */
function itemOf(command, inputs) {
  const item = make('li', { className: 'context-menu__item' })
  item.setAttribute('role', 'menuitem')
  item.append(make('span', { className: 'context-menu__item-label', part: 'item-label', text: command.label }))
  const [first] = bindingParts(command, inputs)
  if (first !== undefined) {
    item.append(keysOf(first))
  }
  return item
}

/**
 * A line between two categories
 * @returns {HTMLLIElement} The separator
 */
function separator() {
  const line = make('li', { className: 'context-menu__separator', part: 'separator' })
  line.setAttribute('role', 'separator')
  return line
}

/**
 * The list's items, with a separator wherever the category changes from one that was set
 * @param {readonly ActiveCommand[]} rows - The commands shown, and whether each applies
 * @param {readonly InputUI[]} inputs - How bindings are shown
 * @returns {Readonly<{ items: HTMLLIElement[], nodes: HTMLLIElement[] }>} The items, and everything in the list
 */
function listOf(rows, inputs) {
  const items = rows.map(({ command }) => itemOf(command, inputs))
  const nodes = items.flatMap((item, index) => {
    const before = rows[index - STEP]
    const row = rows[index]
    return before !== undefined && row !== undefined && separates(before.command, row.command)
      ? [separator(), item]
      : [item]
  })
  return { items, nodes }
}

/**
 * Whether a separator goes between two commands: the category changes, from one that was set
 * @param {Command} before - The command above
 * @param {Command} command - The one below
 * @returns {boolean} Whether one goes between them
 */
function separates(before, command) {
  const last = categoryOf(before)
  return last !== undefined && last !== categoryOf(command)
}

/** The list of commands in a context menu, and which is active */
class MenuList {
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
  /** @type {readonly ActiveCommand[]} */
  #rows = []
  /** @type {readonly HTMLLIElement[]} */
  #items = []
  #active = NONE
  /** Whether the pointer, rather than the keys, moved last */
  #pointer = true

  /**
   * Lists commands in a list element
   * @param {HTMLUListElement} list - Where the items go
   * @param {(index: number) => void} choose - Runs the command at an index
   */
  constructor(list, choose) {
    this.#list = list
    this.#choose = choose
    list.setAttribute('tabindex', '0')
    for (const type of ['click', 'mousemove', 'mouseover']) {
      list.addEventListener(type, this)
    }
  }

  /** @returns {number} Which item is active, -1 for none */
  get active() {
    return this.#active
  }

  /** @returns {readonly ActiveCommand[]} The commands shown */
  get rows() {
    return this.#rows
  }

  /**
   * Shows commands, keeping which is active, with anything to follow them
   * @param {readonly ActiveCommand[]} rows - The commands, and whether each applies
   * @param {readonly InputUI[]} inputs - How bindings are shown
   * @param {readonly HTMLLIElement[]} [after] - What follows the commands in the list
   * @returns {void}
   */
  show(rows, inputs, after = []) {
    const { items, nodes } = listOf(rows, inputs)
    this.#rows = rows
    this.#items = items
    this.#list.replaceChildren(...nodes, ...after)
    this.#mark()
  }

  /**
   * An item's command, if it's shown and applies
   * @param {number} index - Which item
   * @returns {ActiveCommand | undefined} The command, if it can run
   */
  applying(index) {
    const row = this.#rows[index]
    return row?.active === true ? row : undefined
  }

  /**
   * What a key does: moves the active item, runs it, or closes the menu
   * @param {KeyboardEvent} event - The key going down
   * @param {Readonly<{ close: () => void, inSearch: boolean }>} menu - Closes the menu, and whether the key was
   *   pressed in its search field
   * @returns {void}
   */
  key(event, { close, inSearch }) {
    const action = menuKey(event.key, inSearch)
    if (action === undefined) {
      return
    }
    event.preventDefault()
    if (action === 'choose') {
      this.#choose(this.#active)
    } else if (action === 'close') {
      close()
    } else {
      this.move(action)
    }
  }

  /**
   * Starts over as on opening: nothing active, and the pointer leading
   * @returns {void}
   */
  reset() {
    this.#active = NONE
    this.#pointer = true
  }

  /**
   * Moves the active item by keys: down or up a step, wrapping, or to either end
   * @param {Move} where - Which way
   * @returns {void}
   */
  move(where) {
    this.#pointer = false
    const last = this.#rows.length - STEP
    const next = {
      down: this.#active < last ? this.#active + STEP : FIRST,
      end: last,
      home: FIRST,
      up: this.#active > FIRST ? this.#active - STEP : last,
    }
    this.#active = next[where]
    this.#mark()
  }

  /**
   * Hears the pointer: moving it, over an item, and clicking one
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
    } else if (this.#pointer) {
      this.#active = index
      this.#mark()
    }
  }

  /**
   * Which command's item an event happened in
   * @param {EventTarget | null} target - Where it happened
   * @returns {number | undefined} The command's index, if it was in one shown
   */
  #indexOf(target) {
    const item = target instanceof Element ? target.closest('.context-menu__item') : undefined
    const index = item instanceof HTMLLIElement ? this.#items.indexOf(item) : NONE
    return index === NONE ? undefined : index
  }

  /**
   * Shows on each item whether it's active and whether its command applies, on the items already there: building
   * them again would replace the one under the pointer, and a press that began on it would never become a click
   * @returns {void}
   */
  #mark() {
    for (const [index, row] of this.#rows.entries()) {
      const item = this.#items[index]
      const active = index === this.#active
      item?.setAttribute(
        'class',
        namesOf({
          'context-menu__item': true,
          'context-menu__item--active': active,
          'context-menu__item--disabled': !row.active,
        }),
      )
      item?.setAttribute('part', namesOf({ item: true, 'item-active': active, 'item-disabled': !row.active }))
    }
  }
}

export { MenuList }
