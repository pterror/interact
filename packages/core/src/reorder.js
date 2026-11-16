/**
 * A listbox whose options can be reordered, by dragging with a pointer or by Alt+ArrowUp and Alt+ArrowDown on the
 * active option, as in the WAI-ARIA listbox with rearrangeable options
 * (https://www.w3.org/WAI/ARIA/apg/patterns/listbox/examples/listbox-rearrangeable/). It is the list with its step and
 * view wrapped: what it handles first is the drag and the move keys, and everything else is the list's.
 *
 * The order is the collection's, by the contract's rule: a move shows at once, is emitted as `move` with an id, and
 * stays pending, applied over the keys the host answers with, until the host has it (`confirmed`, then the next
 * answer holds it) or refuses it (`refused`, which undoes it). Every move is made against the order shown, pending
 * moves included. ARIA has no word for a dragged item or a drop place (`aria-grabbed` and `aria-dropeffect` are
 * deprecated), so they are `data` states, and a move is announced.
 *
 * A drag starts once the pointer has moved `dragDistance` (in the target's units) from where it was pressed, and
 * lands by which option the pointer is over: after it when that option is later than the dragged one, before it when
 * earlier.
 */

import { list, rankOf, tellActive, topFor, withActive } from './list.js'

/** @import { Announce, Confirmed, i53, Key, KeyDown, Part, Pointer, PropsInput, Result, View, Widget } from './contract.js' */
/** @import { ListEffect, ListInput, ListProps, ListState } from './list.js' */

/**
 * The list's props, the keys that move an option (shown as `aria-keyshortcuts`, so they follow the host's bindings),
 * and how far a press travels to become a drag
 * @typedef {ListProps & Readonly<{ keyshortcuts: string, dragDistance: number }>} ReorderProps
 */

/**
 * @typedef {Readonly<{ mode: 'idle' }>
 *   | Readonly<{ mode: 'pressed', item: Key, pointerId: number, x: number, y: number }>
 *   | Readonly<{ mode: 'dragging', item: Key, pointerId: number, over: Key | null, after: boolean }>} Drag
 */

/**
 * A move not yet in the keys the host answers with. `through` is the first ask whose answer holds it, once the host
 * confirmed it
 * @typedef {Readonly<{ id: i53, item: Key, target: Key, after: boolean, confirmed: boolean, through: i53 | null }>} Move
 */

/**
 * `base` is the keys as the host answered them, `keys` (the list's) those with `moves` applied. `swallow`: the click
 * a drag ends with is coming, and isn't a choice
 * @typedef {ListState & Readonly<{
 *   drag: Drag,
 *   swallow: boolean,
 *   base: readonly Key[],
 *   moves: readonly Move[],
 *   keyshortcuts: string,
 *   dragDistance: number,
 * }>} ReorderState
 */

/** @typedef {Exclude<ListInput, PropsInput<ListProps>> | PropsInput<ReorderProps> | Pointer | Confirmed} ReorderInput */
/**
 * @typedef {ListEffect | Announce
 *   | Readonly<{ type: 'move', id: i53, source: string, item: Key, target: Key, after: boolean }>} ReorderEffect
 */

/** @type {readonly ReorderEffect[]} */
const NONE = []
/** @type {Drag} */
const IDLE = { mode: 'idle' }

/**
 * Keys with one move applied: the item taken out, and put next to its target if the target is among them
 * @param {readonly Key[]} keys - The keys
 * @param {Move} move - The move
 * @returns {readonly Key[]} The keys after
 */
function applied(keys, move) {
  const without = keys.filter((key) => key !== move.item)
  const at = without.indexOf(move.target)
  if (at === -1) {
    return without
  }
  const place = move.after ? at + 1 : at
  return [...without.slice(0, place), move.item, ...without.slice(place)]
}

/**
 * The list with its keys made again from the host's and the moves pending
 * @param {ReorderState} state - The list
 * @returns {ReorderState} The list
 */
function derived(state) {
  const keys = state.moves.reduce(applied, state.base)
  const next = withActive({ ...state, keys })
  return { ...state, ...next, base: state.base, moves: state.moves }
}

/**
 * Moves an item next to another: pending, shown at once, the active item following it, emitted and announced
 * @param {ReorderState} state - The list
 * @param {Key} item - The item moved
 * @param {Key} target - The item it lands next to
 * @param {boolean} after - Whether it lands after it
 * @returns {Result<ReorderState, ReorderEffect>} The list, and its effects
 */
function moved(state, item, target, after) {
  const id = state.selection.next
  /** @type {Move} */
  const move = { after, confirmed: false, id, item, target, through: null }
  const next = derived({
    ...state,
    active: item,
    drag: IDLE,
    follow: 'key',
    moves: [...state.moves, move],
    selection: { ...state.selection, next: id + 1 },
  })
  const rank = rankOf(next, item) ?? 0
  return [
    { ...next, activeRank: rank, top: topFor(next, rank) },
    [
      { after, id, item, source: state.source, target, type: 'move' },
      {
        message: 'moved',
        type: 'announce',
        urgent: false,
        values: { count: state.count ?? -1, item, position: rank + 1 },
      },
    ],
  ]
}

/**
 * Alt+ArrowUp or Alt+ArrowDown: the active option moves one place, in the order shown
 * @param {ReorderState} state - The list
 * @param {KeyDown} input - The key
 * @returns {Result<ReorderState, ReorderEffect> | null} The list and its effects, or `null` if the key isn't one
 */
function moveKey(state, input) {
  const by = input.key === 'ArrowDown' ? 1 : input.key === 'ArrowUp' ? -1 : 0
  if (!input.altKey || input.ctrlKey || input.metaKey || by === 0) {
    return null
  }
  const { active } = state
  const rank = active === null ? null : rankOf(state, active)
  const neighbour = rank === null ? null : (state.keys[rank + by - state.from] ?? null)
  if (active === null || neighbour === null) {
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
    if (input.button !== 0 || input.part !== 'option' || input.item === null) {
      return [state, NONE]
    }
    const pressed = {
      item: input.item,
      mode: 'pressed',
      pointerId: input.pointerId,
      x: input.clientX,
      y: input.clientY,
    }
    return [{ ...state, drag: { ...pressed, mode: 'pressed' } }, NONE]
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
    const dx = input.clientX - drag.x
    const dy = input.clientY - drag.y
    const dragging = { after: false, item: drag.item, mode: 'dragging', over: null, pointerId: drag.pointerId }
    return dx * dx + dy * dy < state.dragDistance * state.dragDistance
      ? [state, NONE]
      : [{ ...state, drag: { ...dragging, mode: 'dragging' } }, NONE]
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
    [{ message: 'cancelled', type: 'announce', urgent: false, values: { item: state.drag.item } }],
  ]
}

/**
 * Hands an input to the list, keeping the reorder's own fields, and keeps the pending moves over what the host
 * answers: a move the host confirmed goes once an ask made after the confirmation is answered
 * @param {ReorderState} state - The list
 * @param {ListInput} input - The input
 * @returns {Result<ReorderState, ReorderEffect>} The list, and its effects
 */
function toList(state, input) {
  const [next, effects] = list.step(state, input)
  const asked = next.asked > state.asked
  const moves = state.moves.map((move) =>
    asked && move.confirmed && move.through === null ? { ...move, through: next.asked } : move,
  )
  const own = {
    base: state.base,
    drag: state.drag,
    dragDistance: state.dragDistance,
    keyshortcuts: state.keyshortcuts,
    moves,
    swallow: state.swallow,
  }
  if (input.type === 'answer' && input.id === state.asked) {
    const kept = moves.filter((move) => move.through === null || move.through > input.id)
    return [derived({ ...next, ...own, base: next.keys, moves: kept }), effects]
  }
  return [{ ...next, ...own }, effects]
}

/**
 * The step before `active` is told: the drag, the move keys and the host's word on moves first, then the list's
 * @param {ReorderState} state - The list
 * @param {ReorderInput} input - The input
 * @returns {Result<ReorderState, ReorderEffect>} The list, and its effects
 */
function stepOwn(state, input) {
  switch (input.type) {
    case 'pointerdown':
    case 'pointermove':
    case 'pointerup':
    case 'pointercancel': {
      return pointer(state, input)
    }
    case 'confirmed': {
      return [
        { ...state, moves: state.moves.map((move) => (move.id === input.id ? { ...move, confirmed: true } : move)) },
        NONE,
      ]
    }
    case 'refused': {
      const undone = state.moves.find((move) => move.id === input.id)
      if (undone === undefined) {
        return toList(state, input)
      }
      return [
        derived({ ...state, moves: state.moves.filter((move) => move.id !== undone.id) }),
        [{ message: 'refused', type: 'announce', urgent: false, values: { item: undone.item } }],
      ]
    }
    case 'props': {
      const { dragDistance, keyshortcuts } = input.props
      return toList({ ...state, dragDistance, keyshortcuts }, input)
    }
    case 'keydown': {
      if (input.key === 'Escape' && state.drag.mode === 'dragging') {
        const [next, effects] = cancelled(state)
        return [next, [{ type: 'preventDefault' }, ...effects]]
      }
      return moveKey(state, input) ?? toList(state, input)
    }
    case 'click': {
      return state.swallow ? [{ ...state, swallow: false }, NONE] : toList(state, input)
    }
    case 'answer':
    case 'changed':
    case 'focus':
    case 'found':
    case 'measured':
    case 'scroll':
    case 'time': {
      return toList(state, input)
    }
    default: {
      return toList(state, input)
    }
  }
}

/**
 * The step
 * @param {ReorderState} state - The list
 * @param {ReorderInput} input - The input
 * @returns {Result<ReorderState, ReorderEffect>} The list, and its effects
 */
function step(state, input) {
  const result = stepOwn(state, input)
  return result[1].some((effect) => effect.type === 'active') ? result : tellActive(state, result)
}

/**
 * The list's view, with the drag shown and the pointer heard
 * @param {ReorderState} state - The list
 * @param {ReorderProps} props - Its props
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
    aria: { ...root.aria, keyshortcuts: state.keyshortcuts },
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

/** @type {Widget<ReorderProps, ReorderState, ReorderInput, ReorderEffect>} */
const reorderList = {
  init: (props) => {
    const [state, effects] = list.init(props)
    return [
      {
        ...state,
        base: [],
        drag: IDLE,
        dragDistance: props.dragDistance,
        keyshortcuts: props.keyshortcuts,
        moves: [],
        swallow: false,
      },
      effects,
    ]
  },
  step,
  view,
}

export { reorderList }
