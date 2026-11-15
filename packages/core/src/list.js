/**
 * A listbox over a collection the host holds (on a server, say): the WAI-ARIA listbox
 * (https://www.w3.org/WAI/ARIA/apg/patterns/listbox/), single selection, selection not following focus. It draws a
 * window of `rows` options and holds one more key each side of it, so every drawn option's neighbours are known. Keys
 * come from the host by `ask` about its `source`; only the answer to the latest ask is used, and `changed` asks again.
 * The window follows the active option, and, once an option's size is `measured`, the list's `scroll` offset.
 *
 * Selection is the value, by the contract's rule: with `selected` in its props (not `null`), a choice shows at once and is pending
 * until the props confirm it or the app refuses it. The list emits `active` whenever the active option it draws
 * changes, so a parent can name it (`aria-activedescendant`) without reading the list's state.
 */

import { part, ref } from './contract.js'
import { change, fromApp, pending, refuse, shown } from './pending.js'

/** @import { Answer, Ask, Change, Changed, Click, Key, KeyDown, Measured, Part, PreventDefault, PropsInput, Refused, Result, Scroll, View, Widget } from './contract.js' */
/** @import { Pending } from './pending.js' */

/**
 * @typedef {Readonly<{
 *   label: string,
 *   rows: number,
 *   source: string,
 *   shown: boolean,
 *   focusable: boolean,
 *   selected: Readonly<{ value: Key | null }> | null,
 * }>} ListProps
 */

/**
 * What the latest ask asked for: a window from a rank, or a window holding a key (whose rank isn't known yet), of the
 * collection as it was at `revision` (how many `changed` the list has heard)
 * @typedef {Readonly<{ top: number, rows: number, revision: number }>
 *   | Readonly<{ locate: Key, rows: number, revision: number }>} Asked
 */

/**
 * `top` is the first rank drawn; `keys` the keys held, from rank `from`. `active` is the active key; `activeRank`
 * its rank, which leads while `follow` is `rank` (a move to a rank not held yet) and follows the key otherwise;
 * `last` is a move to the last option before the count is known. `rowSize` is an option's measured size
 * @typedef {Readonly<{
 *   label: string,
 *   rows: number,
 *   source: string,
 *   shown: boolean,
 *   focusable: boolean,
 *   selection: Pending<Key | null>,
 *   revision: number,
 *   count: number | null,
 *   top: number,
 *   from: number,
 *   keys: readonly Key[],
 *   asked: number,
 *   askedFor: Asked | null,
 *   active: Key | null,
 *   activeRank: number | null,
 *   follow: 'key' | 'rank' | 'last',
 *   rowSize: number | null,
 * }>} ListState
 */

/** @typedef {Readonly<{ type: 'active', item: Key | null }>} Active */
/** @typedef {KeyDown | Click | Scroll | Measured | PropsInput<ListProps> | Answer | Changed | Refused} ListInput */
/** @typedef {Ask | Change<Key | null> | PreventDefault | Active} ListEffect */

/** @type {readonly ListEffect[]} */
const NONE = []

/**
 * The rank of a held key
 * @param {ListState} state - The list
 * @param {Key} key - The key
 * @returns {number | null} Its rank, or `null` if it isn't held
 */
function rankOf(state, key) {
  const index = state.keys.indexOf(key)
  return index === -1 ? null : state.from + index
}

/**
 * The key held at a rank
 * @param {ListState} state - The list
 * @param {number} rank - The rank
 * @returns {Key | null} The key, or `null` if it isn't held
 */
function keyAt(state, rank) {
  return state.keys[rank - state.from] ?? null
}

/**
 * The keys drawn: the held keys whose ranks are in the window
 * @param {ListState} state - The list
 * @returns {readonly Key[]} The keys, in order
 */
function drawnKeys(state) {
  return state.keys.slice(Math.max(0, state.top - state.from), state.top + state.rows - state.from)
}

/**
 * The active key, if the list draws it
 * @param {ListState} state - The list
 * @returns {Key | null} The key
 */
function drawnActive(state) {
  const { active } = state
  return state.shown && active !== null && drawnKeys(state).includes(active) ? active : null
}

/**
 * Asks for what the list needs and doesn't have: the window (with one key either side) for the collection as it is,
 * or, when it is shown with a selected key and nothing active, a window holding that key
 * @param {ListState} state - The list
 * @returns {Result<ListState, ListEffect>} The list, and the ask, if any
 */
function ensure(state) {
  if (!state.shown) {
    return [state, NONE]
  }
  const { askedFor, revision, rows, source, top } = state
  if (
    askedFor !== null &&
    ('locate' in askedFor || askedFor.top === top) &&
    askedFor.revision === revision &&
    askedFor.rows === rows
  ) {
    return [state, NONE]
  }
  const selected = shown(state.selection)
  const id = state.asked + 1
  if (state.count === null && state.active === null && selected !== null) {
    return [
      { ...state, active: selected, asked: id, askedFor: { locate: selected, revision, rows }, follow: 'key' },
      [{ id, locate: selected, rows: rows + 2, source, type: 'ask' }],
    ]
  }
  return [
    { ...state, asked: id, askedFor: { revision, rows, top } },
    [{ id, ranks: [Math.max(0, top - 1), top + rows + 1], source, type: 'ask' }],
  ]
}

/**
 * Takes the answer to the latest ask; drops any other
 * @param {ListState} state - The list
 * @param {Answer} answer - The answer
 * @returns {Result<ListState, ListEffect>} The list, and any ask it needs now
 */
function answered(state, answer) {
  if (answer.id !== state.asked || state.askedFor === null) {
    return [state, NONE]
  }
  const { count, from, keys } = answer
  const located = 'locate' in state.askedFor ? keys.indexOf(state.askedFor.locate) : -1
  const top =
    located === -1
      ? Math.max(0, Math.min(state.top, count - state.rows))
      : Math.max(0, Math.min(from + located - Math.floor(state.rows / 2), count - state.rows))
  /** @type {ListState} */
  const held = {
    ...state,
    askedFor:
      'locate' in state.askedFor ? { revision: state.askedFor.revision, rows: state.rows, top } : state.askedFor,
    count,
    from,
    keys,
    top,
  }
  if (state.follow === 'last') {
    return moveTo({ ...held, follow: 'key' }, count - 1)
  }
  return ensure(withActive(held))
}

/**
 * The active key made to agree with the keys held: a move to a rank takes the key now held there; an active key held
 * takes its rank; an active key no longer held gives way to the key at its rank
 * @param {ListState} state - The list
 * @returns {ListState} The list
 */
function withActive(state) {
  const { active, activeRank } = state
  if (state.follow === 'rank' && activeRank !== null) {
    const key = keyAt(state, activeRank)
    return key === null ? state : { ...state, active: key, follow: 'key' }
  }
  if (active === null) {
    return state
  }
  const rank = rankOf(state, active)
  if (rank !== null) {
    return { ...state, activeRank: rank }
  }
  return { ...state, active: activeRank === null ? null : keyAt(state, activeRank) }
}

/**
 * The window's first rank, moved as little as shows a rank
 * @param {ListState} state - The list
 * @param {number} rank - The rank to show
 * @returns {number} The first rank
 */
function topFor(state, rank) {
  return rank < state.top ? rank : rank >= state.top + state.rows ? rank - state.rows + 1 : state.top
}

/**
 * Makes the option at a rank active, moving the window to show it
 * @param {ListState} state - The list
 * @param {number} wanted - The rank, clamped to the list
 * @returns {Result<ListState, ListEffect>} The list, and any ask it needs
 */
function moveTo(state, wanted) {
  if (state.count === null) {
    return [wanted === 0 ? { ...state, activeRank: 0, follow: 'rank' } : state, NONE]
  }
  if (state.count === 0) {
    return [state, NONE]
  }
  const rank = Math.max(0, Math.min(wanted, state.count - 1))
  const top = topFor(state, rank)
  const key = keyAt(state, rank)
  /** @type {ListState} */
  const moved =
    key === null
      ? { ...state, activeRank: rank, follow: 'rank', top }
      : { ...state, active: key, activeRank: rank, follow: 'key', top }
  return ensure(moved)
}

/**
 * Chooses a key: the list's value
 * @param {ListState} state - The list
 * @param {Key | null} key - The key
 * @returns {Result<ListState, ListEffect>} The list, and `change` if the value is another
 */
function choose(state, key) {
  if (key === shown(state.selection)) {
    return [state, NONE]
  }
  const [selection, id] = change(state.selection, key)
  return [{ ...state, selection }, [{ id, type: 'change', value: key }]]
}

/**
 * The rank a key moves the active option to
 * @param {ListState} state - The list
 * @param {string} key - The UI Events key value
 * @returns {number | null} The rank, or `null` if the key doesn't move it
 */
function rankFor(state, key) {
  const { activeRank, count, rows } = state
  const last = (count ?? 0) - 1
  switch (key) {
    case 'ArrowDown': {
      return activeRank === null ? 0 : activeRank + 1
    }
    case 'ArrowUp': {
      return activeRank === null ? last : activeRank - 1
    }
    case 'Home': {
      return 0
    }
    case 'End': {
      return last
    }
    case 'PageDown': {
      return (activeRank ?? 0) + rows - 1
    }
    case 'PageUp': {
      return (activeRank ?? 0) - rows + 1
    }
    default: {
      return null
    }
  }
}

/**
 * Handles a key: arrows, Home, End and the page keys move; Enter and Space choose the active option
 * @param {ListState} state - The list
 * @param {KeyDown} input - The key
 * @returns {Result<ListState, ListEffect>} The list, and its effects
 */
function keydown(state, input) {
  if (input.altKey || input.ctrlKey || input.metaKey) {
    return [state, NONE]
  }
  /** @type {readonly ListEffect[]} */
  const prevent = [{ type: 'preventDefault' }]
  if (input.key === 'Enter' || input.key === ' ') {
    const [next, effects] = choose(state, state.active)
    return [next, [...prevent, ...effects]]
  }
  if (input.key === 'End' && state.count === null) {
    return [{ ...state, follow: 'last' }, prevent]
  }
  const rank = rankFor(state, input.key)
  if (rank === null) {
    return [state, NONE]
  }
  const [next, effects] = moveTo(state, rank)
  return [next, [...prevent, ...effects]]
}

/**
 * Takes new props
 * @param {ListState} state - The list
 * @param {ListProps} props - The props
 * @returns {Result<ListState, ListEffect>} The list, and any ask it needs
 */
function propsChanged(state, props) {
  const controlled = props.selected !== null
  /** @type {ListState} */
  const next = {
    ...state,
    focusable: props.focusable,
    label: props.label,
    rows: props.rows,
    selection: fromApp(
      state.selection,
      controlled,
      props.selected === null ? state.selection.app : props.selected.value,
    ),
    shown: props.shown,
    source: props.source,
  }
  if (!props.shown) {
    return [{ ...next, active: null, activeRank: null, askedFor: null, count: null, follow: 'key' }, NONE]
  }
  return ensure(next)
}

/**
 * The list's own step, before `active` is told
 * @param {ListState} state - The list
 * @param {ListInput} input - The input
 * @returns {Result<ListState, ListEffect>} The list, and its effects
 */
function stepOwn(state, input) {
  switch (input.type) {
    case 'props': {
      return propsChanged(state, input.props)
    }
    case 'answer': {
      return answered(state, input)
    }
    case 'changed': {
      return ensure({ ...state, revision: state.revision + 1 })
    }
    case 'refused': {
      return [{ ...state, selection: refuse(state.selection, input.id) }, NONE]
    }
    case 'keydown': {
      return keydown(state, input)
    }
    case 'scroll': {
      if (state.rowSize === null || state.count === null) {
        return [state, NONE]
      }
      const top = Math.max(0, Math.min(Math.floor(input.offset / state.rowSize), state.count - state.rows))
      return ensure({ ...state, top })
    }
    case 'measured': {
      return [{ ...state, rowSize: input.size }, NONE]
    }
    case 'click': {
      if (input.part !== 'option' || input.item === null) {
        return [state, NONE]
      }
      const rank = rankOf(state, input.item)
      return choose({ ...state, active: input.item, activeRank: rank, follow: 'key' }, input.item)
    }
    default: {
      return [state, NONE]
    }
  }
}

/**
 * Emits `active` when the active option drawn changed between two states
 * @template {ListState} S
 * @template E
 * @param {S} before - The list before
 * @param {Result<S, E>} result - The step's result
 * @returns {Result<S, E | Active>} The result, `active` added if it changed
 */
function tellActive(before, [after, effects]) {
  const item = drawnActive(after)
  return item === drawnActive(before) ? [after, effects] : [after, [...effects, { item, type: 'active' }]]
}

/**
 * The step
 * @param {ListState} state - The list
 * @param {ListInput} input - The input
 * @returns {Result<ListState, ListEffect>} The list, and its effects
 */
function step(state, input) {
  return tellActive(state, stepOwn(state, input))
}

/**
 * The view
 * @param {ListState} state - The list
 * @returns {View} Its parts
 */
function view(state) {
  const keys = drawnKeys(state)
  const active = drawnActive(state)
  return {
    option: (key) => optionPart(state, key),
    root: part({
      aria: {
        activedescendant: state.focusable && active !== null ? ref(['option'], active) : null,
        label: state.label,
      },
      content: [{ each: 'option', keys }],
      hidden: !state.shown,
      listens: state.focusable ? ['keydown', 'scroll'] : ['scroll'],
      role: 'listbox',
      tabindex: state.focusable ? 0 : null,
    }),
  }
}

/**
 * An option
 * @param {ListState} state - The list
 * @param {Key} key - Its key
 * @returns {Part} The part
 */
function optionPart(state, key) {
  const rank = rankOf(state, key)
  return part({
    aria: {
      posinset: rank === null ? null : rank + 1,
      selected: key === shown(state.selection),
      setsize: state.count ?? -1,
    },
    content: [{ item: key }],
    data: { active: key === state.active },
    listens: ['click', 'measured'],
    role: 'option',
  })
}

/** @type {Widget<ListProps, ListState, ListInput, ListEffect>} */
const list = {
  init: (props) =>
    ensure({
      active: null,
      activeRank: null,
      asked: 0,
      askedFor: null,
      count: null,
      focusable: props.focusable,
      follow: 'key',
      from: 0,
      keys: [],
      label: props.label,
      revision: 0,
      rowSize: null,
      rows: props.rows,
      selection: pending(props.selected !== null, props.selected === null ? null : props.selected.value),
      shown: props.shown,
      source: props.source,
      top: 0,
    }),
  step,
  view,
}

export { drawnKeys, list, rankOf, tellActive, topFor, withActive }
