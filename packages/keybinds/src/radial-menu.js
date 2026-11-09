/**
 * A ready-made radial menu, wired from small pieces: up to eight items evenly around a point, so each direction
 * becomes muscle memory. While open it is a manual popover (`role=menu`) centred on the point, that has focus, so by
 * the overlay rule the page's bindings don't fire; its own keys are bound on it: arrows point at a slot (or the filled
 * one nearest), Tab and Shift+Tab go round, Enter and Space run the active item. Resting the pointer on an item makes
 * it active, a click runs it, Escape or a press outside closes the menu, and focus goes back where it was. An item
 * whose `when` doesn't hold is `aria-disabled` and doesn't run; the active item is `data-active`. Unstyled, in the
 * light DOM: the only inline style is geometry, the popover's place, the element's size (the box that holds the
 * slots) and each slot's place in it from radialPlace(). An app that wants one piece otherwise wires the rest itself:
 * radialPlace(), radialStep(), focusReturn(), with list's render, place, mark, ids, activeDescendant, move, pick,
 * hoverIntent, popover, focusWhen and dismiss.
 */

import {
  activeDescendant,
  cell,
  dismiss,
  flowMount,
  focusWhen,
  hoverIntent,
  ids,
  mark,
  move,
  pick,
  place,
  popover,
  render,
} from '@pterror/interact-list'

import { focusReturn } from './focus-return.js'
import { keybinds } from './keybinds.js'
import { radialPlace } from './radial-place.js'
import { radialStep } from './radial-step.js'

/**
 * An item: what it is called, what it does, and when it applies
 * @typedef {Readonly<{ label: string, run: () => void, when?: () => boolean }>} Item
 */

/** @typedef {Readonly<{ x: number, y: number }>} Point */

/**
 * @typedef {Readonly<{
 *   element: HTMLElement,
 *   items: () => readonly Item[],
 *   radius?: number,
 *   size?: number,
 *   rest?: number,
 * }>} RadialMenuOptions
 */

const SLOTS = 8

/** @type {readonly Item[]} */
const NONE = []

/**
 * The slot each arrow points at
 * @type {readonly (readonly [string, number])[]}
 */
const ARROWS = [
  ['ArrowUp', 0],
  ['ArrowRight', 2],
  ['ArrowDown', 4],
  ['ArrowLeft', 6],
]

/** @type {Item | undefined} */
const NO_ITEM = undefined

let made = 0

/**
 * Whether an item applies now
 * @param {Item} item - The item
 * @returns {boolean} Whether its `when` holds, or it has none
 */
function applies(item) {
  return item.when?.() ?? true
}

/**
 * Builds a radial menu in an element
 * @param {RadialMenuOptions} options - Its element; its items (the first eight are shown, read each time it opens);
 *   the circle's radius and each slot's size, as for radialPlace(); and how long the pointer rests on an item to make
 *   it active, as for hoverIntent()
 * @returns {Readonly<{ openAt: (point?: Point) => void, close: () => void,
 *   open: Readonly<{ get: () => boolean, watch: (listener: () => void) => () => void }>, stop: () => void }>}
 *   Opening it around a point (default the viewport's centre), afresh if it is open; closing it; whether it is open; and stopping
 */
function radialMenu({ element, items, radius, rest, size }) {
  made += 1
  const prefix = `keybinds-radial-${String(made)}`
  const open = cell(false)
  /** @type {Point | undefined} */
  let point = undefined
  const layout = radialPlace({
    ...(radius === undefined ? {} : { radius }),
    ...(size === undefined ? {} : { size }),
  })
  const active = cell(NO_ITEM)
  /** @type {readonly Item[] | undefined} */
  let shown = undefined
  const keys = () => {
    if (!open.get()) {
      shown = undefined
      return NONE
    }
    shown ??= items().slice(0, SLOTS)
    return shown
  }
  /** @type {(item: Item) => number | undefined} */
  const rankOf = (item) => {
    const at = keys().indexOf(item)
    return at === -1 ? undefined : at
  }
  /** @type {(item: Item) => string} */
  const idOf = (item) => `${prefix}-${String(rankOf(item))}`
  const rendered = render({
    create(item) {
      const slot = document.createElement('div')
      slot.setAttribute('role', 'menuitem')
      slot.textContent = item.label
      return slot
    },
    drawn: { keys, watch: open.watch },
    facets: [
      ids(idOf),
      activeDescendant({ active, element, idOf }),
      mark({ attribute: 'data-active', on: '', test: active }),
      mark({
        attribute: 'aria-disabled',
        on: 'true',
        test: { has: (/** @type {Item} */ item) => !applies(item), watch: () => () => undefined },
      }),
      place({ layout, rank: { rank: rankOf, watchRanks: open.watch } }),
    ],
    mount: flowMount(element),
  })
  const slots = radialStep(keys)
  const moves = move({ from: active.get, step: slots.step, to: active.set })
  /**
   * Runs an item, if it applies, closing the menu first
   * @param {Item | undefined} item - The item
   * @returns {void}
   */
  const choose = (item) => {
    if (item !== undefined && applies(item)) {
      open.set(false)
      item.run()
    }
  }
  const anchor = {
    getBoundingClientRect() {
      const view = element.ownerDocument.defaultView
      const { x, y } = point ?? { x: (view?.innerWidth ?? 0) / 2, y: (view?.innerHeight ?? 0) / 2 }
      return { bottom: y, left: x, right: x, top: y }
    },
  }
  element.setAttribute('role', 'menu')
  element.tabIndex = -1
  element.style.padding = '0'
  element.style.width = `${String(layout.extent)}px`
  element.style.height = `${String(layout.extent)}px`
  const stops = [
    rendered.stop,
    open.watch(() => {
      if (!open.get()) {
        active.set(undefined)
      }
    }),
    focusReturn({ element, open }),
    popover({ anchor, element, open, side: 'center' }),
    pick({ element, itemOf: rendered.itemOf, to: choose }),
    hoverIntent({ element, itemOf: rendered.itemOf, to: active.set, ...(rest === undefined ? {} : { rest }) }),
    focusWhen({ element, when: open }),
    dismiss({ elements: [element], to: open.set }),
    keybinds(
      [
        ...ARROWS.map(([key, slot]) => ({
          keys: [key],
          run() {
            active.set(slots.toward(slot))
          },
        })),
        {
          keys: ['Tab'],
          run() {
            void moves.by(1)
          },
        },
        {
          keys: ['shift+Tab'],
          run() {
            void moves.by(-1)
          },
        },
        {
          keys: ['Enter', 'Space'],
          run() {
            choose(active.get())
          },
        },
      ],
      { target: element },
    ),
  ]
  return {
    close() {
      open.set(false)
    },
    open,
    openAt(at) {
      open.set(false)
      point = at
      open.set(true)
    },
    stop() {
      open.set(false)
      for (const stop of stops) {
        stop()
      }
    },
  }
}

export { radialMenu }
