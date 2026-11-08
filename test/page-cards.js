/**
 * Five thousand cards in a grid, drawn only around what is in view, from a list in memory, wired by hand from
 * `@pterror/interact-list`, with its keys bound by keybinds, for the browser tests.
 */

import { keybinds, keys } from '@pterror/interact-keybinds'
import {
  activeDescendant,
  arrayCount,
  arrayKeysAt,
  arrayList,
  arrayLocate,
  arrayReorder,
  arrayStep,
  cards,
  cell,
  drag,
  edgeScroll,
  flowMount,
  gaps,
  ids,
  mark,
  move,
  pick,
  place,
  posInSet,
  render,
  reveal,
  sizer,
  viewport,
  visibleRanks,
  widthOf,
  windowing,
} from '@pterror/interact-list'

const CARDS = 5000
const CARD_WIDTH = 120
const CARD_HEIGHT = 80

/**
 * The grid's parts the test reaches
 * @typedef {Readonly<{ list: ReturnType<typeof arrayList<string>>, box: HTMLElement, scroller: HTMLElement }>} Grid
 */

/**
 * What the grid shows now
 * @typedef {Readonly<{ active: string | undefined, position: string | undefined, inView: boolean,
 *   selected: readonly string[], drawn: number, columns: number }>} CardsSeen
 */

/**
 * A drag under way
 * @typedef {Readonly<{ key: string, target: string, after: boolean }>} Dragging
 */

/**
 * A test that holds for the key a drag would land next to, on one side
 * @param {Readonly<{ get: () => Dragging | undefined, watch: (listener: () => void) => () => void }>} dragging - The
 *   drag
 * @param {(drag: Dragging, key: string) => boolean} holds - Whether it holds for a key
 * @returns {Readonly<{ has: (key: string) => boolean, watch: (listener: () => void) => () => void }>} The test
 */
function dragTest(dragging, holds) {
  return {
    has(key) {
      const at = dragging.get()
      return at !== undefined && holds(at, key)
    },
    watch: (listener) =>
      dragging.watch(() => {
        listener()
      }),
  }
}

/** @type {Grid | undefined} */
let grid = undefined

/**
 * A key's element id
 * @param {string} key - The key
 * @returns {string} Its id
 */
function idOf(key) {
  return `card-${key.replaceAll(' ', '-')}`
}

/**
 * A card
 * @param {string} key - The key
 * @returns {Element} The card
 */
function create(key) {
  const card = document.createElement('div')
  card.setAttribute('role', 'option')
  card.textContent = key
  card.style.border = '1px solid'
  card.style.userSelect = 'none'
  return card
}

/**
 * A command that starts a move
 * @param {string} id - The command
 * @param {string} key - Its key
 * @param {() => Promise<void>} run - The move
 * @returns {import('@pterror/interact-keybinds').Command} The command
 */
function moving(id, key, run) {
  return {
    execute: () => {
      void run()
    },
    id,
    keys: [key],
    label: id,
  }
}

/**
 * Puts the grid in the page
 * @returns {Grid} Its parts
 */
function putCards() {
  const scroller = document.createElement('div')
  scroller.style.cssText = 'width: 400px; height: 240px; overflow: auto'
  const box = document.createElement('div')
  box.setAttribute('role', 'listbox')
  box.setAttribute('aria-label', 'Cards')
  box.tabIndex = 0
  scroller.append(box)
  document.body.append(scroller)
  const list = arrayList(Array.from({ length: CARDS }, (_, index) => `Card ${String(index + 1)}`))
  const active = list.hold(undefined, 'next')
  const selected = list.hold(undefined, 'none')
  const count = arrayCount(list)
  /** @type {typeof cell<Dragging | undefined>} */
  const dragCell = cell
  const dragging = dragCell(undefined)
  const reorder = arrayReorder(list)
  const step = arrayStep(list.keys)
  const shown = viewport(scroller)
  const layout = cards({ cardHeight: CARD_HEIGHT, cardWidth: CARD_WIDTH, width: widthOf(box) })
  const drawn = windowing({
    keep: {
      get() {
        const key = active.get()
        return key === undefined ? [] : [key]
      },
      watch: (listener) => active.watch(listener),
    },
    keysAt: arrayKeysAt(list),
    locate: arrayLocate(list.keys),
    ranks: visibleRanks({ count, layout, visible: shown }),
  })
  sizer({ count, element: box, layout })
  const rendered = render({
    create,
    drawn,
    facets: [
      ids(idOf),
      activeDescendant({ active, element: box, idOf }),
      place({ layout, rank: drawn }),
      posInSet({ count, position: drawn }),
      mark({ attribute: 'data-active', on: '', test: active }),
      mark({ attribute: 'aria-selected', on: 'true', test: selected }),
      mark({ attribute: 'data-dragging', on: '', test: dragTest(dragging, (at, key) => at.key === key) }),
      mark({
        attribute: 'data-drop-before',
        on: '',
        test: dragTest(dragging, (at, key) => at.target === key && !at.after),
      }),
      mark({
        attribute: 'data-drop-after',
        on: '',
        test: dragTest(dragging, (at, key) => at.target === key && at.after),
      }),
      reveal(active),
    ],
    mount: flowMount(box),
  })
  pick({
    element: box,
    itemOf: rendered.itemOf,
    to: (key) => {
      active.set(key)
      selected.set(key)
    },
  })
  drag({
    element: box,
    gap: gaps({ axis: 'x', itemOf: rendered.itemOf }),
    itemOf: rendered.itemOf,
    reorder,
    showing: dragging.set,
  })
  edgeScroll({
    active: {
      get: () => dragging.get() !== undefined,
      watch: (listener) =>
        dragging.watch(() => {
          listener()
        }),
    },
    element: scroller,
    scrollBy: shown.scrollBy,
  })
  /**
   * Moves the active card one place along
   * @param {1 | -1} by - Which way
   * @returns {Promise<void>} When it has moved
   */
  const shift = async (by) => {
    const key = active.get()
    const target = key === undefined ? undefined : await step(key, by)
    if (key !== undefined && target !== undefined) {
      reorder(key, target, by > 0)
    }
  }
  const moves = move({ from: active.get, step, to: active.set })
  keybinds(
    [
      moving('right', 'ArrowRight', async () => moves.by(1)),
      moving('left', 'ArrowLeft', async () => moves.by(-1)),
      moving('down', 'ArrowDown', async () => moves.by(layout.columns.get())),
      moving('up', 'ArrowUp', async () => moves.by(-layout.columns.get())),
      moving('first', 'Home', async () => moves.edge(1)),
      moving('last', 'End', async () => moves.edge(-1)),
      moving('shift-right', 'alt+ArrowRight', async () => shift(1)),
      moving('shift-left', 'alt+ArrowLeft', async () => shift(-1)),
      {
        execute: () => {
          selected.set(active.get())
        },
        id: 'choose',
        keys: ['Enter', 'Space'],
        label: 'Choose',
      },
    ],
    () => ({}),
    { inputs: [keys()], target: box },
  )
  grid = { box, list, scroller }
  return grid
}

/**
 * Makes the grid as wide as given
 * @param {number} width - Its width in pixels
 * @returns {void}
 */
function widen(width) {
  if (grid !== undefined) {
    grid.scroller.style.width = `${String(width)}px`
  }
}

/**
 * What the grid shows now
 * @returns {CardsSeen} What a screen reader is told, and what is drawn
 */
function seenCards() {
  const box = grid?.box
  const named = box?.getAttribute('aria-activedescendant')
  const active = named === null || named === undefined ? undefined : document.querySelector(`#${CSS.escape(named)}`)
  const card = active?.getBoundingClientRect()
  const view = grid?.scroller.getBoundingClientRect()
  const first = [...document.querySelectorAll('[role=option]')][0]?.getBoundingClientRect().top
  return {
    active: active?.textContent ?? undefined,
    columns: [...document.querySelectorAll('[role=option]')].filter(
      (each) => each.getBoundingClientRect().top === first,
    ).length,
    drawn: document.querySelectorAll('[role=option]').length,
    inView: card !== undefined && view !== undefined && card.top >= view.top - 1 && card.bottom <= view.bottom + 1,
    position: active?.getAttribute('aria-posinset') ?? undefined,
    selected: [...document.querySelectorAll('[role=option][aria-selected=true]')].map((each) => each.textContent),
  }
}

/**
 * The cards' order
 * @param {number} length - How many from the start
 * @returns {readonly string[]} The first cards
 */
function order(length) {
  return grid?.list.keys().slice(0, length) ?? []
}

/**
 * Where a card is in the order
 * @param {string} key - The card
 * @returns {number} Its index
 */
function indexOf(key) {
  return grid?.list.keys().indexOf(key) ?? -1
}

export { indexOf, order, putCards, seenCards, widen }
