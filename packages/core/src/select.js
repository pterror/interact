/**
 * A select: the WAI-ARIA select-only combobox (https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-select-only/),
 * a trigger and a list. Focus stays on the trigger, which names the active option by `aria-activedescendant`; the list
 * is the windowed `list`, given the select's value as its own, so it only reports what was chosen. With `value` in
 * its props the select never changes it, and only emits `change`.
 */

import { compose } from './compose.js'
import { part, ref } from './contract.js'
import { drawnKeys, list } from './list.js'

/** @import { Blur, Change, Click, Key, KeyDown, PreventDefault, PropsInput, Result } from './contract.js' */
/** @import { CompositeSpec, Send, StateWith } from './compose.js' */

/**
 * @typedef {Readonly<{
 *   label: string,
 *   placeholder: string,
 *   rows: number,
 *   revision: number,
 *   value?: Key | null,
 * }>} SelectProps
 */

/**
 * @typedef {Readonly<{
 *   open: boolean,
 *   value: Key | null,
 *   controlled: boolean,
 *   label: string,
 *   placeholder: string,
 *   rows: number,
 *   revision: number,
 * }>} SelectOwn
 */

/** @typedef {StateWith<SelectOwn, Readonly<{ list: typeof list }>>} SelectState */
/** @typedef {KeyDown | Click | Blur | PropsInput<SelectProps>} SelectInput */
/** @typedef {Change<Key | null> | PreventDefault | Send<'list'>} SelectEffect */

/** @type {readonly SelectEffect[]} */
const NONE = []
/** @type {readonly SelectEffect[]} */
const PREVENT = [{ type: 'preventDefault' }]

/**
 * Closes the select, choosing a key
 * @param {SelectState} state - The select
 * @param {Key | null} key - The key, or `null` to close choosing nothing
 * @returns {Result<SelectState, SelectEffect>} The select, and `change` if the value is another
 */
function choose(state, key) {
  const closed = { ...state, open: false }
  if (key === null || key === state.value) {
    return [closed, NONE]
  }
  return [state.controlled ? closed : { ...closed, value: key }, [{ type: 'change', value: key }]]
}

/**
 * Handles a key on the trigger
 * @param {SelectState} state - The select
 * @param {KeyDown} input - The key
 * @returns {Result<SelectState, SelectEffect>} The select, and its effects
 */
function keydown(state, input) {
  const { key } = input
  if (!state.open) {
    if (key === 'ArrowDown' || key === 'ArrowUp' || key === 'Enter' || key === ' ') {
      return [{ ...state, open: true }, PREVENT]
    }
    if (key === 'Home' || key === 'End') {
      return [{ ...state, open: true }, [...PREVENT, { input, to: 'list', type: 'send' }]]
    }
    return [state, NONE]
  }
  if (key === 'Escape') {
    return [{ ...state, open: false }, PREVENT]
  }
  if (key === 'Tab') {
    return choose(state, state.list.active)
  }
  if (key === 'Enter' || key === ' ' || (key === 'ArrowUp' && input.altKey)) {
    const [next, effects] = choose(state, state.list.active)
    return [next, [...PREVENT, ...effects]]
  }
  return [state, [{ input, to: 'list', type: 'send' }]]
}

/**
 * The select's own step: its trigger, and its props
 * @param {SelectState} state - The select
 * @param {SelectInput} input - The input
 * @returns {Result<SelectState, SelectEffect>} The select, and its effects
 */
function step(state, input) {
  switch (input.type) {
    case 'props': {
      const { props } = input
      const controlled = 'value' in props
      return [
        {
          ...state,
          controlled,
          label: props.label,
          placeholder: props.placeholder,
          revision: props.revision,
          rows: props.rows,
          value: controlled ? (props.value ?? null) : state.value,
        },
        NONE,
      ]
    }
    case 'click': {
      return [{ ...state, open: !state.open }, NONE]
    }
    case 'keydown': {
      return keydown(state, input)
    }
    case 'blur': {
      return state.open ? choose(state, state.list.active) : [state, NONE]
    }
    default: {
      return [state, NONE]
    }
  }
}

/** @type {CompositeSpec<SelectProps, SelectOwn, SelectInput, SelectEffect, Readonly<{ list: typeof list }>>} */
const spec = {
  bubble: {
    list: {
      click: (state, input) => (state.open && input.item !== null ? [{ ...state, open: false }, NONE] : [state, NONE]),
    },
  },
  capture: {
    list: {
      mousedown: (state) => [state, PREVENT],
    },
  },
  children: { list },
  init: (props) => ({
    controlled: 'value' in props,
    label: props.label,
    open: false,
    placeholder: props.placeholder,
    revision: props.revision,
    rows: props.rows,
    value: props.value ?? null,
  }),
  on: {
    list: {
      change: (state, effect) => choose(state, effect.value),
    },
  },
  props: {
    list: (state) => ({
      focusable: false,
      label: state.label,
      revision: state.revision,
      rows: state.rows,
      selected: state.value,
      shown: state.open,
    }),
  },
  step,
  view: (state) => {
    const { active } = state.list
    const shownActive = state.open && active !== null && drawnKeys(state.list).includes(active) ? active : null
    return {
      root: part({ content: [{ part: 'trigger' }, { child: 'list' }] }),
      trigger: part({
        aria: {
          activedescendant: shownActive === null ? null : ref(['list', 'option'], shownActive),
          controls: ref(['list', 'root'], null),
          expanded: state.open,
          haspopup: 'listbox',
          label: state.label,
        },
        content: state.value === null ? [{ text: state.placeholder }] : [{ item: state.value }],
        listens: ['click', 'keydown', 'blur'],
        role: 'combobox',
        tabindex: 0,
      }),
    }
  },
}

const select = compose(spec)

export { select }
