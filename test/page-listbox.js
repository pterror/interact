/**
 * A plain listbox of fruit, wired by hand from `@interact/list`, with its keys bound by keybinds, for the browser test.
 */

import {
  activeDescendant,
  arrayList,
  arrayStep,
  flowMount,
  ids,
  mark,
  move,
  pick,
  render,
  reveal,
} from '@interact/list'
import { keybinds, keys } from 'keybinds'

const FRUIT = ['Apple', 'Banana', 'Cherry', 'Date', 'Elderberry', 'Fig', 'Grape', 'Honeydew']

const list = arrayList(FRUIT)

/**
 * What the listbox shows a screen reader, and where focus is
 * @typedef {Readonly<{ focused: boolean, active: string | undefined, selected: readonly string[],
 *   options: number }>} ListboxSeen
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
  const option = document.createElement('div')
  option.setAttribute('role', 'option')
  option.textContent = key
  return option
}

/**
 * Puts the listbox in the page
 * @returns {void}
 */
function putListbox() {
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
    drawn: list,
    facets: [
      ids(idOf),
      mark({ attribute: 'data-active', on: '', test: active }),
      mark({ attribute: 'aria-selected', off: 'false', on: 'true', test: selected }),
      reveal(active),
    ],
    mount: flowMount(box),
  })
  activeDescendant({ active, element: box, idOf })
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
    options: document.querySelectorAll('[role=option]').length,
    selected: [...document.querySelectorAll('[role=option][aria-selected=true]')].map((each) => each.textContent),
  }
}

export { putListbox, removeItem, seenListbox }
