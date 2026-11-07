/**
 * What the listbox's browser tests run in their pages: registering the listbox, finding it, acting on it as a person
 * or an app would, and seeing what it shows. Each scenario puts the listbox in the page and reports what it saw, as
 * plain values; some are about its scrollable rows: row heights, zoom, and native scrolling near the ends.
 * @import { Source } from '@interact/core/source'
 * @import { DomMode } from '@interact/dom/css'
 * @import { Made, Numbered, Range } from './test-helpers.js'
 */

import { spanning, toggle } from '@interact/core'
import { register } from '@interact/dom'

import { listboxElement } from './listbox-element.js'
import { pixels } from './measure-rows.js'
import { TEN_BILLION, numbers, tenBillionListbox } from './test-helpers.js'

/**
 * What showed: the first and last fully visible positions, how many options are in the DOM, whether the list has focus
 * and its active descendant is there, the active position, and the scroll position.
 * @typedef {Readonly<{
 *   top: number,
 *   bottom: number,
 *   options: number,
 *   focused: boolean,
 *   activeThere: boolean,
 *   active: number | undefined,
 *   scrollTop: number,
 * }>} Seen
 */

/** @typedef {Made<Numbered, Range, Source<Numbered, Range>>} NumbersListbox */

const ONE = 1
const NONE = 0
const HALF = 2
const HALF_PIXEL = 0.5

/** @type {NumbersListbox[]} */
const made = []
const numbered = numbers(TEN_BILLION)

/**
 * Registers the listbox as `x-listbox`, each instance starting at `top`.
 * @param {number} top - The position shown first
 * @returns {void}
 */
function registerListbox(top) {
  const ListboxElement = listboxElement(() => {
    const listbox = tenBillionListbox(numbered.source, top)
    made.push(listbox)
    return listbox.store
  })
  register([ListboxElement], { prefix: 'x' })
}

/**
 * The listbox made last.
 * @returns {NumbersListbox} It
 */
function latest() {
  const listbox = made.at(-ONE)
  if (!listbox) {
    throw new Error('No listbox has been made')
  }
  return listbox
}

/**
 * How many items the page's source has been asked for.
 * @returns {number} The count
 */
function reads() {
  return numbered.reads()
}

/**
 * The root the page's listbox view is in, and its scrolling element.
 * @returns {Readonly<{ root: HTMLElement | ShadowRoot, viewport: HTMLElement }>} The root and the scrolling element
 */
function parts() {
  const host = document.querySelector('x-listbox')
  if (!(host instanceof HTMLElement)) {
    throw new TypeError('There is no x-listbox')
  }
  const root = host.shadowRoot ?? host
  const viewport = root.querySelector('[part~="list"]')
  if (!(viewport instanceof HTMLElement)) {
    throw new TypeError('The listbox has no list')
  }
  return { root, viewport }
}

/**
 * Waits for the next frame to be drawn.
 * @returns {Promise<void>} When it has been
 */
async function frame() {
  /** @type {PromiseWithResolvers<void>} */
  const drawn = Promise.withResolvers()
  requestAnimationFrame(() => {
    drawn.resolve()
  })
  await drawn.promise
}

/**
 * Waits for two frames: one for the render and the scroll it sets, one for the scroll event that follows.
 * @returns {Promise<void>} When they have been drawn
 */
async function settle() {
  await frame()
  await frame()
}

/**
 * The positions of the options fully inside the viewport.
 * @param {HTMLElement | ShadowRoot} root - Where the view is
 * @param {HTMLElement} viewport - The scrolling element
 * @returns {number[]} Their positions
 */
function fullyVisible(root, viewport) {
  const box = viewport.getBoundingClientRect()
  const top = box.top + viewport.clientTop
  const bottom = top + viewport.clientHeight
  return [...root.querySelectorAll('[role="option"]:not([data-offscreen])')]
    .filter((option) => {
      const rect = option.getBoundingClientRect()
      return rect.top >= top - HALF_PIXEL && rect.bottom <= bottom + HALF_PIXEL
    })
    .map((option) => Number(option.getAttribute('aria-posinset')) - ONE)
}

/**
 * What the page's listbox shows now.
 * @returns {Seen} What showed
 */
function seen() {
  const { root, viewport } = parts()
  const visible = fullyVisible(root, viewport)
  const focusedNow = root instanceof ShadowRoot ? root.activeElement : document.activeElement
  const id = viewport.getAttribute('aria-activedescendant')
  const { current, store } = latest()
  return {
    active: current.positionIn(store.state),
    activeThere: id !== null && root.querySelector(`#${CSS.escape(id)}`) !== null,
    bottom: Math.max(...visible),
    focused: focusedNow === viewport,
    options: root.querySelectorAll('[role="option"]').length,
    scrollTop: viewport.scrollTop,
    top: Math.min(...visible),
  }
}

/**
 * A key pressed on the viewport.
 * @param {string} key - The key
 * @param {boolean} [toggled] - Whether the toggle modifier is held
 * @param {boolean} [shift] - Whether Shift is held
 * @returns {void}
 */
function press(key, toggled = false, shift = false) {
  parts().viewport.dispatchEvent(
    new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ctrlKey: toggled, key, shiftKey: shift }),
  )
}

/**
 * The middle of the viewport, where the mouse goes to scroll it.
 * @returns {Readonly<{ across: number, down: number }>} The point, in page coordinates
 */
function middle() {
  const box = parts().viewport.getBoundingClientRect()
  return { across: box.left + box.width / HALF, down: box.top + box.height / HALF }
}

/**
 * Puts a new listbox in the page, in a DOM mode.
 * @param {DomMode} mode - Where it lives
 * @returns {Promise<NumbersListbox>} It, once it has rendered
 */
async function fresh(mode) {
  registerListbox(NONE)
  const element = document.createElement('x-listbox')
  element.setAttribute('dom-mode', mode)
  document.body.append(element)
  await settle()
  return latest()
}

const FIVE_BILLION = 5_000_000_000
const JUMPS = 60
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
 * Has the app scroll a listbox so a position is at the top.
 * @param {NumbersListbox} listbox - The listbox
 * @param {number} position - Where to
 * @returns {void}
 */
function scrollTo({ store, windowed }, position) {
  if (windowed === undefined) {
    throw new Error('The listbox is not windowed')
  }
  store.dispatch({ effects: windowed.scrollTo.of(position) })
}

/**
 * Jumps across all ten billion items, one jump per frame, from jump `step` on.
 * @param {NumbersListbox} listbox - The listbox
 * @param {number} step - Which jump this is
 * @param {number} most - The most options seen so far
 * @returns {Promise<number>} The most seen in all the jumps
 */
async function jumpAround(listbox, step, most) {
  if (step > JUMPS) {
    return most
  }
  scrollTo(listbox, Math.floor((TEN_BILLION / JUMPS) * step) - step)
  await settle()
  return jumpAround(listbox, step + ONE, Math.max(most, seen().options))
}

/**
 * Jumps to five billion, then to the last item, then all over: what showed after the first two, and the most options
 * rendered at once.
 * @param {DomMode} mode - Where the listbox lives
 * @returns {Promise<Readonly<{ fiveBillion: Seen, last: Seen, mostOptions: number }>>} What showed
 */
async function jump(mode) {
  const listbox = await fresh(mode)
  scrollTo(listbox, FIVE_BILLION)
  await settle()
  const fiveBillion = seen()
  scrollTo(listbox, TEN_BILLION)
  await settle()
  const last = seen()
  return { fiveBillion, last, mostOptions: await jumpAround(listbox, ONE, NONE) }
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
  const count = await listbox.chosen.count(listbox.store.state)
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
 * Selects a few items from five billion on as an app would, then deselects the first.
 * @param {NumbersListbox} listbox - The listbox
 * @returns {void}
 */
function selectFromFiveBillion({ chosen, list, store }) {
  const source = store.state.field(list.source)
  const span = spanning(source, FIVE_BILLION, FIVE_BILLION + PRESSED)
  store.dispatch({ effects: chosen.selected.of(toggle(span, source, { id: FIVE_BILLION })) })
}

/**
 * Has the app select a few items from five billion on and deselect the first, then focuses the listbox with nothing
 * active: what shows once focus has gone where it goes.
 * @param {DomMode} mode - Where the listbox lives
 * @returns {Promise<Seen>} What showed
 */
async function focusSelected(mode) {
  selectFromFiveBillion(await fresh(mode))
  await settle()
  parts().viewport.focus()
  await settle()
  await settle()
  return seen()
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
  listbox.store.handle(listbox.list.press.of({ count: ONE, position: NONE, shift: false, toggle: false }))
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
  const option = root.querySelector('[part~="active"]')
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
  listbox.store.handle(listbox.list.press.of({ count: ONE, position: NONE, shift: false, toggle: false }))
  await settle()
  const theme = colors()
  document.documentElement.style.setProperty('--interact-listbox-fill', 'rgb(1, 2, 3)')
  const component = colors()
  document.documentElement.style.setProperty('--interact-listbox-option-fill', 'rgb(4, 5, 6)')
  const part = colors()
  document.querySelector('x-listbox')?.setAttribute('style', '--interact-listbox-option-selected-fill: rgb(7, 8, 9)')
  return { component, instance: colors(), part, theme }
}

const QUARTER = 4
const ROWS = 10
const ROWS_SHORT = 6
const ZOOM = 2
const TALL_ROW = 600
const FRACTIONAL_ROW = 27.3

/**
 * How the view lays its rows out: a row's height in its own CSS pixels, and how many rows are scrollable.
 * @param {HTMLElement} viewport - The scrolling element
 * @returns {Readonly<{ height: number, scrollable: number }>} The layout
 */
function rowsOf(viewport) {
  const option = viewport.querySelector('[role="option"]')
  const gaps = [...viewport.querySelectorAll(':scope > [part~="gap"]')].map((gap) =>
    gap instanceof HTMLElement ? Number(gap.style.getPropertyValue('--interact-gap-rows')) : NONE,
  )
  const shown = viewport.querySelectorAll(':scope > [role="option"]:not([data-offscreen])').length
  return {
    height: option ? pixels(getComputedStyle(option).height) : Number.NaN,
    scrollable: gaps.reduce((all, rows) => all + rows, shown),
  }
}

/**
 * Zooms the page, makes rows tall enough that the default cap would pass every browser's limit on screen, and jumps
 * to five billion: what showed, how many rows are scrollable, and how tall the scrollable area is.
 * @param {DomMode} mode - Where the listbox lives
 * @returns {Promise<Seen & Readonly<{ scrollable: number, scrollHeight: number }>>} What showed
 */
async function zoomedTallRows(mode) {
  document.documentElement.style.zoom = String(ZOOM)
  document.documentElement.style.setProperty('--interact-listbox-row-height', `${String(TALL_ROW)}px`)
  const listbox = await fresh(mode)
  scrollTo(listbox, FIVE_BILLION)
  await settle()
  const { viewport } = parts()
  return { ...seen(), scrollHeight: viewport.scrollHeight, scrollable: rowsOf(viewport).scrollable }
}

/**
 * Gives rows a height that isn't a whole number of pixels and jumps to the last item and to five billion, where the
 * scrollable rows' pixels are near every browser's limit and rounding would show.
 * @param {DomMode} mode - Where the listbox lives
 * @returns {Promise<Readonly<{ last: Seen, fiveBillion: Seen }>>} What showed
 */
async function fractionalRows(mode) {
  document.documentElement.style.setProperty('--interact-listbox-row-height', `${String(FRACTIONAL_ROW)}px`)
  const listbox = await fresh(mode)
  scrollTo(listbox, TEN_BILLION)
  await settle()
  const last = seen()
  scrollTo(listbox, FIVE_BILLION)
  await settle()
  return { fiveBillion: seen(), last }
}

/**
 * A new listbox jumped to five billion, then scrolled natively to a few rows before the point where the next rows
 * down move the offset.
 * @param {DomMode} mode - Where the listbox lives
 * @returns {Promise<Readonly<{ across: number, down: number }>>} Where to put the mouse
 */
async function beforeRecentring(mode) {
  const listbox = await fresh(mode)
  scrollTo(listbox, FIVE_BILLION)
  await settle()
  const { viewport } = parts()
  const { height, scrollable } = rowsOf(viewport)
  const lastKept = scrollable - ROWS - scrollable / QUARTER
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
  scrollTo(listbox, TEN_BILLION - ROWS - ROWS_SHORT)
  await settle()
  return middle()
}

export {
  activeSelectedOutline,
  adoptServerListbox,
  beforeRecentring,
  beforeTheEnd,
  FIVE_BILLION,
  focusAway,
  focusedAndChosen,
  focusSelected,
  fractionalRows,
  jump,
  seen,
  selectAllButOne,
  selectedFills,
  settle,
  tokenLevels,
  zoomedTallRows,
}
