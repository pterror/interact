/**
 * What the browser tests of drag to reorder, load as you scroll and grouped sections run in their pages: a listbox
 * made of the listbox's own extensions and one of those, windowed or not, put in the page, acted on, and seen.
 * @import { ListPipeline } from '@interact/core/list-pipeline'
 * @import { Extension } from '@interact/core/state'
 * @import { DomMode } from '@interact/dom/css'
 * @import { TemplateResult } from '@interact/dom/template'
 * @import { ActiveItem } from './active-item.js'
 */

import { MemorySource, Store, listPipeline } from '@interact/core'
import { defaultRendering, register } from '@interact/dom'

import { active } from './active-item.js'
import { focusEntering } from './focus-entering.js'
import { groupedSections } from './grouped-sections.js'
import { listboxElement } from './listbox-element.js'
import { listbox } from './listbox.js'
import { loadAsYouScroll } from './load-as-you-scroll.js'
import { navigation } from './navigation.js'
import { reorder } from './reorder.js'
import { windowing } from './windowing.js'

/**
 * An item: what it is called, and its group.
 * @typedef {Readonly<{ text: string, group: string, heading: boolean }>} Entry
 */

/**
 * What the listbox in the page is made of.
 * @typedef {Readonly<{ store: Store, source: MemorySource<Entry>, current: ActiveItem<Entry, TemplateResult, MemorySource<Entry>> }>} Made
 */

const ROWS = 6
const ITEMS = 12
const PAGE = 30
const LAST_PAGE = 3
const LOAD_MS = 50
const GROUPS = ['Fruit', 'Vegetable', 'Grain']
const PER_GROUP = 10
const WAIT_MS = 5000

/** @type {Made[]} */
const made = []

/**
 * Items numbered from `start`, `count` of them, in one group.
 * @param {number} start - The first number
 * @param {number} count - How many
 * @returns {Entry[]} The items
 */
function numbered(start, count) {
  return Array.from({ length: count }, (_skip, at) => ({
    group: 'All',
    heading: false,
    text: `Item ${String(start + at)}`,
  }))
}

/**
 * The listbox made last.
 * @returns {Made} It
 */
function latest() {
  const last = made.at(-1)
  if (last === undefined) {
    throw new Error('No listbox has been made')
  }
  return last
}

/**
 * Puts a new listbox in the page over some items, with the listbox's extensions and those `more` gives.
 * @param {DomMode} mode - Where it lives
 * @param {boolean} windowed - Whether it is windowed
 * @param {readonly Entry[]} items - Its items
 * @param {(current: ActiveItem<Entry, TemplateResult, MemorySource<Entry>>, source: MemorySource<Entry>) => Extension} more -
 *   The extension being tested
 * @returns {Promise<Made>} It, once it has rendered
 */
async function fresh(mode, windowed, items, more) {
  const source = new MemorySource(
    items,
    (item) => item.text,
    (item) => item.text,
  )
  const ListboxElement = listboxElement(() => {
    /** @type {ListPipeline<Entry, TemplateResult, MemorySource<Entry>>} */
    const list = listPipeline(source)
    const current = active(list)
    const store = new Store([
      listbox(current, { id: 'x', label: 'Things' }),
      navigation(current),
      focusEntering(current),
      more(current, source),
      windowed ? windowing(list, { rows: ROWS }) : [],
      list.text.of((item) => item.text),
      defaultRendering(list),
    ])
    made.push({ current, source, store })
    return store
  })
  register([ListboxElement], { prefix: 'x' })
  const element = document.createElement('x-listbox')
  element.setAttribute('dom-mode', mode)
  document.body.append(element)
  await settle()
  return latest()
}

/**
 * Waits for the next frame to be drawn.
 * @returns {Promise<void>} When it has been
 */
async function frame() {
  /** @type {PromiseWithResolvers<void>} */
  const painted = Promise.withResolvers()
  requestAnimationFrame(() => {
    painted.resolve()
  })
  await painted.promise
}

/**
 * Waits a while.
 * @param {number} milliseconds - How long
 * @returns {Promise<void>} When it has
 */
async function wait(milliseconds) {
  /** @type {PromiseWithResolvers<void>} */
  const waited = Promise.withResolvers()
  setTimeout(() => {
    waited.resolve()
  }, milliseconds)
  await waited.promise
}

/**
 * Waits for two frames: a render, and the scroll or measuring after it.
 * @returns {Promise<void>} When they have been drawn
 */
async function settle() {
  await frame()
  await frame()
}

/**
 * The listbox's root and its list element.
 * @returns {Readonly<{ root: HTMLElement | ShadowRoot, list: HTMLElement }>} They
 */
function parts() {
  const host = document.querySelector('x-listbox')
  if (!(host instanceof HTMLElement)) {
    throw new TypeError('There is no x-listbox')
  }
  const root = host.shadowRoot ?? host
  const list = root.querySelector('[part~="list"]')
  if (!(list instanceof HTMLElement)) {
    throw new TypeError('The listbox has no list')
  }
  return { list, root }
}

/**
 * The row at a position.
 * @param {number} position - Where it is
 * @returns {Element | undefined} The row, if rendered
 */
function rowAt(position) {
  return parts().root.querySelector(`[data-position="${String(position)}"]`) ?? undefined
}

/**
 * The middle of the row at a position, in the viewport.
 * @param {number} position - Where it is
 * @returns {Readonly<{ x: number, y: number, top: number }>} Its middle, and its top
 */
function middleOf(position) {
  const box = rowAt(position)?.getBoundingClientRect()
  if (box === undefined) {
    throw new Error(`Row ${String(position)} isn't rendered`)
  }
  return { top: box.top, x: box.left + box.width / 2, y: box.top + box.height / 2 }
}

/**
 * Focuses the list and presses keys on it.
 * @param {readonly string[]} pressed - The keys
 * @returns {Promise<void>} When they have rendered
 */
async function keys(pressed) {
  const { list } = parts()
  list.focus()
  for (const key of pressed) {
    list.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key }))
  }
  await settle()
}

/**
 * What the listbox shows: its items in order, the active item, whether the list has focus and names the active row
 * that is there.
 * @returns {Readonly<{ order: string, active: string | undefined, focused: boolean, named: boolean }>} What shows
 */
function seen() {
  const { current, source, store } = latest()
  const { list, root } = parts()
  const at = current.positionIn(store.state)
  const id = list.getAttribute('aria-activedescendant')
  const focusedNow = root instanceof ShadowRoot ? root.activeElement : document.activeElement
  return {
    active: at === undefined ? undefined : source.read(at, at + 1)[0]?.text,
    focused: focusedNow === list,
    named: id !== null && root.querySelector(`#${CSS.escape(id)}`) !== null,
    order: source
      .read(0, source.count())
      .map((item) => item.text.replace('Item ', ''))
      .join(' '),
  }
}

/**
 * Puts a reorderable listbox of twelve items in the page, makes the third active from the keyboard, and gives the
 * places of the rows a drag is to go between.
 * @param {DomMode} mode - Where it lives
 * @param {boolean} windowed - Whether it is windowed
 * @returns {Promise<Readonly<Record<string, Readonly<{ x: number, y: number, top: number }>>>>} The middles of rows 0,
 *   2 and 4
 */
async function reorderable(mode, windowed) {
  await fresh(mode, windowed, numbered(0, ITEMS), (current, source) =>
    reorder(current, {
      move: ({ from, to }) => {
        const [item] = source.read(from, from + 1)
        if (item !== undefined) {
          source.remove(from, from + 1)
          source.insert(to, [item])
        }
      },
    }),
  )
  await keys(['ArrowDown', 'ArrowDown', 'ArrowDown'])
  return { 0: middleOf(0), 2: middleOf(2), 4: middleOf(4) }
}

/**
 * Where the row at a position is drawn now, and its parts.
 * @param {number} position - Where it is
 * @returns {Readonly<{ top: number, dragging: boolean }>} Its top in the viewport, and whether it is the dragged row
 */
function drawn(position) {
  const row = rowAt(position)
  return {
    dragging: row?.getAttribute('part')?.split(' ').includes('dragging') ?? false,
    top: row?.getBoundingClientRect().top ?? Number.NaN,
  }
}

/**
 * The text of the listbox's status.
 * @returns {string | undefined} Its text, if it has one
 */
function statusText() {
  return parts().root.querySelector('[role="status"]')?.textContent ?? undefined
}

/**
 * How loads went: how many were asked for, and what the status said while each was going on.
 * @type {{ loads: number, said: (string | undefined)[] }}
 */
const loading = { loads: 0, said: [] }

/**
 * Puts a listbox that loads as it scrolls in the page, a page of items in it, and makes the fifth item active from the keyboard.
 * @param {DomMode} mode - Where it lives
 * @param {boolean} windowed - Whether it is windowed
 * @returns {Promise<Readonly<{ x: number, y: number }>>} Where to turn the wheel
 */
async function loadable(mode, windowed) {
  await fresh(mode, windowed, numbered(0, PAGE), (current, source) =>
    loadAsYouScroll(current.list, {
      load: async () => {
        loading.loads += 1
        await frame()
        loading.said.push(statusText())
        await wait(LOAD_MS)
        source.insert(source.count(), numbered(source.count(), PAGE))
        return source.count() < PAGE * LAST_PAGE
      },
    }),
  )
  await keys(['ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown'])
  const box = parts().list.getBoundingClientRect()
  return { x: box.left + box.width / 2, y: Math.min(box.top + box.height / 2, innerHeight / 2) }
}

/**
 * Waits until no load is going on, or a while has passed.
 * @returns {Promise<Readonly<{ loads: number, said: readonly (string | undefined)[], status: string | undefined }>>}
 *   How loads went, and what the status says now
 */
async function loaded() {
  await quiet(performance.now())
  return { loads: loading.loads, said: loading.said, status: statusText() }
}

/**
 * Waits, a render at a time, until the status is empty, or a while has passed since `started`.
 * @param {number} started - When waiting started
 * @returns {Promise<void>} When it is
 */
async function quiet(started) {
  await settle()
  if (statusText() !== '' && performance.now() - started < WAIT_MS) {
    await quiet(started)
  }
}

/**
 * The text of the active item now.
 * @returns {string | undefined} Its text
 */
function activeNow() {
  const { current, store } = latest()
  const at = current.positionIn(store.state)
  return at === undefined ? undefined : (rowAt(at)?.textContent ?? undefined)
}

/**
 * Puts a listbox of foods in three groups in the page, and moves through it with the keyboard: from the top, down
 * past the end of the first group, back up, and to the end.
 * @param {DomMode} mode - Where it lives
 * @param {boolean} windowed - Whether it is windowed
 * @returns {Promise<readonly (string | undefined)[]>} The active item after each step
 */
async function grouped(mode, windowed) {
  const foods = GROUPS.flatMap((group) =>
    Array.from({ length: PER_GROUP }, (_skip, at) => ({ group, heading: false, text: `${group} ${String(at)}` })),
  )
  await fresh(mode, windowed, foods, (current) =>
    groupedSections(current, {
      groupOf: (item) => item.group,
      heading: (group) => ({ group, heading: true, text: group }),
    }),
  )
  /** @type {(string | undefined)[]} */
  const steps = []
  await keys(['Home'])
  steps.push(activeNow())
  await keys(Array.from({ length: PER_GROUP }, () => 'ArrowDown'))
  steps.push(activeNow())
  await keys(['ArrowUp'])
  steps.push(activeNow())
  await keys(['End'])
  steps.push(activeNow())
  return steps
}

export { drawn, grouped, loadable, loaded, middleOf, reorderable, seen, settle }
