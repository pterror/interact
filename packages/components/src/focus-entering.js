/**
 * @import { ItemSource } from '@interact/core/source'
 * @import { Extension } from '@interact/core/state'
 * @import { Store } from '@interact/core/store'
 * @import { ActiveItem } from './active-item.js'
 */

import { entry } from '@interact/core'
import { viewPlugin } from '@interact/dom'

/**
 * Focus entering a list, as the WAI-ARIA Authoring Practices listbox pattern has it: the active item stays, and is
 * shown. With nothing active, focus goes where the first extension that knows says (a selection's first item, which
 * a source may answer only later), else to the top item shown, never onto an item focus passes over. An answer that
 * comes later is dropped if something became active first, or the source changed. Focus entering only places focus:
 * a selection that follows the active item doesn't follow it.
 * @template T, R
 * @template {ItemSource<T>} S
 * @param {ActiveItem<T, R, S>} current - The list's active item
 * @returns {Extension} The extension
 */
function focusEntering(current) {
  const { list } = current
  /**
   * Makes an item active as focus enters, unless something already is or the source changed since focus entered.
   * @param {Store} store - The store
   * @param {ItemSource<T>} source - The source when focus entered
   * @param {number | undefined} position - Where focus should go, if known
   * @returns {void}
   */
  const enter = (store, source, position) => {
    const { state } = store
    if (current.positionIn(state) !== undefined || state.field(list.source) !== source) {
      return
    }
    const top = state.facet(list.visible)(state)?.start ?? 0
    const entered = entry(position ?? top, list.listOf(state).count())
    const landed = entered === undefined ? undefined : current.landing(state, entered, 1)
    if (landed !== undefined) {
      store.dispatch({ effects: current.go(landed, { entering: true }) })
    }
  }
  const page = viewPlugin((store, root) => {
    /**
     * Focus coming into the list.
     * @returns {void}
     */
    const focusin = () => {
      const { state } = store
      const at = current.positionIn(state)
      if (at !== undefined) {
        store.dispatch({ effects: list.reveal.of(at) })
        return
      }
      const source = state.field(list.source)
      /** @type {number | undefined | Promise<number | undefined>} */
      let point = undefined
      for (const where of state.facet(current.entering)) {
        point = where(state)
        if (point !== undefined) {
          break
        }
      }
      if (point instanceof Promise) {
        const later = point
        void (async () => {
          enter(store, source, await later)
        })()
      } else {
        enter(store, source, point)
      }
    }
    root.addEventListener('focusin', focusin)
    return {
      destroy: () => {
        root.removeEventListener('focusin', focusin)
      },
    }
  })
  return [current, page]
}

export { focusEntering }
