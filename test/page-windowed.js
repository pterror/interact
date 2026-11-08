/**
 * Half a million options in groups of ten, worked out from their ranks and drawn only around what is in view, wired
 * by hand from `@pterror/interact-list`, with its keys bound by keybinds, for the browser test.
 */

import { keybinds, keys } from '@pterror/interact-keybinds'
import {
  activeDescendant,
  cell,
  computedKeysAt,
  computedLocate,
  computedStep,
  groupMount,
  ids,
  mark,
  move,
  pick,
  place,
  posInSet,
  render,
  reveal,
  rows,
  sizer,
  viewport,
  visibleRanks,
  windowing,
} from '@pterror/interact-list'

const OPTIONS = 500_000
const PER_GROUP = 10
const ROW = PER_GROUP + 1
const ROW_HEIGHT = 24

/**
 * What the list shows now
 * @typedef {Readonly<{ active: string | undefined, position: string | undefined, size: string | undefined,
 *   group: string | undefined, inView: boolean, selected: readonly string[], drawn: number, scrolled: number }>}
 *   WindowedSeen
 */

/**
 * The number in a key
 * @param {string} key - The key: "o" or "h", then a number
 * @returns {number} The number
 */
function numberOf(key) {
  return Number(key.slice(1))
}

/**
 * The key at a row
 * @param {number} rank - The row
 * @returns {string} Its key: a group's header, or an option
 */
function rowAt(rank) {
  const group = Math.floor(rank / ROW)
  const within = rank % ROW
  return within === 0 ? `h${String(group)}` : `o${String(group * PER_GROUP + within - 1)}`
}

/**
 * A key's row
 * @param {string} key - The key
 * @returns {number | undefined} Its row
 */
function rowOf(key) {
  const number = numberOf(key)
  if (key.startsWith('h')) {
    return number * ROW
  }
  return Math.floor(number / PER_GROUP) * ROW + (number % PER_GROUP) + 1
}

/**
 * An option's position among the options
 * @param {string} key - The key
 * @returns {number | undefined} Its position, none for a header
 */
function optionIndex(key) {
  return key.startsWith('o') ? numberOf(key) : undefined
}

/**
 * A key's group
 * @param {string} key - The key
 * @returns {number} Its group
 */
function groupOf(key) {
  return key.startsWith('h') ? numberOf(key) : Math.floor(numberOf(key) / PER_GROUP)
}

/**
 * A key's element id
 * @param {string} key - The key
 * @returns {string} Its id
 */
function idOf(key) {
  return `item-${key}`
}

/**
 * A row's element
 * @param {string} key - The key
 * @returns {Element} An option, or a group's header
 */
function create(key) {
  const row = document.createElement('div')
  row.setAttribute('role', key.startsWith('h') ? 'presentation' : 'option')
  row.textContent = key.startsWith('h') ? `Group ${String(groupOf(key) + 1)}` : `Option ${String(numberOf(key) + 1)}`
  return row
}

/**
 * A value that never changes
 * @template T
 * @param {T} value - The value
 * @returns {Readonly<{ get: () => T, watch: () => () => void }>} It
 */
function fixed(value) {
  return { get: () => value, watch: () => () => undefined }
}

/**
 * Binds a key to a move
 * @param {string} id - The command
 * @param {string} key - The key
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

/** How late, in milliseconds, a late list answers */
const LATE_MS = 40

/** Each time `aria-activedescendant` named an element that wasn't there */
/** @type {string[]} */
const wrong = []

/**
 * An answer, late if asked
 * @template T
 * @param {boolean} late - Whether to answer late, as a server would
 * @param {() => Promise<T>} answer - The answer
 * @returns {Promise<T>} It
 */
async function answering(late, answer) {
  if (late) {
    /** @type {PromiseWithResolvers<void>} */
    const waited = Promise.withResolvers()
    setTimeout(waited.resolve, LATE_MS)
    await waited.promise
  }
  return answer()
}

/**
 * Notes, whenever the listbox changes, whether `aria-activedescendant` names an element that isn't there
 * @param {Element} box - The listbox
 * @returns {void}
 */
function watchNamed(box) {
  const check = () => {
    const id = box.getAttribute('aria-activedescendant')
    if (id !== null && box.querySelector(`#${CSS.escape(id)}`) === null) {
      wrong.push(id)
    }
  }
  new MutationObserver(check).observe(box, {
    attributeFilter: ['aria-activedescendant'],
    attributes: true,
    childList: true,
    subtree: true,
  })
}

/**
 * Puts the list in the page
 * @param {Readonly<{ late?: boolean }>} [options] - Whether the list answers late, as a server would
 * @returns {void}
 */
function putWindowed({ late = false } = {}) {
  const scroller = document.createElement('div')
  scroller.style.cssText = `height: ${String(ROW_HEIGHT * 10)}px; overflow: auto`
  const box = document.createElement('div')
  box.setAttribute('role', 'listbox')
  box.setAttribute('aria-label', 'Options')
  box.tabIndex = 0
  scroller.append(box)
  document.body.append(scroller)
  /** @type {typeof cell<string | undefined>} */
  const keyCell = cell
  const active = keyCell(undefined)
  const selected = keyCell(undefined)
  const layout = rows(ROW_HEIGHT)
  const count = fixed((OPTIONS / PER_GROUP) * ROW)
  const shown = viewport(scroller)
  const rowsAt = computedKeysAt({ count: count.get(), keyAt: rowAt })
  const locateRow = computedLocate(rowOf)
  watchNamed(box)
  const drawn = windowing({
    keep: {
      get() {
        const key = active.get()
        return key === undefined ? [] : [key]
      },
      watch: (listener) => active.watch(listener),
    },
    keysAt: {
      keysAt: async (from, to) => answering(late, async () => rowsAt.keysAt(from, to)),
      watch: rowsAt.watch,
    },
    locate: async (key) => answering(late, async () => locateRow(key)),
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
      posInSet({ count: fixed(OPTIONS), position: { rank: optionIndex, watchRanks: () => () => undefined } }),
      mark({ attribute: 'data-active', on: '', test: active }),
      mark({ attribute: 'aria-selected', on: 'true', test: selected }),
      reveal(active),
    ],
    mount: groupMount({ container: box, groupOf, labelIdOf: (group) => idOf(`h${String(group)}`) }),
  })
  pick({
    element: box,
    itemOf: rendered.itemOf,
    to: (key) => {
      if (key.startsWith('o')) {
        active.set(key)
        selected.set(key)
      }
    },
  })
  const moves = move({
    from: active.get,
    step: computedStep({ count: OPTIONS, keyAt: (index) => `o${String(index)}`, rankOf: optionIndex }),
    to: active.set,
  })
  keybinds(
    [
      moving('next', 'ArrowDown', async () => moves.by(1)),
      moving('previous', 'ArrowUp', async () => moves.by(-1)),
      moving('first', 'Home', async () => moves.edge(1)),
      moving('last', 'End', async () => moves.edge(-1)),
      moving('page', 'PageDown', async () => moves.by(Math.floor(scroller.clientHeight / ROW_HEIGHT))),
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
 * Scrolls the list to a part of the way down
 * @param {number} fraction - How far, from 0 to 1
 * @returns {void}
 */
function scrollTo(fraction) {
  const scroller = document.querySelector('[role=listbox]')?.parentElement
  if (scroller) {
    scroller.scrollTop = fraction * (scroller.scrollHeight - scroller.clientHeight)
  }
}

/**
 * What the list shows now
 * @returns {WindowedSeen} What a screen reader is told, and what is drawn
 */
function seenWindowed() {
  const box = document.querySelector('[role=listbox]')
  const scroller = box?.parentElement
  const named = box?.getAttribute('aria-activedescendant')
  const active = named === null || named === undefined ? undefined : document.querySelector(`#${CSS.escape(named)}`)
  const label = active?.parentElement?.getAttribute('aria-labelledby')
  const box1 = active?.getBoundingClientRect()
  const view = scroller?.getBoundingClientRect()
  return {
    active: active?.textContent ?? undefined,
    drawn: document.querySelectorAll('[role=option]').length,
    group:
      label === null || label === undefined
        ? undefined
        : (document.querySelector(`#${label}`)?.textContent ?? undefined),
    inView: box1 !== undefined && view !== undefined && box1.top >= view.top - 1 && box1.bottom <= view.bottom + 1,
    position: active?.getAttribute('aria-posinset') ?? undefined,
    scrolled: scroller?.scrollTop ?? 0,
    selected: [...document.querySelectorAll('[role=option][aria-selected=true]')].map((each) => each.textContent),
    size: active?.getAttribute('aria-setsize') ?? undefined,
  }
}

/**
 * Each time `aria-activedescendant` named an element that wasn't there
 * @returns {readonly string[]} The ids it named
 */
function wronglyNamed() {
  return wrong
}

export { putWindowed, scrollTo, seenWindowed, wronglyNamed }
