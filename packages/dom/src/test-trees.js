/**
 * Pages for the flat-tree, tabbable and inside-layer browser tests: a host with a shadow root, a slot, and content
 * assigned to it, and what each module says about them.
 */

import { deepActiveElement, flatChildren, flatContains } from './flat-tree.js'
import { happenedIn, onScrollbar } from './inside-layer.js'
import { tabWraps, tabbables } from './tabbable.js'

const HALF = 2
const FIRST = 0
const SECOND = 1
const LAST = -1

/**
 * A host whose shadow root holds a button and a slot, with a light child assigned to the slot; and an outside button.
 * @returns {Readonly<{ host: HTMLElement, inner: HTMLElement, slot: HTMLSlotElement, slotted: HTMLElement, outside: HTMLElement }>}
 *   The parts
 */
function slottedHost() {
  const host = document.createElement('div')
  const slotted = button('slotted')
  host.append(slotted)
  const inner = button('inner')
  const slot = document.createElement('slot')
  host.attachShadow({ mode: 'open' }).append(inner, slot)
  const outside = button('outside')
  document.body.append(host, outside)
  return { host, inner, outside, slot, slotted }
}

/**
 * A button with some text.
 * @param {string} text - Its text
 * @returns {HTMLButtonElement} The button
 */
function button(text) {
  const made = document.createElement('button')
  made.textContent = text
  return made
}

/**
 * What the flat tree says about a slotted host.
 * @returns {Readonly<{ hostHasInner: boolean, hostHasSlotted: boolean, slotHasSlotted: boolean, hostHasOutside: boolean, children: string[], slotChildren: string[], deep: string }>}
 *   Its answers
 */
function flatTree() {
  const { host, inner, outside, slot, slotted } = slottedHost()
  inner.focus()
  return {
    children: flatChildren(host).map((child) => child.tagName.toLowerCase()),
    deep: deepActiveElement(document)?.textContent ?? 'nowhere',
    hostHasInner: flatContains(host, inner),
    hostHasOutside: flatContains(host, outside),
    hostHasSlotted: flatContains(host, slotted),
    slotChildren: flatChildren(slot).map((child) => child.textContent),
    slotHasSlotted: flatContains(slot, slotted),
  }
}

/**
 * The Tab stops in a container: buttons in and out of shadow roots and slots, one disabled, one hidden, one inert, a
 * positive `tabindex`, and a radio group with one checked.
 * @returns {Readonly<{ stops: string[], wrapsAtEnd: boolean, wrapsInMiddle: boolean, wrapsBackAtStart: boolean }>}
 *   The stops' text in order, and whether Tab goes round at the edges
 */
function tabStops() {
  const container = document.createElement('div')
  container.innerHTML = `<button>a</button><button disabled>no</button><button hidden>no</button>
    <div inert><button>no</button></div><button tabindex="2">first</button>
    <input type="radio" name="r" value="r1" aria-label="r1"><input type="radio" name="r" value="r2" aria-label="r2" checked>`
  document.body.append(container)
  const { host } = slottedHost()
  container.append(host)
  const stops = tabbables(container)
  return {
    stops: stops.map((stop) => (stop.textContent === '' ? (stop.getAttribute('value') ?? '') : stop.textContent)),
    wrapsAtEnd: tabWraps(stops, stops.at(LAST), false),
    wrapsBackAtStart: tabWraps(stops, stops.at(FIRST), true),
    wrapsInMiddle: tabWraps(stops, stops.at(SECOND), false),
  }
}

/**
 * Presses dispatched at a layer's parts, inside a shadow root, and outside: which count as inside it.
 * @returns {Readonly<{ element: boolean, inShadow: boolean, anchor: boolean, outside: boolean }>} Whether each did
 */
function insideLayer() {
  const { host, inner, outside: anchor } = slottedHost()
  const away = document.createElement('button')
  document.body.append(away)
  /** @type {boolean[]} */
  const seen = []
  const parts = { anchor: () => anchor, element: host }
  document.addEventListener(
    'pointerdown',
    (event) => {
      seen.push(happenedIn(event, parts))
    },
    { capture: true },
  )
  for (const target of [host, inner, anchor, away]) {
    target.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }))
  }
  const [element = false, inShadow = false, onAnchor = false, outside = true] = seen
  return { anchor: onAnchor, element, inShadow, outside }
}

/**
 * A scrolling box, and whether presses on its scrollbar and inside it count as on its scrollbar.
 * @returns {Readonly<{ gutter: number, onBar: boolean, inside: boolean }>} The scrollbar's width, and the answers
 */
function scrollbar() {
  const box = scrollingBox()
  const gutter = box.offsetWidth - box.clientWidth
  return {
    gutter,
    inside: pressedOnScrollbar(box, box.clientWidth / HALF),
    onBar: pressedOnScrollbar(box, box.clientWidth + gutter / HALF),
  }
}

/**
 * A box that scrolls, with a scrollbar that takes room where the engine can be made to show one: `::-webkit-scrollbar`
 * in WebKit, `scrollbar-gutter` in Chrome.
 * @returns {HTMLElement} The box, in the page
 */
function scrollingBox() {
  document.head.insertAdjacentHTML(
    'beforeend',
    '<style>.scrolling::-webkit-scrollbar { width: 12px; height: 12px }</style>',
  )
  const box = document.createElement('div')
  box.className = 'scrolling'
  box.style.cssText = 'position: absolute; left: 0; top: 0; inline-size: 200px; block-size: 100px; overflow: scroll'
  box.innerHTML = '<div style="block-size: 400px"></div>'
  document.body.append(box)
  if (box.offsetWidth === box.clientWidth) {
    box.style.scrollbarGutter = 'stable'
    box.style.scrollbarWidth = 'thin'
  }
  return box
}

/**
 * Presses a box at a point across it, halfway down, and asks whether the press was on its scrollbar.
 * @param {HTMLElement} box - The box
 * @param {number} across - Where across it, in pixels from its left edge
 * @returns {boolean} Whether the press was on its scrollbar
 */
function pressedOnScrollbar(box, across) {
  /** @type {boolean[]} */
  const seen = []
  box.addEventListener(
    'pointerdown',
    (event) => {
      seen.push(onScrollbar(event))
    },
    { once: true },
  )
  const down = box.clientHeight / HALF
  box.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: across, clientY: down, composed: true }))
  return seen.at(FIRST) ?? false
}

export { flatTree, insideLayer, scrollbar, tabStops }
