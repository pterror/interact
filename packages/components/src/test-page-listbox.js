/**
 * The listbox in a browser test's page: registering it, finding it, acting on it as a person would, and seeing what
 * it shows.
 * @import { Listbox } from './listbox.js'
 * @import { Numbered, Range } from './test-helpers.js'
 */

import { register } from '@interact/dom'

import { listboxElement } from './listbox-element.js'
import { TEN_BILLION, numbers, tenBillionListbox } from './test-helpers.js'

/**
 * What showed: the first and last fully visible positions, how many options are in the DOM, whether the viewport has
 * focus and its active descendant is there, the active position, the blocks cached, and the scroll position.
 * @typedef {Readonly<{
 *   top: number,
 *   bottom: number,
 *   options: number,
 *   focused: boolean,
 *   activeThere: boolean,
 *   active: number | undefined,
 *   blocks: number,
 *   scrollTop: number,
 * }>} Seen
 */

const ONE = 1
const HALF = 2
const HALF_PIXEL = 0.5

/** @type {Listbox<Numbered, Range>[]} */
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
    return listbox
  })
  register([ListboxElement], { prefix: 'x' })
}

/**
 * The listbox made last.
 * @returns {Listbox<Numbered, Range>} It
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
  const viewport = root.querySelector('[part~="viewport"]')
  if (!(viewport instanceof HTMLElement)) {
    throw new TypeError('The listbox has no viewport')
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
  const listbox = latest()
  return {
    active: listbox.active.get(),
    activeThere: id !== null && root.querySelector(`#${CSS.escape(id)}`) !== null,
    blocks: listbox.items.blocks,
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
 * @param {boolean} [toggle] - Whether the toggle modifier is held
 * @returns {void}
 */
function press(key, toggle = false) {
  parts().viewport.dispatchEvent(
    new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ctrlKey: toggle, key }),
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

export { latest, middle, parts, press, reads, registerListbox, seen, settle }
