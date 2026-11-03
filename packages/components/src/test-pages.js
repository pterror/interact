/**
 * What the listbox's browser tests run in their pages. Each scenario puts the listbox in the page, acts on it as a
 * person or an app would, and reports what it saw, as plain values.
 * @import { DomMode } from '@interact/dom/css'
 * @import { Listbox } from './listbox.js'
 * @import { Seen } from './test-page-listbox.js'
 * @import { Numbered, Range } from './test-helpers.js'
 */

import { TEN_BILLION } from './test-helpers.js'
import { latest, middle, parts, press, reads, registerListbox, seen, settle } from './test-page-listbox.js'
import { VIRTUAL_ROWS } from './virtual-rows.js'

const FIVE_BILLION = 5_000_000_000
const JUMPS = 60
const ONE = 1
const NONE = 0
const SCROLLED_ROWS = 2000
const PRESSED = 3
const QUARTER = 4
const ROWS = 10
const ROWS_SHORT = 6

/**
 * Adopts the server's listbox: notes its options, registers the element, and reports whether the same nodes stayed
 * and what shows.
 * @param {number} top - The position the server rendered at the top
 * @returns {Promise<Seen & Readonly<{ same: boolean, before: number }>>} What adopting left
 */
async function adoptServerListbox(top) {
  const { root } = parts()
  const before = [...root.querySelectorAll('[role="option"]')]
  registerListbox(top)
  await settle()
  const after = [...root.querySelectorAll('[role="option"]')]
  const same = before.length > NONE && before.every((node, index) => after[index] === node)
  return { ...seen(), before: before.length, same }
}

/**
 * Puts a new listbox in the page, in a DOM mode.
 * @param {DomMode} mode - Where it lives
 * @returns {Promise<Listbox<Numbered, Range>>} It, once it has rendered
 */
async function fresh(mode) {
  registerListbox(NONE)
  const element = document.createElement('x-listbox')
  element.setAttribute('dom-mode', mode)
  document.body.append(element)
  await settle()
  return latest()
}

/**
 * Jumps across all ten billion items, one jump per frame, from jump `step` on.
 * @param {Listbox<Numbered, Range>} listbox - The listbox
 * @param {number} step - Which jump this is
 * @param {Readonly<{ blocks: number, options: number }>} most - The most blocks and options seen so far
 * @returns {Promise<Readonly<{ blocks: number, options: number }>>} The most seen in all the jumps
 */
async function jumpAround(listbox, step, most) {
  if (step > JUMPS) {
    return most
  }
  listbox.scroll.scrollTo(Math.floor((TEN_BILLION / JUMPS) * step) - step)
  await settle()
  const now = seen()
  return jumpAround(listbox, step + ONE, {
    blocks: Math.max(most.blocks, now.blocks),
    options: Math.max(most.options, now.options),
  })
}

/**
 * Jumps to five billion, then to the last item, then all over: what showed after the first two, and the most blocks
 * cached and options rendered at once.
 * @param {DomMode} mode - Where the listbox lives
 * @returns {Promise<Readonly<{ fiveBillion: Seen, last: Seen, mostBlocks: number, mostOptions: number }>>} What showed
 */
async function jump(mode) {
  const listbox = await fresh(mode)
  listbox.scroll.scrollTo(FIVE_BILLION)
  await settle()
  const fiveBillion = seen()
  listbox.scroll.scrollTo(TEN_BILLION)
  await settle()
  const last = seen()
  const most = await jumpAround(listbox, ONE, { blocks: NONE, options: NONE })
  return { fiveBillion, last, mostBlocks: most.blocks, mostOptions: most.options }
}

/**
 * Selects everything with the keyboard, then deselects one item with a toggle-click: how many are selected, how long
 * it took, and how many items were ever read.
 * @param {DomMode} mode - Where the listbox lives
 * @returns {Promise<Readonly<{ count: number, milliseconds: number, read: number }>>} What it came to
 */
async function selectAllButOne(mode) {
  const listbox = await fresh(mode)
  const { root, viewport } = parts()
  viewport.focus()
  const started = performance.now()
  press('a', true)
  const option = root.querySelector(`[aria-posinset="${String(PRESSED)}"]`)
  option?.dispatchEvent(new MouseEvent('click', { bubbles: true, ctrlKey: true }))
  const count = await listbox.choose.count()
  return { count, milliseconds: performance.now() - started, read: reads() }
}

/**
 * Focuses the viewport and moves the active item down to `PRESSED`.
 * @returns {Promise<HTMLElement>} The viewport, once it has rendered
 */
async function focusAndMoveDown() {
  const { viewport } = parts()
  viewport.focus()
  for (let step = NONE; step < PRESSED; step += ONE) {
    press('ArrowDown')
  }
  await settle()
  return viewport
}

/**
 * Focuses the listbox, moves the active item down, scrolls it far out of the window, then moves it again: what showed
 * while it was out of sight, and after.
 * @param {DomMode} mode - Where the listbox lives
 * @returns {Promise<Readonly<{ away: Seen, back: Seen }>>} What showed
 */
async function focusAway(mode) {
  await fresh(mode)
  const viewport = await focusAndMoveDown()
  const option = viewport.querySelector('[role="option"]')
  viewport.scrollTop += SCROLLED_ROWS * (option?.getBoundingClientRect().height ?? NONE)
  await settle()
  const away = seen()
  press('ArrowDown')
  await settle()
  return { away, back: seen() }
}

/**
 * A new listbox jumped to five billion, then scrolled natively to a few rows before the point where the next rows
 * down move the offset.
 * @param {DomMode} mode - Where the listbox lives
 * @returns {Promise<Readonly<{ across: number, down: number }>>} Where to put the mouse
 */
async function beforeRecentring(mode) {
  const listbox = await fresh(mode)
  listbox.scroll.scrollTo(FIVE_BILLION)
  await settle()
  const { viewport } = parts()
  const height = viewport.querySelector('[role="option"]')?.getBoundingClientRect().height ?? NONE
  const lastKept = VIRTUAL_ROWS - ROWS - VIRTUAL_ROWS / QUARTER
  viewport.scrollTop = (lastKept - ROWS_SHORT) * height
  await settle()
  return middle()
}

/**
 * A new listbox jumped to a few rows before the last top position.
 * @param {DomMode} mode - Where the listbox lives
 * @returns {Promise<Readonly<{ across: number, down: number }>>} Where to put the mouse
 */
async function beforeTheEnd(mode) {
  const listbox = await fresh(mode)
  listbox.scroll.scrollTo(TEN_BILLION - ROWS - ROWS_SHORT)
  await settle()
  return middle()
}

export { seen, settle } from './test-page-listbox.js'
export { FIVE_BILLION, adoptServerListbox, beforeRecentring, beforeTheEnd, focusAway, jump, selectAllButOne }
