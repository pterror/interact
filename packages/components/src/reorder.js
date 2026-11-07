/**
 * @import { Attributes, RenderRow } from '@interact/core/list-pipeline'
 * @import { ItemSource, Key } from '@interact/core/source'
 * @import { Builder, EffectType, Extension, Field, State, Transaction } from '@interact/core/state'
 * @import { Store } from '@interact/core/store'
 * @import { ActiveItem } from './active-item.js'
 */

import { defineEffect, defineField, inputHandler, keyInput, precedence } from '@interact/core'
import { inOwnView, viewPlugin } from '@interact/dom'

import { readNow } from './active-item.js'

/** How far, in pixels, the pointer moves with the button down before a press becomes a drag. */
const THRESHOLD = 4
const WHOLE = 100

/**
 * A move the app makes on its source: the item at `from`, whose key is `key`, goes to `to`, counted in the list as it
 * is once the item has been taken out (so `to` is where the item ends up).
 * @typedef {Readonly<{ from: number, to: number, key: Key }>} Move
 */

/**
 * A drag going on: the position of the item being dragged, and the position it would land at.
 * @typedef {Readonly<{ from: number, over: number }>} Drag
 */

/**
 * A press that may become a drag: which pointer, the row's position, where the pointer was in the list's content, the
 * row's height, and the list's element.
 * @typedef {Readonly<{ pointer: number, from: number, y: number, height: number, list: HTMLElement }>} Pressed
 */

/**
 * Where a pointer is in a list's content, in pixels from its top: the same place whether the page or the list scrolls.
 * @param {HTMLElement} list - The list's element
 * @param {number} clientY - The pointer's place in the viewport
 * @returns {number} Its place in the content
 */
function contentY(list, clientY) {
  return clientY - list.getBoundingClientRect().top + list.scrollTop
}

/**
 * Reordering a list's items, by dragging a row with the pointer or by moving the active item with Alt and the up and
 * down arrows. While a row is dragged, it is drawn where it would land and the rows between make room for it, by
 * `translate` alone (`part="dragging"` marks the row). Rows are taken to be one height, as a windowed list's are. A drag
 * starts once the pointer has moved `THRESHOLD` pixels with the button down, so a press stays a press; Escape or the
 * pointer being cancelled puts it back; letting go drops it. The drop, like a key's move, is the app's to make on its
 * source (`move`), whose removal and insertion move every position held; the active item, when it is the one moved,
 * goes with it, found by its key where the source can place items.
 * @template T, R
 * @template {ItemSource<T>} S
 */
class Reorder {
  /**
   * A drag starts, from a position.
   * @readonly
   * @type {EffectType<number>}
   */
  started = defineEffect()
  /**
   * The dragged item would land at a position.
   * @readonly
   * @type {EffectType<number>}
   */
  over = defineEffect()
  /**
   * The drag ends, dropped or put back.
   * @readonly
   * @type {EffectType<undefined>}
   */
  ended = defineEffect()
  /**
   * The drag going on, if any.
   * @readonly
   * @type {Field<Drag | undefined>}
   */
  field
  /**
   * @readonly
   * @type {ActiveItem<T, R, S>}
   */
  #current
  /**
   * @readonly
   * @type {(move: Move) => void | Promise<void>}
   */
  #move

  /**
   * @param {ActiveItem<T, R, S>} current - The list's active item
   * @param {(move: Move) => void | Promise<void>} move - Makes a move on the app's source
   */
  constructor(current, move) {
    this.#current = current
    this.#move = move
    this.field = defineField({
      /** @returns {Drag | undefined} No drag at first */
      create: () => undefined,
      update: (drag, transaction) => this.#next(drag, transaction),
    })
  }

  /**
   * Puts reordering in a configuration.
   * @param {Builder} into - The configuration being built
   * @param {number} level - Its level
   * @returns {void}
   */
  install(into, level) {
    const { list } = this.#current
    /** @type {Extension} */
    const parts = [
      this.#current,
      this.field,
      list.attributes.of((row, state) => this.#rowAttributes(row, state)),
      precedence(
        'high',
        inputHandler.of((input, store) => input.is(keyInput) && this.#key(input.value, store)),
      ),
      this.#page(),
    ]
    into.add(parts, level)
  }

  /**
   * The drag going on in a state.
   * @param {State} state - The state
   * @returns {Drag | undefined} The drag, if any
   */
  dragIn(state) {
    return state.field(this.field)
  }

  /**
   * Starts dragging the item at a position, unless a drag is going on or it hasn't been read.
   * @param {Store} store - The store
   * @param {number} from - Where it is
   * @returns {void}
   */
  start(store, from) {
    const { state } = store
    if (this.dragIn(state) === undefined && readNow(this.#current.list.listOf(state), from) !== undefined) {
      store.dispatch({ effects: this.started.of(from) })
    }
  }

  /**
   * Has the dragged item land at a position, kept inside the list.
   * @param {Store} store - The store
   * @param {number} position - Where it would land
   * @returns {void}
   */
  dragOver(store, position) {
    const { state } = store
    const drag = this.dragIn(state)
    const over = Math.min(Math.max(position, 0), this.#current.list.listOf(state).count() - 1)
    if (drag !== undefined && drag.over !== over) {
      store.dispatch({ effects: this.over.of(over) })
    }
  }

  /**
   * Puts the dragged item back where it was.
   * @param {Store} store - The store
   * @returns {void}
   */
  cancel(store) {
    if (this.dragIn(store.state) !== undefined) {
      store.dispatch({ effects: this.ended.of(undefined) })
    }
  }

  /**
   * Drops the dragged item where it would land.
   * @param {Store} store - The store
   * @returns {void}
   */
  drop(store) {
    const drag = this.dragIn(store.state)
    if (drag === undefined) {
      return
    }
    store.dispatch({ effects: this.ended.of(undefined) })
    if (drag.over !== drag.from) {
      this.move(store, drag.from, drag.over)
    }
  }

  /**
   * Moves the item at `from` to `to`, by the app's move on its source; when it is the active item, the active item goes
   * with it: where the source now places its key, or else to `to`.
   * @param {Store} store - The store
   * @param {number} from - Where the item is
   * @param {number} to - Where it goes
   * @returns {void}
   */
  move(store, from, to) {
    const { state } = store
    const list = this.#current.list.listOf(state)
    const item = readNow(list, from)
    if (item === undefined || from === to) {
      return
    }
    const key = list.key(item.item)
    const followed = this.#current.positionIn(state) === from
    const done = this.#move({ from, key, to })
    if (!followed) {
      return
    }
    /**
     * Makes the moved item active where it now is.
     * @returns {void}
     */
    const follow = () => {
      const now = this.#current.list.listOf(store.state)
      const placed = now.positionOf === undefined ? to : now.positionOf(key)
      if (placed instanceof Promise) {
        void (async () => {
          this.#land(store, await placed)
        })()
      } else {
        this.#land(store, placed)
      }
    }
    if (done instanceof Promise) {
      void (async () => {
        await done
        follow()
      })()
    } else {
      follow()
    }
  }

  /**
   * Makes a position active and shows it, if there is one.
   * @param {Store} store - The store
   * @param {number | undefined} at - The position
   * @returns {void}
   */
  #land(store, at) {
    if (at !== undefined) {
      store.dispatch({ effects: this.#current.go(at) })
    }
  }

  /**
   * The drag after a transaction: started, moved over, ended, or following its item as the list changes, and gone with
   * its item.
   * @param {Drag | undefined} drag - The drag before
   * @param {Transaction} transaction - The transaction
   * @returns {Drag | undefined} The drag after
   */
  #next(drag, transaction) {
    const { list } = this.#current
    /** @type {Drag | undefined} */
    let now = drag === undefined ? undefined : this.#mapped(drag, transaction)
    for (const effect of transaction.effects) {
      if (effect.is(this.started)) {
        now = { from: effect.value, over: effect.value }
      } else if (effect.is(this.over) && now !== undefined) {
        now = { from: now.from, over: effect.value }
      } else if (effect.is(this.ended)) {
        now = undefined
      }
    }
    const last = list.listOf(transaction.state).count() - 1
    if (now === undefined || last < 0) {
      return undefined
    }
    const kept = { from: now.from, over: Math.min(now.over, last) }
    return drag !== undefined && kept.from === drag.from && kept.over === drag.over ? drag : kept
  }

  /**
   * A drag moved through a transaction's changes to the list: gone if its item went.
   * @param {Drag} drag - The drag
   * @param {Transaction} transaction - The transaction
   * @returns {Drag | undefined} The drag, moved
   */
  #mapped(drag, transaction) {
    const { list } = this.#current
    const from = list.mapPosition(drag.from, transaction)
    return from === undefined ? undefined : { from, over: list.mapPosition(drag.over, transaction) ?? from }
  }

  /**
   * A row's attributes while a drag goes on: the dragged row drawn where it would land, and the rows between moved a
   * row toward where it was, to make room.
   * @param {RenderRow<T>} row - The row
   * @param {State} state - The state
   * @returns {Attributes} The attributes
   */
  #rowAttributes(row, state) {
    const drag = this.dragIn(state)
    if (drag === undefined || row.kind !== 'item') {
      return {}
    }
    const { from, over } = drag
    const at = row.position
    if (at === from) {
      return { part: 'dragging', style: `translate: 0 ${String((over - from) * WHOLE)}%` }
    }
    const shift = from < at && at <= over ? -WHOLE : over <= at && at < from ? WHOLE : 0
    return shift === 0 ? {} : { style: `translate: 0 ${String(shift)}%` }
  }

  /**
   * The keys that reorder: Alt with the up or down arrow moves the active item a row, and Escape puts a dragged item
   * back.
   * @param {Readonly<{ key: string, alt: boolean, shift: boolean, toggle: boolean }>} key - The key
   * @param {Store} store - The store
   * @returns {boolean} Whether it was one of them
   */
  #key({ alt, key, shift, toggle }, store) {
    const { state } = store
    if (key === 'Escape' && this.dragIn(state) !== undefined) {
      this.cancel(store)
      return true
    }
    const by = key === 'ArrowDown' ? 1 : key === 'ArrowUp' ? -1 : 0
    if (!alt || shift || toggle || by === 0) {
      return false
    }
    const at = this.#current.positionIn(state)
    const to = at === undefined ? undefined : at + by
    if (at !== undefined && to !== undefined && to >= 0 && to < this.#current.list.listOf(state).count()) {
      this.move(store, at, to)
    }
    return true
  }

  /**
   * What reordering does in the page: a press on a row that moves far enough becomes a drag, followed as the pointer
   * moves and the list or page scrolls, dropped when the pointer lets go, and put back if it is cancelled. The pointer
   * is captured by the list while it drags, and the click that ends a drag is no press.
   * @returns {Extension} The view plugin
   */
  #page() {
    return viewPlugin((store, root) => {
      /** @type {Pressed | undefined} */
      let pressed = undefined
      let dragging = false
      let swallow = false
      let lastY = 0
      /**
       * Where the dragged item would land, from where the pointer is now.
       * @param {Pressed} from - The press
       * @returns {void}
       */
      const follow = (from) => {
        const moved = contentY(from.list, lastY) - from.y
        if (!dragging) {
          if (Math.abs(moved) < THRESHOLD) {
            return
          }
          dragging = true
          from.list.setPointerCapture(from.pointer)
          this.start(store, from.from)
        }
        this.dragOver(store, from.from + Math.round(moved / from.height))
      }
      /**
       * Lets go of the press, and of the pointer.
       * @returns {void}
       */
      const release = () => {
        if (pressed?.list.hasPointerCapture(pressed.pointer) === true) {
          pressed.list.releasePointerCapture(pressed.pointer)
        }
        pressed = undefined
        dragging = false
      }
      /** @param {Event} event - The event */
      const pointerdown = (event) => {
        swallow = false
        const row = event.target instanceof Element ? event.target.closest('[data-position]') : undefined
        const list = row?.closest('[data-list]')
        const own = row instanceof HTMLElement && list instanceof HTMLElement && inOwnView(root, row)
        if (!(event instanceof PointerEvent) || event.button !== 0 || !own) {
          return
        }
        lastY = event.clientY
        const height = row.getBoundingClientRect().height
        const from = Number(row.dataset['position'])
        pressed = { from, height, list, pointer: event.pointerId, y: contentY(list, event.clientY) }
      }
      /** @param {Event} event - The event */
      const pointermove = (event) => {
        if (event instanceof PointerEvent && pressed?.pointer === event.pointerId) {
          lastY = event.clientY
          follow(pressed)
        }
      }
      /** @param {Event} event - The event */
      const pointerup = (event) => {
        if (!(event instanceof PointerEvent) || pressed?.pointer !== event.pointerId) {
          return
        }
        if (dragging) {
          swallow = true
          this.drop(store)
        }
        release()
      }
      /** @param {Event} event - The event */
      const pointercancel = (event) => {
        if (event instanceof PointerEvent && pressed?.pointer === event.pointerId) {
          this.cancel(store)
          release()
        }
      }
      /** The list or the page scrolling while a row is dragged. */
      const scroll = () => {
        if (pressed !== undefined && dragging) {
          follow(pressed)
        }
      }
      /** @param {Event} event - The click */
      const click = (event) => {
        if (swallow) {
          swallow = false
          event.stopImmediatePropagation()
          event.preventDefault()
        }
      }
      const document = root.ownerDocument
      root.addEventListener('pointerdown', pointerdown)
      root.addEventListener('pointermove', pointermove)
      root.addEventListener('pointerup', pointerup)
      root.addEventListener('pointercancel', pointercancel)
      root.addEventListener('click', click, true)
      root.addEventListener('scroll', scroll, true)
      document.addEventListener('scroll', scroll, true)
      return {
        destroy: () => {
          release()
          root.removeEventListener('pointerdown', pointerdown)
          root.removeEventListener('pointermove', pointermove)
          root.removeEventListener('pointerup', pointerup)
          root.removeEventListener('pointercancel', pointercancel)
          root.removeEventListener('click', click, true)
          root.removeEventListener('scroll', scroll, true)
          document.removeEventListener('scroll', scroll, true)
        },
      }
    })
  }
}

/**
 * Reordering for a list.
 * @template T, R
 * @template {ItemSource<T>} S
 * @param {ActiveItem<T, R, S>} current - The list's active item
 * @param {Readonly<{ move: (move: Move) => void | Promise<void> }>} options - How the app moves an item on its source
 * @returns {Reorder<T, R, S>} The extension
 */
function reorder(current, options) {
  return new Reorder(current, options.move)
}

export { Reorder, reorder }
