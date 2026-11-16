/**
 * A select: the WAI-ARIA select-only combobox (https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-select-only/),
 * a trigger and a list. Focus stays on the trigger, which names the active option by `aria-activedescendant`, known
 * from the list's `active` effects; the list is the windowed `list`, given the select's value as its own, so it only
 * reports what was chosen. The value follows the contract's rule: with `value` in its props, a choice shows at once
 * and is pending until the props confirm it or the app refuses it. A character typed opens it and is the list's
 * typeahead; Space is typed too while a prefix is being typed (`until`).
 */

import { compose } from './compose.js'
import { part, ref } from './contract.js'
import { list } from './list.js'
import { change, fromApp, pending, refuse, shown } from './pending.js'
import { isTyped, TYPEAHEAD_MS, typing } from './typeahead.js'

/** @import { Blur, Change, Click, i32, Key, KeyDown, PreventDefault, PropsInput, Refused, Result } from './contract.js' */
/** @import { Send, StopPropagation } from './compose.js' */
/** @import { Pending } from './pending.js' */

/**
 * @typedef {Readonly<{
 *   label: string,
 *   placeholder: string,
 *   rows: i32,
 *   source: string,
 *   value: Readonly<{ value: Key | null }> | null,
 * }>} SelectProps
 */

/**
 * @typedef {Readonly<{
 *   open: boolean,
 *   value: Pending<Key | null>,
 *   active: Key | null,
 *   label: string,
 *   placeholder: string,
 *   rows: i32,
 *   source: string,
 *   until: number,
 * }>} SelectOwn
 */

/** @typedef {KeyDown | Click | Blur | PropsInput<SelectProps> | Refused} SelectInput */
/** @typedef {Change<Key | null> | PreventDefault | Send<'list'> | StopPropagation} SelectEffect */

/** @type {readonly SelectEffect[]} */
const NONE = []
/** @type {readonly SelectEffect[]} */
const PREVENT = [{ type: 'preventDefault' }]
/** @type {readonly SelectEffect[]} */
const STOP = [{ type: 'stopPropagation' }]

/**
 * Closes the select, choosing a key
 * @param {SelectOwn} own - The select
 * @param {Key | null} key - The key, or `null` to close choosing nothing
 * @returns {Result<SelectOwn, SelectEffect>} The select, and `change` if the value is another
 */
function choose(own, key) {
  const closed = { ...own, open: false }
  if (key === null || key === shown(own.value)) {
    return [closed, NONE]
  }
  const [value, id] = change(own.value, key)
  return [{ ...closed, value }, [{ id, type: 'change', value: key }]]
}

/**
 * Handles a key on the trigger
 * @param {SelectOwn} own - The select
 * @param {KeyDown} input - The key
 * @returns {Result<SelectOwn, SelectEffect>} The select, and its effects
 */
function keydown(own, input) {
  const { key } = input
  if (isTyped(input) && (key !== ' ' || (own.open && typing(own.until, input.timeStamp)))) {
    return [{ ...own, open: true, until: input.timeStamp + TYPEAHEAD_MS }, [{ input, to: 'list', type: 'send' }]]
  }
  if (!own.open) {
    if (key === 'ArrowDown' || key === 'ArrowUp' || key === 'Enter' || key === ' ') {
      return [{ ...own, open: true }, PREVENT]
    }
    if (key === 'Home' || key === 'End') {
      return [{ ...own, open: true }, [...PREVENT, { input, to: 'list', type: 'send' }]]
    }
    return [own, NONE]
  }
  if (key === 'Escape') {
    return [{ ...own, open: false }, PREVENT]
  }
  if (key === 'Tab') {
    return choose(own, own.active)
  }
  if (key === 'Enter' || key === ' ' || (key === 'ArrowUp' && input.altKey)) {
    const [next, effects] = choose(own, own.active)
    return [next, [...PREVENT, ...effects]]
  }
  return [own, [{ input, to: 'list', type: 'send' }]]
}

/**
 * The select's own step: its trigger, its props, a refusal
 * @param {SelectOwn} own - The select
 * @param {SelectInput} input - The input
 * @returns {Result<SelectOwn, SelectEffect>} The select, and its effects
 */
function step(own, input) {
  switch (input.type) {
    case 'props': {
      const { props } = input
      const controlled = props.value !== null
      return [
        {
          ...own,
          label: props.label,
          placeholder: props.placeholder,
          rows: props.rows,
          source: props.source,
          value: fromApp(own.value, controlled, props.value === null ? own.value.app : props.value.value),
        },
        NONE,
      ]
    }
    case 'refused': {
      return [{ ...own, value: refuse(own.value, input.id) }, NONE]
    }
    case 'click': {
      return [{ ...own, open: !own.open }, NONE]
    }
    case 'keydown': {
      return keydown(own, input)
    }
    case 'blur': {
      return own.open ? choose(own, own.active) : [own, NONE]
    }
    default: {
      return [own, NONE]
    }
  }
}

/**
 * The select's first own state
 * @param {SelectProps} props - Its props
 * @returns {Result<SelectOwn, SelectEffect>} The state, and nothing to do yet
 */
function init(props) {
  return [
    {
      active: null,
      label: props.label,
      open: false,
      placeholder: props.placeholder,
      rows: props.rows,
      source: props.source,
      until: 0,
      value: pending(props.value !== null, props.value === null ? null : props.value.value),
    },
    NONE,
  ]
}

const select = compose({
  bubble: {
    list: {
      click: (own, input) => (own.open && input.item !== null ? [{ ...own, open: false }, NONE] : [own, NONE]),
    },
  },
  capture: {
    list: {
      mousedown: (own) => [own, PREVENT],
    },
  },
  children: { list },
  init,
  on: {
    list: {
      active: (own, effect) => [{ ...own, active: effect.item }, STOP],
      change: (own, effect) => {
        const [next, effects] = choose(own, effect.value)
        return [next, [...effects, ...STOP]]
      },
    },
  },
  props: {
    list: (own) => ({
      focusable: false,
      label: own.label,
      rows: own.rows,
      selected: { value: shown(own.value) },
      shown: own.open,
      source: own.source,
    }),
  },
  step,
  view: (own) => {
    const value = shown(own.value)
    return {
      root: part({ content: [{ part: 'trigger' }, { child: 'list' }] }),
      trigger: part({
        aria: {
          activedescendant: own.active === null ? null : ref(['list', 'option'], own.active),
          controls: ref(['list', 'root'], null),
          expanded: own.open,
          haspopup: 'listbox',
          label: own.label,
        },
        content: value === null ? [{ text: own.placeholder }] : [{ item: value, source: own.source }],
        listens: ['click', 'keydown', 'blur'],
        role: 'combobox',
        tabindex: 0,
      }),
    }
  },
})

export { select }
