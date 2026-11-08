/**
 * A plain listbox of fruit, wired by hand from `@pterror/interact-list`, with its keys bound by keybinds, for the browser test.
 */

import { keybinds, keys } from '@pterror/interact-keybinds'
import {
  activeDescendant,
  arrayList,
  arrayStep,
  flowMount,
  groupMount,
  ids,
  mark,
  move,
  pick,
  render,
  reveal,
  withHeaders,
} from '@pterror/interact-list'

const FRUIT = ['Apple', 'Banana', 'Cherry', 'Date', 'Elderberry', 'Fig', 'Grape', 'Honeydew']

/** @type {ReadonlyMap<string, string>} */
const KINDS = new Map([
  ['Apple', 'Tree'],
  ['Banana', 'Tree'],
  ['Cherry', 'Tree'],
  ['Date', 'Palm'],
  ['Elderberry', 'Shrub'],
  ['Fig', 'Shrub'],
  ['Grape', 'Vine'],
  ['Honeydew', 'Vine'],
])

/** A header row's key starts with this, which no fruit does */
const HEADER = '#'

const list = arrayList(FRUIT)

/**
 * A key's group: a header's own, or a fruit's kind
 * @param {string} key - The key
 * @returns {string} Its group
 */
function kindOf(key) {
  return key.startsWith(HEADER) ? key.slice(HEADER.length) : (KINDS.get(key) ?? '')
}

/**
 * A group's header key
 * @param {string} kind - The group
 * @returns {string} Its header's key
 */
function headerOf(kind) {
  return `${HEADER}${kind}`
}

/**
 * What the listbox shows a screen reader, and where focus is
 * @typedef {Readonly<{ focused: boolean, active: string | undefined, selected: readonly string[],
 *   groups: readonly string[], options: number }>} ListboxSeen
 */

/**
 * A key's element id
 * @param {string} key - The key
 * @returns {string} Its id
 */
function idOf(key) {
  return `fruit-${key}`
}

/**
 * An option for a key
 * @param {string} key - The key
 * @returns {Element} The option
 */
function create(key) {
  const row = document.createElement('div')
  if (key.startsWith(HEADER)) {
    row.setAttribute('role', 'presentation')
    row.textContent = kindOf(key)
  } else {
    row.setAttribute('role', 'option')
    row.textContent = key
  }
  return row
}

/**
 * Puts the listbox in the page
 * @param {Readonly<{ grouped?: boolean }>} [options] - Whether its fruit is grouped by kind, with a header each
 * @returns {void}
 */
function putListbox({ grouped = false } = {}) {
  const box = document.createElement('div')
  box.setAttribute('role', 'listbox')
  box.setAttribute('aria-label', 'Fruit')
  box.tabIndex = 0
  box.style.cssText = 'height: 6em; overflow: auto'
  document.body.append(box)
  const active = list.hold(undefined, 'next')
  const selected = list.hold(undefined, 'none')
  const rendered = render({
    create,
    drawn: grouped ? withHeaders({ drawn: list, groupOf: kindOf, headerOf }) : list,
    facets: [
      ids(idOf),
      activeDescendant({ active, element: box, idOf }),
      mark({ attribute: 'data-active', on: '', test: active }),
      mark({ attribute: 'aria-selected', on: 'true', test: selected }),
      reveal(active),
    ],
    mount: grouped
      ? groupMount({ container: box, groupOf: kindOf, labelIdOf: (kind) => idOf(headerOf(kind)) })
      : flowMount(box),
  })
  pick({
    element: box,
    itemOf: rendered.itemOf,
    to: (key) => {
      active.set(key)
      selected.set(key)
    },
  })
  const moves = move({ from: active.get, step: arrayStep(list.keys), to: active.set })
  keybinds(
    [
      {
        execute: () => {
          void moves.by(1)
        },
        id: 'next',
        keys: ['ArrowDown'],
        label: 'Next',
      },
      {
        execute: () => {
          void moves.by(-1)
        },
        id: 'previous',
        keys: ['ArrowUp'],
        label: 'Previous',
      },
      {
        execute: () => {
          void moves.edge(1)
        },
        id: 'first',
        keys: ['Home'],
        label: 'First',
      },
      {
        execute: () => {
          void moves.edge(-1)
        },
        id: 'last',
        keys: ['End'],
        label: 'Last',
      },
      {
        execute: () => {
          selected.set(active.get())
        },
        id: 'choose',
        keys: ['Enter', 'Space'],
        label: 'Choose',
      },
    ],
    () => ({}),
    { inputs: [keys()], target: box },
  )
}

/**
 * Removes an item from the list
 * @param {string} key - The item
 * @returns {void}
 */
function removeItem(key) {
  list.set(list.keys().filter((each) => each !== key))
}

/**
 * What the listbox shows now
 * @returns {ListboxSeen} What a screen reader is told, and whether the listbox has focus
 */
function seenListbox() {
  const box = document.querySelector('[role=listbox]')
  const named = box?.getAttribute('aria-activedescendant')
  const active = named === null || named === undefined ? undefined : document.querySelector(`#${CSS.escape(named)}`)
  return {
    active: active?.textContent ?? undefined,
    focused: box !== null && document.activeElement === box,
    groups: [...document.querySelectorAll('[role=group]')].map((group) => {
      const label = group.getAttribute('aria-labelledby')
      return label === null ? '' : (document.querySelector(`#${CSS.escape(label)}`)?.textContent ?? '')
    }),
    options: document.querySelectorAll('[role=option]').length,
    selected: [...document.querySelectorAll('[role=option][aria-selected=true]')].map((each) => each.textContent),
  }
}

export { putListbox, removeItem, seenListbox }
