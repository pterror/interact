/**
 * A menu button: the WAI-ARIA menu button with a menu (https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/), focus
 * moved to each item in turn. Items are few and the app's, so they come in the props with their text, which typeahead
 * reads. Choosing an item emits `activate`; disabled items are moved to but not chosen.
 */

import { part, ref } from './contract.js'

/** @import { Click, Focus, Key, KeyDown, PreventDefault, PropsInput, Result, Time, View, Wake, Widget } from './contract.js' */

/** @typedef {Readonly<{ key: Key, text: string, disabled: boolean }>} MenuItem */
/** @typedef {Readonly<{ label: string, items: readonly MenuItem[] }>} MenuProps */

/**
 * `prefix` is what typeahead has typed, kept until `until` (ms, on the inputs' clock)
 * @typedef {Readonly<{
 *   label: string,
 *   items: readonly MenuItem[],
 *   open: boolean,
 *   active: Key | null,
 *   prefix: string,
 *   until: number,
 * }>} MenuState
 */

/** @typedef {KeyDown | Click | Time | PropsInput<MenuProps>} MenuInput */
/** @typedef {Focus | PreventDefault | Wake | Readonly<{ type: 'activate', item: Key }>} MenuEffect */

/** How long typeahead keeps what was typed, ms */
const TYPEAHEAD_MS = 500

/** @type {readonly MenuEffect[]} */
const NONE = []
/** @type {MenuEffect} */
const PREVENT = { type: 'preventDefault' }
/** @type {MenuEffect} */
const FOCUS_BUTTON = { item: null, part: ['button'], type: 'focus' }

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
  return [{ ...state, active: key }, [{ item: key, part: ['item'], type: 'focus' }]]
}

/**
 * The item `by` on from the active one, wrapping
 * @param {MenuState} state - The menu
 * @param {number} by - How far
 * @returns {Key | null} The item
 */
function stepped(state, by) {
  const { items } = state
  const index = items.findIndex((item) => item.key === state.active)
  const next = ((((index === -1 && by < 0 ? 0 : index) + by) % items.length) + items.length) % items.length
  return items[next]?.key ?? null
}

/**
 * Opens the menu, an item active
 * @param {MenuState} state - The menu
 * @param {Key | null} key - The item
 * @returns {Result<MenuState, MenuEffect>} The menu, and its effects
 */
function open(state, key) {
  return activate({ ...state, open: true }, key)
}

/**
 * Closes the menu and gives focus back to the button
 * @param {MenuState} state - The menu
 * @param {readonly MenuEffect[]} effects - Effects to come first
 * @returns {Result<MenuState, MenuEffect>} The menu, and its effects
 */
function close(state, effects) {
  return [{ ...state, active: null, open: false, prefix: '' }, [...effects, FOCUS_BUTTON]]
}

/**
 * Chooses an item, unless it is disabled
 * @param {MenuState} state - The menu
 * @param {Key | null} key - The item
 * @returns {Result<MenuState, MenuEffect>} The menu, and its effects
 */
function choose(state, key) {
  const item = state.items.find((one) => one.key === key)
  if (item === undefined || item.disabled) {
    return [state, NONE]
  }
  return close(state, [{ item: item.key, type: 'activate' }])
}

/**
 * Typeahead: moves to the next item whose text starts with what was typed. The same character typed again cycles
 * through the items starting with it
 * @param {MenuState} state - The menu
 * @param {KeyDown} input - The character typed
 * @returns {Result<MenuState, MenuEffect>} The menu, and its effects
 */
function typed(state, input) {
  const typedSoFar = input.timeStamp < state.until ? state.prefix : ''
  const prefix = `${typedSoFar}${input.key.toLowerCase()}`
  const repeated = prefix.split(input.key.toLowerCase()).every((between) => between === '')
  const wanted = repeated ? input.key.toLowerCase() : prefix
  const { items } = state
  const start = items.findIndex((item) => item.key === state.active)
  const order = [...items.slice(start + (repeated ? 1 : 0)), ...items.slice(0, start + (repeated ? 1 : 0))]
  const found = order.find((item) => item.text.toLowerCase().startsWith(wanted))
  const until = input.timeStamp + TYPEAHEAD_MS
  const [next, effects] = activate({ ...state, prefix, until }, found?.key ?? null)
  return [next, [PREVENT, ...effects, { at: until, type: 'wake' }]]
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
 * Whether a UI Events key value is a character typed, not a named key (one code point; a named key is a word)
 * @param {string} key - The key value
 * @returns {boolean} Whether it is a character
 */
function isCharacter(key) {
  return /^.$/u.test(key)
}

/**
 * Handles a key on an item
 * @param {MenuState} state - The menu
 * @param {KeyDown} input - The key
 * @returns {Result<MenuState, MenuEffect>} The menu, and its effects
 */
function itemKey(state, input) {
  const { key } = input
  switch (key) {
    case 'ArrowDown': {
      return handled(activate(state, stepped(state, 1)))
    }
    case 'ArrowUp': {
      return handled(activate(state, stepped(state, -1)))
    }
    case 'Home': {
      return handled(activate(state, state.items[0]?.key ?? null))
    }
    case 'End': {
      return handled(activate(state, state.items.at(-1)?.key ?? null))
    }
    case 'Escape': {
      return close(state, [PREVENT])
    }
    case 'Tab': {
      return [{ ...state, active: null, open: false, prefix: '' }, NONE]
    }
    case 'Enter':
    case ' ': {
      return input.key === ' ' && input.timeStamp < state.until
        ? typed(state, input)
        : handled(choose(state, state.active))
    }
    default: {
      return isCharacter(key) && !input.ctrlKey && !input.metaKey && !input.altKey ? typed(state, input) : [state, NONE]
    }
  }
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
      const { items, label } = input.props
      const active = items.some((item) => item.key === state.active) ? state.active : null
      return [{ ...state, active, items, label }, NONE]
    }
    case 'time': {
      return [input.now >= state.until ? { ...state, prefix: '' } : state, NONE]
    }
    case 'click': {
      if (input.part === 'button') {
        return state.open ? close(state, NONE) : open(state, state.items[0]?.key ?? null)
      }
      return input.part === 'item' ? choose(state, input.item) : [state, NONE]
    }
    case 'keydown': {
      if (input.part === 'item') {
        return itemKey(state, input)
      }
      if (input.part === 'button' && (input.key === 'ArrowDown' || input.key === 'ArrowUp')) {
        const [next, effects] = open(
          state,
          (input.key === 'ArrowDown' ? state.items[0] : state.items.at(-1))?.key ?? null,
        )
        return [next, [PREVENT, ...effects]]
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
    item: (key) => {
      const item = state.items.find((one) => one.key === key)
      return part({
        aria: { disabled: item?.disabled ?? false },
        content: [{ text: item?.text ?? '' }],
        listens: ['click', 'keydown'],
        role: 'menuitem',
        tabindex: -1,
      })
    },
    menu: part({
      aria: { labelledby: ref(['button'], null) },
      content: [{ each: 'item', keys: state.items.map((item) => item.key) }],
      hidden: !state.open,
      role: 'menu',
    }),
    root: part({ content: [{ part: 'button' }, { part: 'menu' }] }),
  }
}

/** @type {Widget<MenuProps, MenuState, MenuInput, MenuEffect>} */
const menu = {
  init: (props) => ({ active: null, items: props.items, label: props.label, open: false, prefix: '', until: 0 }),
  step,
  view,
}

export { menu }
