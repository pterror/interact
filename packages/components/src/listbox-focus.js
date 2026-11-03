/**
 * Where focus goes as it enters a listbox, as the WAI-ARIA listbox pattern has it: the active item if there is one,
 * otherwise the first selected item. A source that can place items (`findsSelected`) says where that is; without one,
 * the item last chosen stands in for it, or the top item when nothing was.
 * @import { Selection } from '@interact/core/selection'
 * @import { Listbox } from './listbox.js'
 */

import { entry } from '@interact/core'

const NONE = 0

/**
 * Makes an item active as focus enters: `position` while it is inside, otherwise the item last chosen, or the top.
 * @template T, F
 * @param {Listbox<T, F>} listbox - The listbox
 * @param {number | undefined} position - Where focus should go, if known
 * @returns {number | undefined} The position made active, if there are items
 */
function enterAt(listbox, position) {
  const left = position ?? listbox.choose.anchor ?? listbox.scroll.top.get()
  const at = entry(left, listbox.items.count)
  if (at !== undefined) {
    listbox.active.request(at)
  }
  return at
}

/**
 * Makes the first selected item active and shows it, once the source has said where it is. The answer is dropped if
 * a key made something active meanwhile, or the source changed.
 * @template T, F
 * @param {Listbox<T, F>} listbox - The listbox
 * @param {Selection<F>} selection - What is selected
 * @returns {Promise<void>} When it has, or the answer was dropped
 */
async function enterSelected(listbox, selection) {
  const { source } = listbox.items
  const found = await listbox.items.firstSelected(selection)
  if (listbox.active.get() !== undefined || listbox.items.source !== source) {
    return
  }
  const entered = enterAt(listbox, found)
  if (found !== undefined && entered !== undefined) {
    listbox.scroll.reveal(entered)
  }
}

/**
 * What focus entering a listbox does: the active item stays and is scrolled into view. With nothing active, the first
 * selected item becomes active and is shown when the source can say where it is; otherwise, or with nothing selected,
 * the item last chosen, or the top one.
 * @template T, F
 * @param {Listbox<T, F>} listbox - The listbox
 * @returns {void}
 */
function enterFocus(listbox) {
  const active = listbox.active.get()
  if (active !== undefined) {
    listbox.scroll.reveal(active)
    return
  }
  const selection = listbox.selection.get()
  const chosen = selection.filter !== undefined || selection.added.size > NONE
  if (chosen && listbox.items.findsSelected(selection)) {
    void enterSelected(listbox, selection)
    return
  }
  enterAt(listbox, undefined)
}

export { enterFocus }
