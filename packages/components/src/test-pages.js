/**
 * What the listbox's browser tests run in their pages. Each scenario puts the listbox in the page, acts on it as a
 * person or an app would, and reports what it saw, as plain values.
 * @import { DomMode } from '@interact/dom/css'
 * @import { Listbox } from './listbox.js'
 * @import { Numbered, Range } from './test-helpers.js'
 * @import { Seen } from './test-page-listbox.js'
 */

import { TEN_BILLION } from './test-helpers.js'
import { fresh, parts, press, reads, registerListbox, seen, settle } from './test-page-listbox.js'

const FIVE_BILLION = 5_000_000_000
const JUMPS = 60
const ONE = 1
const NONE = 0
const SCROLLED_ROWS = 2000
const PRESSED = 3

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
 * Focuses a new listbox, moves down, toggles an item and extends the selection, as a person would before an audit.
 * @param {DomMode} mode - Where the listbox lives
 * @returns {Promise<void>} When it has rendered
 */
async function focusedAndChosen(mode) {
  await fresh(mode)
  await focusAndMoveDown()
  press(' ')
  press('ArrowDown', false, true)
  await settle()
}

/**
 * Puts a new listbox in the page and selects its first item: the selected and an unselected option's fill, and what
 * the system's selection color is.
 * @param {DomMode} mode - Where the listbox lives
 * @returns {Promise<Readonly<{ selected: string, unselected: string, highlight: string }>>} The colors
 */
async function selectedFills(mode) {
  const listbox = await fresh(mode)
  listbox.choose.press(NONE, { shift: false, toggle: false })
  await settle()
  const { root } = parts()
  const probe = document.createElement('div')
  probe.style.setProperty('background-color', 'Highlight')
  probe.style.setProperty('forced-color-adjust', 'none')
  document.body.append(probe)
  return {
    highlight: getComputedStyle(probe).backgroundColor,
    selected: fillOf(root, '[aria-posinset="1"]'),
    unselected: fillOf(root, '[aria-posinset="2"]'),
  }
}

/**
 * Puts a new listbox in the page, focuses it from the keyboard, and selects its active item: the active option's
 * outline color and width, and its fill.
 * @param {DomMode} mode - Where the listbox lives
 * @returns {Promise<Readonly<{ outline: string, width: string, fill: string }>>} What it looks like
 */
async function activeSelectedOutline(mode) {
  await fresh(mode)
  const { root, viewport } = parts()
  viewport.focus({ focusVisible: true })
  press(' ')
  await settle()
  const option = root.querySelector('[part~="option-active"]')
  const style = option ? getComputedStyle(option) : undefined
  return {
    fill: style?.backgroundColor ?? 'missing',
    outline: style?.outlineColor ?? 'missing',
    width: style?.outlineWidth ?? 'missing',
  }
}

/**
 * The colors a token set at one level gives: the viewport's fill, an option's, and a selected option's.
 * @typedef {Readonly<{ fill: string, option: string, selected: string }>} Colors
 */

/**
 * The background color of what a selector finds.
 * @param {HTMLElement | ShadowRoot} root - Where to look
 * @param {string} selector - What to look for
 * @returns {string} Its background color, or "missing"
 */
function fillOf(root, selector) {
  const found = root.querySelector(selector)
  return found ? getComputedStyle(found).backgroundColor : 'missing'
}

/**
 * The listbox's colors now.
 * @returns {Colors} Its viewport's fill, its second option's, and its first (selected) option's
 */
function colors() {
  const { root, viewport } = parts()
  return {
    fill: getComputedStyle(viewport).backgroundColor,
    option: fillOf(root, '[aria-posinset="2"]'),
    selected: fillOf(root, '[aria-posinset="1"]'),
  }
}

/**
 * Selects the first item of a new listbox under the theme, then sets a token at each level in turn: the colors with
 * the theme alone, then with a component token, a part token and an instance token set.
 * @param {DomMode} mode - Where the listbox lives
 * @returns {Promise<Readonly<{ theme: Colors, component: Colors, part: Colors, instance: Colors }>>} The colors
 */
async function tokenLevels(mode) {
  const listbox = await fresh(mode)
  listbox.choose.press(NONE, { shift: false, toggle: false })
  await settle()
  const theme = colors()
  document.documentElement.style.setProperty('--interact-listbox-fill', 'rgb(1, 2, 3)')
  const component = colors()
  document.documentElement.style.setProperty('--interact-listbox-option-fill', 'rgb(4, 5, 6)')
  const part = colors()
  document.querySelector('x-listbox')?.setAttribute('style', '--interact-listbox-option-selected-fill: rgb(7, 8, 9)')
  return { component, instance: colors(), part, theme }
}

export { seen, settle } from './test-page-listbox.js'
export {
  FIVE_BILLION,
  activeSelectedOutline,
  adoptServerListbox,
  focusAway,
  focusedAndChosen,
  jump,
  selectAllButOne,
  selectedFills,
  tokenLevels,
}
