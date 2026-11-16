/**
 * A menu button: the WAI-ARIA menu button with a menu (https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/), the
 * menu a popup against the button, focus moved to each item in turn. Items are the keys of a collection the host holds (`source`), asked for whole, since a
 * menu draws every item: a first page, then the rest once the count is known; only the answer to the latest ask is
 * used, and `changed` asks again. The host draws each item. Characters typed are typeahead, which the host finds
 * (`ask` with `find`). Choosing an item emits `activate`; disabled items are moved to but not chosen.
 */

import { part, ref } from './contract.js'
import { isTyped, typed, typing } from './typeahead.js'

/** @import { Answer, Ask, Changed, Click, Focus, Found, i32, i53, Key, KeyDown, PreventDefault, PropsInput, Result, SourceName, Time, View, Wake, Widget } from './contract.js' */

/** @typedef {Readonly<{ label: string, source: SourceName, disabled: readonly Key[] }>} MenuProps */

/**
 * `keys` are the items, from the first; `count` how many there are, once answered; `asked` the latest ask's id.
 * `opening` is the item to make active once the items come, when the menu opened before they did. `prefix` is what
 * typeahead has typed, kept until `until` (ms, on the inputs' clock); `sought` is the latest find's id
 * @typedef {Readonly<{
 *   label: string,
 *   source: string,
 *   disabled: readonly Key[],
 *   keys: readonly Key[],
 *   count: i32 | null,
 *   asked: i53,
 *   open: boolean,
 *   opening: 'first' | 'last' | null,
 *   active: Key | null,
 *   prefix: string,
 *   until: number,
 *   sought: i53,
 * }>} MenuState
 */

/** @typedef {KeyDown | Click | Time | PropsInput<MenuProps> | Answer | Found | Changed} MenuInput */
/** @typedef {Ask | Focus | PreventDefault | Wake | Readonly<{ type: 'activate', item: Key }>} MenuEffect */

/** How many items the first ask asks for **(P)** */
const FIRST_PAGE = 64

/** @type {readonly MenuEffect[]} */
const NONE = []
/** @type {MenuEffect} */
const PREVENT = { type: 'preventDefault' }
/** @type {MenuEffect} */
const FOCUS_BUTTON = { item: null, part: ['button'], type: 'focus' }

/**
 * Asks for the items, from the first, as many as there are or the first page
 * @param {MenuState} state - The menu
 * @param {i32} count - How many to ask for
 * @returns {Result<MenuState, MenuEffect>} The menu, and the ask
 */
function ask(state, count) {
  const id = state.asked + 1
  return [{ ...state, asked: id }, [{ id, ranks: [0, count], source: state.source, type: 'ask' }]]
}

/**
 * Makes an item active and focuses it
 * @param {MenuState} state - The menu
 * @param {Key | null} key - The item
 * @returns {Result<MenuState, MenuEffect>} The menu, and its effects
 */
function activate(state, key) {
  if (key === null) {
    return [state, NONE]
  }
  return [{ ...state, active: key, opening: null }, [{ item: key, part: ['item'], type: 'focus' }]]
}

/**
 * The item `by` on from the active one, wrapping
 * @param {MenuState} state - The menu
 * @param {number} by - How far
 * @returns {Key | null} The item
 */
function stepped(state, by) {
  const { keys } = state
  const index = state.active === null ? -1 : keys.indexOf(state.active)
  const next = ((((index === -1 && by < 0 ? 0 : index) + by) % keys.length) + keys.length) % keys.length
  return keys[next] ?? null
}

/**
 * The first or last item
 * @param {MenuState} state - The menu
 * @param {'first' | 'last'} end - Which
 * @returns {Key | null} The item, or `null` while there are none
 */
function endOf(state, end) {
  return (end === 'first' ? state.keys[0] : state.keys.at(-1)) ?? null
}

/**
 * Opens the menu, the first or last item active, or once the items come
 * @param {MenuState} state - The menu
 * @param {'first' | 'last'} end - Which item
 * @returns {Result<MenuState, MenuEffect>} The menu, and its effects
 */
function open(state, end) {
  const key = endOf(state, end)
  return key === null ? [{ ...state, open: true, opening: end }, NONE] : activate({ ...state, open: true }, key)
}

/**
 * Closes the menu and gives focus back to the button
 * @param {MenuState} state - The menu
 * @param {readonly MenuEffect[]} effects - Effects to come first
 * @returns {Result<MenuState, MenuEffect>} The menu, and its effects
 */
function close(state, effects) {
  return [{ ...state, active: null, open: false, opening: null, prefix: '' }, [...effects, FOCUS_BUTTON]]
}

/**
 * Chooses an item, unless it is disabled
 * @param {MenuState} state - The menu
 * @param {Key | null} key - The item
 * @returns {Result<MenuState, MenuEffect>} The menu, and its effects
 */
function choose(state, key) {
  if (key === null || !state.keys.includes(key) || state.disabled.includes(key)) {
    return [state, NONE]
  }
  return close(state, [{ item: key, type: 'activate' }])
}

/**
 * A character typed: asks the host for the item it and those before it start
 * @param {MenuState} state - The menu
 * @param {KeyDown} input - The character
 * @returns {Result<MenuState, MenuEffect>} The menu, and its effects
 */
function type(state, input) {
  const made = typed(state.prefix, state.until, input)
  const id = state.sought + 1
  return [
    { ...state, prefix: made.prefix, sought: id, until: made.until },
    [
      PREVENT,
      { at: state.active, find: made.find, id, next: made.next, source: state.source, type: 'ask' },
      { at: made.until, type: 'wake' },
    ],
  ]
}

/**
 * A step's result, the key's default prevented first
 * @param {Result<MenuState, MenuEffect>} result - The result
 * @returns {Result<MenuState, MenuEffect>} The same, preventing the default
 */
function handled([state, effects]) {
  return [state, [PREVENT, ...effects]]
}

/**
 * Handles a key on an item
 * @param {MenuState} state - The menu
 * @param {KeyDown} input - The key
 * @returns {Result<MenuState, MenuEffect>} The menu, and its effects
 */
function itemKey(state, input) {
  const { key } = input
  if (isTyped(input) && (key !== ' ' || typing(state.until, input.timeStamp))) {
    return type(state, input)
  }
  switch (key) {
    case 'ArrowDown': {
      return handled(activate(state, stepped(state, 1)))
    }
    case 'ArrowUp': {
      return handled(activate(state, stepped(state, -1)))
    }
    case 'Home': {
      return handled(activate(state, endOf(state, 'first')))
    }
    case 'End': {
      return handled(activate(state, endOf(state, 'last')))
    }
    case 'Escape': {
      return close(state, [PREVENT])
    }
    case 'Tab': {
      return [{ ...state, active: null, open: false, opening: null, prefix: '' }, NONE]
    }
    case 'Enter':
    case ' ': {
      return handled(choose(state, state.active))
    }
    default: {
      return [state, NONE]
    }
  }
}

/**
 * Takes the answer to the latest ask: the items, asking for the rest if there are more
 * @param {MenuState} state - The menu
 * @param {Answer} answer - The answer
 * @returns {Result<MenuState, MenuEffect>} The menu, and its effects
 */
function answered(state, answer) {
  if (answer.id !== state.asked) {
    return [state, NONE]
  }
  const { count, keys } = answer
  const active = state.active !== null && keys.includes(state.active) ? state.active : null
  const held = { ...state, active, count, keys }
  if (answer.from === 0 && count > keys.length) {
    return ask(held, count)
  }
  if (held.open && held.opening !== null) {
    return activate(held, endOf(held, held.opening))
  }
  return held.open && active === null && state.active !== null ? activate(held, endOf(held, 'first')) : [held, NONE]
}

/**
 * The step
 * @param {MenuState} state - The menu
 * @param {MenuInput} input - The input
 * @returns {Result<MenuState, MenuEffect>} The menu, and its effects
 */
function step(state, input) {
  switch (input.type) {
    case 'props': {
      const { disabled, label, source } = input.props
      const next = { ...state, disabled, label, source }
      return source === state.source ? [next, NONE] : ask({ ...next, count: null, keys: [] }, FIRST_PAGE)
    }
    case 'answer': {
      return answered(state, input)
    }
    case 'changed': {
      return ask(state, Math.max(state.count ?? 0, FIRST_PAGE))
    }
    case 'found': {
      return input.id === state.sought && input.key !== null && state.open && state.keys.includes(input.key)
        ? activate(state, input.key)
        : [state, NONE]
    }
    case 'time': {
      return [typing(state.until, input.now) ? state : { ...state, prefix: '' }, NONE]
    }
    case 'click': {
      if (input.part === 'button') {
        return state.open ? close(state, NONE) : open(state, 'first')
      }
      return input.part === 'item' ? choose(state, input.item) : [state, NONE]
    }
    case 'keydown': {
      if (input.part === 'item') {
        return itemKey(state, input)
      }
      if (input.part === 'button' && (input.key === 'ArrowDown' || input.key === 'ArrowUp')) {
        return handled(open(state, input.key === 'ArrowDown' ? 'first' : 'last'))
      }
      return [state, NONE]
    }
    default: {
      return [state, NONE]
    }
  }
}

/**
 * The view
 * @param {MenuState} state - The menu
 * @returns {View} Its parts
 */
function view(state) {
  return {
    button: part({
      aria: { controls: ref(['menu'], null), expanded: state.open, haspopup: 'menu' },
      content: [{ text: state.label }],
      listens: ['click', 'keydown'],
      role: 'button',
      tabindex: 0,
    }),
    item: (key) =>
      part({
        aria: { disabled: state.disabled.includes(key) },
        content: [{ item: key, source: state.source }],
        listens: ['click', 'keydown'],
        role: 'menuitem',
        tabindex: -1,
      }),
    menu: part({
      aria: { labelledby: ref(['button'], null) },
      content: [{ each: 'item', keys: state.keys }],
      hidden: !state.open,
      popup: { anchor: ref(['button'], null) },
      role: 'menu',
    }),
    root: part({ content: [{ part: 'button' }, { part: 'menu' }] }),
  }
}

/** @type {Widget<MenuProps, MenuState, MenuInput, MenuEffect>} */
const menu = {
  init: (props) =>
    ask(
      {
        active: null,
        asked: 0,
        count: null,
        disabled: props.disabled,
        keys: [],
        label: props.label,
        open: false,
        opening: null,
        prefix: '',
        sought: 0,
        source: props.source,
        until: 0,
      },
      FIRST_PAGE,
    ),
  step,
  view,
}

export { menu, view as menuView }
