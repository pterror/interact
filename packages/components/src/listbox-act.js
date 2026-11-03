/**
 * What a listbox does for each key action, through its own methods and state.
 * @import { KeyAction } from './listbox-keys.js'
 * @import { Listbox } from './listbox.js'
 */

import { move } from '@interact/core'

import { landing } from './landing.js'

const NONE = 0
const ONE = 1
const FORWARD = 1
const BACK = -1

/**
 * Where a key moves the active item, if it moves it: never onto an item focus passes over.
 * @template T, F
 * @param {Listbox<T, F>} listbox - The listbox
 * @param {KeyAction} action - What the key asked
 * @returns {number | undefined} Where it goes
 */
function target(listbox, action) {
  const { count } = listbox.items
  if (action.kind === 'move') {
    const by = action.rows + action.pages * listbox.scroll.rows.get()
    return landing(
      listbox,
      move(listbox.active.get() ?? listbox.scroll.top.get(), by, count),
      by < NONE ? BACK : FORWARD,
    )
  }
  if (action.kind === 'first') {
    return landing(listbox, NONE, FORWARD)
  }
  return action.kind === 'last' ? landing(listbox, count - ONE, BACK) : undefined
}

/**
 * Does what a key asked of the active item: activates or toggles it, selects through to it from the anchor, or
 * selects from it to the first or last item and goes there.
 * @template T, F
 * @param {Listbox<T, F>} listbox - The listbox
 * @param {KeyAction} action - What it asked
 * @returns {void}
 */
function onActive(listbox, action) {
  const active = listbox.active.get()
  if (active === undefined) {
    return
  }
  if (action.kind === 'activate') {
    listbox.activate(active)
  } else if (action.kind === 'toggle') {
    listbox.choose.toggle(active)
  } else if (action.kind === 'through') {
    listbox.choose.moved(active, true)
  } else if (action.kind === 'toFirst' || action.kind === 'toLast') {
    selectToEnd(listbox, active, action.kind === 'toFirst' ? NONE : listbox.items.count - ONE)
  }
}

/**
 * Selects from the active item to the first or last, and goes there.
 * @template T, F
 * @param {Listbox<T, F>} listbox - The listbox
 * @param {number} active - The active item
 * @param {number} end - The first or last position
 * @returns {void}
 */
function selectToEnd(listbox, active, end) {
  listbox.choose.span(active, end)
  listbox.active.request(end)
  listbox.scroll.reveal(end)
}

/**
 * Does what a key asked: moves the active item and shows it, looks for an item by what was typed, selects everything,
 * or acts on the active item.
 * @template T, F
 * @param {Listbox<T, F>} listbox - The listbox
 * @param {KeyAction} action - What it asked
 * @param {boolean} extend - Whether Shift was held, to select through from the anchor
 * @returns {void}
 */
function act(listbox, action, extend) {
  const to = target(listbox, action)
  if (to !== undefined) {
    listbox.goTo(to, extend)
  } else if (action.kind === 'type') {
    void listbox.type(action.character)
  } else if (action.kind === 'all' && listbox.choose.mode === 'multiple') {
    listbox.choose.all()
  } else {
    onActive(listbox, action)
  }
}

export { act }
