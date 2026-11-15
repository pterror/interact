/**
 * A listbox whose options can be reordered, by dragging with a pointer or by Alt+ArrowUp and Alt+ArrowDown on the
 * active option, as in the WAI-ARIA listbox with rearrangeable options
 * (https://www.w3.org/WAI/ARIA/apg/patterns/listbox/examples/listbox-rearrangeable/). It is the list with its step and
 * view wrapped: what it handles first is the drag and the move keys, and everything else is the list's.
 *
 * The order is the host's, so a reorder emits `move` (the dragged key, the key it lands next to, and on which side)
 * and waits for the collection to change (a new `revision`), as a value the widget doesn't own. ARIA has no word for
 * a dragged item or a drop place (`aria-grabbed` and `aria-dropeffect` are deprecated), so they are `data` states, and
 * a move is announced.
 *
 * A drag starts once the pointer has moved `DRAG_PX` from where it was pressed, and lands by which option the pointer
 * is over: after it when that option is later than the dragged one, before it when earlier. No geometry beyond the
 * pointer's travel and the part under it is needed.
 */

import { list, rankOf } from './list.js'

/** @import { Announce, Key, KeyDown, Part, Pointer, Result, View, Widget } from './contract.js' */
/** @import { ListEffect, ListInput, ListProps, ListState } from './list.js' */

/** How far, in CSS pixels, a press must travel to become a drag */
const DRAG_PX = 4

/**
 * @typedef {Readonly<{ mode: 'idle' }>
 *   | Readonly<{ mode: 'pressed', item: Key, pointerId: number, x: number, y: number }>
 *   | Readonly<{ mode: 'dragging', item: Key, pointerId: number, over: Key | null, after: boolean }>} Drag
 */

/**
 * `swallow`: the click a drag ends with is coming, and isn't a choice
 * @typedef {ListState & Readonly<{ drag: Drag, swallow: boolean }>} ReorderState
 */
/** @typedef {ListInput | Pointer} ReorderInput */
/** @typedef {ListEffect | Announce | Readonly<{ type: 'move', item: Key, target: Key, after: boolean }>} ReorderEffect */

/** @type {readonly ReorderEffect[]} */
const NONE = []
/** @type {Drag} */
const IDLE = { mode: 'idle' }

/**
 * Moves an item next to another: the move for the host, the active item following it, and the announcement
 * @param {ReorderState} state - The list
 * @param {Key} item - The item moved
 * @param {Key} target - The item it lands next to
 * @param {boolean} after - Whether it lands after it
 * @returns {Result<ReorderState, ReorderEffect>} The list, and its effects
 */
function moved(state, item, target, after) {
  const rank = rankOf(state, target) ?? 0
  const top = rank < state.top ? rank : rank >= state.top + state.rows ? rank - state.rows + 1 : state.top
  return [
    { ...state, active: item, activeRank: rank, drag: IDLE, follow: 'key', top },
    [
      { after, item, target, type: 'move' },
      {
        message: { count: state.count ?? -1, item, position: rank + 1, what: 'moved' },
        type: 'announce',
        urgent: false,
      },
    ],
  ]
}

/**
 * Alt+ArrowUp or Alt+ArrowDown: the active option moves one place
 * @param {ReorderState} state - The list
 * @param {KeyDown} input - The key
 * @returns {Result<ReorderState, ReorderEffect> | null} The list and its effects, or `null` if the key isn't one
 */
function moveKey(state, input) {
  const by = input.key === 'ArrowDown' ? 1 : input.key === 'ArrowUp' ? -1 : 0
  if (!input.altKey || input.ctrlKey || input.metaKey || by === 0) {
    return null
  }
  const { active, activeRank } = state
  const neighbour = activeRank === null ? undefined : state.keys[activeRank + by - state.from]
  if (active === null || neighbour === undefined) {
    return [state, [{ type: 'preventDefault' }]]
  }
  const [next, effects] = moved(state, active, neighbour, by > 0)
  return [next, [{ type: 'preventDefault' }, ...effects]]
}

/**
 * Pointer events: press, drag over the options, release to drop, cancel
 * @param {ReorderState} state - The list
 * @param {Pointer} input - The event
 * @returns {Result<ReorderState, ReorderEffect>} The list, and its effects
 */
function pointer(state, input) {
  const { drag } = state
  if (input.type === 'pointerdown') {
    return input.button === 0 && input.part === 'option' && input.item !== null
      ? [
          {
            ...state,
            drag: { item: input.item, mode: 'pressed', pointerId: input.pointerId, x: input.clientX, y: input.clientY },
          },
          NONE,
        ]
      : [state, NONE]
  }
  if (drag.mode === 'idle' || drag.pointerId !== input.pointerId) {
    return [state, NONE]
  }
  if (input.type === 'pointercancel') {
    return cancelled(state)
  }
  if (input.type === 'pointerup') {
    if (drag.mode === 'dragging' && drag.over !== null) {
      const [next, effects] = moved(state, drag.item, drag.over, drag.after)
      return [{ ...next, swallow: true }, effects]
    }
    return [{ ...state, drag: IDLE, swallow: drag.mode === 'dragging' }, NONE]
  }
  if (drag.mode === 'pressed') {
    const travelled = Math.hypot(input.clientX - drag.x, input.clientY - drag.y)
    return travelled < DRAG_PX
      ? [state, NONE]
      : [
          {
            ...state,
            drag: { after: false, item: drag.item, mode: 'dragging', over: null, pointerId: drag.pointerId },
          },
          NONE,
        ]
  }
  if (input.part !== 'option' || input.item === null) {
    return [state, NONE]
  }
  const overRank = rankOf(state, input.item)
  const dragRank = rankOf(state, drag.item)
  const over = input.item === drag.item || overRank === null || dragRank === null ? null : input.item
  return [
    { ...state, drag: { ...drag, after: overRank !== null && dragRank !== null && overRank > dragRank, over } },
    NONE,
  ]
}

/**
 * Cancels a drag
 * @param {ReorderState} state - The list
 * @returns {Result<ReorderState, ReorderEffect>} The list, and its effects
 */
function cancelled(state) {
  if (state.drag.mode !== 'dragging') {
    return [{ ...state, drag: IDLE }, NONE]
  }
  return [
    { ...state, drag: IDLE, swallow: true },
    [{ message: { item: state.drag.item, what: 'cancelled' }, type: 'announce', urgent: false }],
  ]
}

/**
 * The step: the drag and the move keys first, then the list's
 * @param {ReorderState} state - The list
 * @param {ReorderInput} input - The input
 * @returns {Result<ReorderState, ReorderEffect>} The list, and its effects
 */
function step(state, input) {
  switch (input.type) {
    case 'pointerdown':
    case 'pointermove':
    case 'pointerup':
    case 'pointercancel': {
      return pointer(state, input)
    }
    case 'keydown': {
      if (input.key === 'Escape' && state.drag.mode === 'dragging') {
        const [next, effects] = cancelled(state)
        return [next, [{ type: 'preventDefault' }, ...effects]]
      }
      const handled = moveKey(state, input)
      if (handled !== null) {
        return handled
      }
      break
    }
    case 'click': {
      if (state.swallow) {
        return [{ ...state, swallow: false }, NONE]
      }
      break
    }
    case 'answer':
    case 'props': {
      break
    }
    default: {
      break
    }
  }
  const [next, effects] = list.step(state, input)
  return [{ ...next, drag: state.drag, swallow: state.swallow }, effects]
}

/**
 * The list's view, with the drag shown and the pointer heard
 * @param {ReorderState} state - The list
 * @param {ListProps} props - Its props
 * @returns {View} Its parts
 */
function view(state, props) {
  const base = list.view(state, props)
  const { drag } = state
  const root = base['root']
  const option = base['option']
  if (root === undefined || typeof root === 'function' || typeof option !== 'function') {
    throw new TypeError("The list's view has a root and an option per key")
  }
  /** @type {Part} */
  const reorderRoot = {
    ...root,
    aria: { ...root.aria, keyshortcuts: 'Alt+ArrowUp Alt+ArrowDown' },
    data: { ...root.data, dragging: drag.mode === 'dragging' },
    listens: [...root.listens, 'pointermove', 'pointerup', 'pointercancel'],
  }
  return {
    ...base,
    option: (key) => {
      const made = option(key)
      const dragging = drag.mode === 'dragging'
      return {
        ...made,
        data: {
          ...made.data,
          dragged: dragging && drag.item === key,
          drop: dragging && drag.over === key ? (drag.after ? 'after' : 'before') : null,
        },
        listens: [...made.listens, 'pointerdown', 'pointermove', 'pointerup', 'pointercancel'],
      }
    },
    root: reorderRoot,
  }
}

/** @type {Widget<ListProps, ReorderState, ReorderInput, ReorderEffect>} */
const reorderList = {
  init: (props) => ({ ...list.init(props), drag: IDLE, swallow: false }),
  step,
  view,
}

export { reorderList }
