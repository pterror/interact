/**
 * Entries in a grid grouped by region, each region under a header as wide as the grid, drawn only around what is in
 * view, from groups in memory, wired by hand from `@interact/list`, with its keys bound by keybinds, for the browser
 * test.
 */

import {
  activeDescendant,
  arrayCount,
  arrayGroups,
  arrayKeysAt,
  arrayLocate,
  arrayRank,
  arrayStep,
  cell,
  drag,
  edgeScroll,
  gaps,
  gridStep,
  groupMount,
  groupReorder,
  groupedCards,
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
} from '@interact/list'
import { keybinds, keys } from 'keybinds'

const REGIONS = 200
const CARD_WIDTH = 120
const CARD_HEIGHT = 80
const HEADER_HEIGHT = 32
const HEADER = '#'

/**
 * A drag under way
 * @typedef {Readonly<{ key: string, target: string, after: boolean }>} Dragging
 */

/**
 * What the grid shows now
 * @typedef {Readonly<{ active: string | undefined, region: string | undefined, left: number, top: number,
 *   inView: boolean, selected: readonly string[], drawn: number, total: number, headerWidth: number,
 *   gridWidth: number }>} RegionsSeen
 */

/**
 * The regions and their entries: region `i` has `(i * 7) % 13` entries, so some have none
 * @returns {(readonly [string, readonly string[]])[]} The regions
 */
function regions() {
  let entry = 0
  return Array.from({ length: REGIONS }, (_, index) => {
    const entries = Array.from({ length: (index * 7) % 13 }, () => {
      entry += 1
      return `Entry ${String(entry)}`
    })
    return [`Region ${String(index + 1)}`, entries]
  })
}

const groups = arrayGroups({ headerOf: (region) => `${HEADER}${region}`, initial: regions() })

/** @type {HTMLElement | undefined} */
let grid = undefined

/**
 * A key's element id
 * @param {string} key - The key
 * @returns {string} Its id
 */
function idOf(key) {
  return `region-item-${key.replaceAll(/[^a-z0-9]/giu, '-')}`
}

/**
 * A card, or a region's header
 * @param {string} key - The key
 * @returns {Element} Its element
 */
function create(key) {
  const row = document.createElement('div')
  row.style.userSelect = 'none'
  if (key.startsWith(HEADER)) {
    row.setAttribute('role', 'presentation')
    row.textContent = key.slice(HEADER.length)
    row.style.fontWeight = 'bold'
  } else {
    row.setAttribute('role', 'option')
    row.textContent = key
    row.style.border = '1px solid'
  }
  return row
}

/**
 * A test that holds for keys a drag marks
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

/**
 * A command that starts something that finishes later
 * @param {string} id - The command
 * @param {string} key - Its key
 * @param {() => Promise<void>} run - What it does
 * @returns {import('keybinds').Command} The command
 */
function later(id, key, run) {
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
 * @returns {void}
 */
function putRegions() {
  const scroller = document.createElement('div')
  scroller.style.cssText = 'width: 420px; height: 480px; overflow: auto'
  const box = document.createElement('div')
  box.setAttribute('role', 'listbox')
  box.setAttribute('aria-label', 'Entries by region')
  box.tabIndex = 0
  scroller.append(box)
  document.body.append(scroller)
  grid = box
  const active = groups.hold(undefined, 'next')
  const selected = groups.hold(undefined, 'none')
  /** @type {typeof cell<Dragging | undefined>} */
  const dragCell = cell
  const dragging = dragCell(undefined)
  const layout = groupedCards({
    cardHeight: CARD_HEIGHT,
    cardWidth: CARD_WIDTH,
    headerHeight: HEADER_HEIGHT,
    sizes: groups.sizes,
    width: widthOf(box),
  })
  const shown = viewport(scroller)
  const keysAt = arrayKeysAt(groups.rows)
  const locate = arrayLocate(groups.rows.keys)
  const drawn = windowing({
    keep: {
      get() {
        const key = active.get()
        return key === undefined ? [] : [key]
      },
      watch: (listener) => active.watch(listener),
    },
    keysAt,
    locate,
    ranks: visibleRanks({ count: arrayCount(groups.rows), layout, visible: shown }),
  })
  sizer({ count: arrayCount(groups.rows), element: box, layout })
  const rendered = render({
    create,
    drawn,
    facets: [
      ids(idOf),
      activeDescendant({ active, element: box, idOf }),
      place({ layout, rank: drawn }),
      posInSet({ count: arrayCount(groups.options), position: arrayRank(groups.options) }),
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
    mount: groupMount({
      container: box,
      groupOf: groups.groupOf,
      labelIdOf: (region) => idOf(groups.headerOf(region ?? '')),
    }),
  })
  pick({
    element: box,
    itemOf: rendered.itemOf,
    to: (key) => {
      active.set(key)
      selected.set(key)
    },
  })
  const reorder = groupReorder(groups)
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
  const across = arrayStep(groups.options.keys)
  const sideways = move({ from: active.get, step: across, to: active.set })
  const vertical = move({
    from: active.get,
    step: gridStep({ keysAt, locate, rowStep: layout.rowStep }),
    to: active.set,
  })
  /**
   * Moves the active entry one place along: next to its neighbour in its region, or to the near end of the next one
   * @param {1 | -1} by - Which way
   * @returns {Promise<void>} When it has moved
   */
  const shift = async (by) => {
    const key = active.get()
    const target = key === undefined ? undefined : await across(key, by)
    if (key === undefined || target === undefined) {
      return
    }
    const same = groups.groupOf(target) === groups.groupOf(key)
    reorder(key, target, same ? by > 0 : by < 0)
  }
  keybinds(
    [
      later('right', 'ArrowRight', async () => sideways.by(1)),
      later('left', 'ArrowLeft', async () => sideways.by(-1)),
      later('down', 'ArrowDown', async () => vertical.by(1)),
      later('up', 'ArrowUp', async () => vertical.by(-1)),
      later('first', 'Home', async () => sideways.edge(1)),
      later('last', 'End', async () => sideways.edge(-1)),
      later('shift-right', 'alt+ArrowRight', async () => shift(1)),
      later('shift-left', 'alt+ArrowLeft', async () => shift(-1)),
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
}

/**
 * Which region an entry is in, and where
 * @param {string} key - The entry
 * @returns {Readonly<{ region: number, index: number }>} The region's index, and the entry's in it; -1 if absent
 */
function whereIs(key) {
  const region = groups.groups().findIndex(([, entries]) => entries.includes(key))
  return { index: groups.groups()[region]?.[1].indexOf(key) ?? -1, region }
}

/**
 * A region's entries
 * @param {number} region - The region's index
 * @returns {readonly string[]} Its entries
 */
function entriesIn(region) {
  return groups.groups()[region]?.[1] ?? []
}

/**
 * What the grid shows now
 * @returns {RegionsSeen} What a screen reader is told, and what is drawn
 */
function seenRegions() {
  const named = grid?.getAttribute('aria-activedescendant')
  const active = named === null || named === undefined ? undefined : document.querySelector(`#${CSS.escape(named)}`)
  const label = active?.parentElement?.getAttribute('aria-labelledby')
  const card = active?.getBoundingClientRect()
  const view = grid?.parentElement?.getBoundingClientRect()
  const header = document.querySelector('[role=presentation]')
  return {
    active: active?.textContent ?? undefined,
    drawn: document.querySelectorAll('[role=option]').length,
    gridWidth: grid?.clientWidth ?? 0,
    headerWidth: header instanceof HTMLElement ? header.offsetWidth : 0,
    inView: card !== undefined && view !== undefined && card.top >= view.top - 1 && card.bottom <= view.bottom + 1,
    left: active instanceof HTMLElement ? active.offsetLeft : 0,
    region:
      label === null || label === undefined
        ? undefined
        : (document.querySelector(`#${CSS.escape(label)}`)?.textContent ?? undefined),
    selected: [...document.querySelectorAll('[role=option][aria-selected=true]')].map((each) => each.textContent),
    top: active instanceof HTMLElement ? active.offsetTop : 0,
    total: groups.options.keys().length,
  }
}

export { entriesIn, putRegions, seenRegions, whereIs }
