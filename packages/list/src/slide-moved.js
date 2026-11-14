/**
 * Items slid to their new place when the drawn keys change: an item that a reorder, an insertion or a removal moves
 * is drawn where it was and slides to where it is laid out now, instead of jumping there. A change during a slide
 * slides on from where the item is drawn. It animates `translate` with Web Animations and sets no style.
 *
 * Places are where items are laid out in their parent (their rect less their `translate`, from the parent's content
 * box's start, scrolled or not), kept from the last change, and again whenever the parent or an item is resized, so a
 * resize alone slides nothing. The items `leave` names (those a drag's facets draw) are left to what draws them.
 */

import { drawnAt, slide, stopSlide } from './slide.js'
import { translated } from './translated.js'

/**
 * Hearing the drawn keys change
 * @typedef {Readonly<{ watch: (listener: () => void) => () => void }>} Drawn
 */

/**
 * The keys something else draws by their `translate` now
 * @template K
 * @typedef {Readonly<{ has: (key: K) => boolean }>} Leave
 */

/**
 * @template K
 * @typedef {Readonly<{ drawn: Drawn, duration: number, leave?: Leave<K> }>} SlideMovedOptions
 */

/**
 * The facet, and stopping
 * @template K
 * @typedef {Readonly<{
 *   apply: (key: K, element: Element) => void,
 *   watch: (listener: (keys?: readonly K[]) => void) => () => void,
 *   drop: (key: K, element: Element) => void,
 *   stop: () => void,
 * }>} SlideMoved
 */

/**
 * Where an element is laid out in its parent
 * @param {Element} element - The element
 * @returns {Readonly<{ x: number, y: number }>} Across and down from the parent's start, in CSS pixels
 */
function placeOf(element) {
  const rect = element.getBoundingClientRect()
  const by = translated(element)
  const parent = element.parentElement
  const origin = parent?.getBoundingClientRect()
  return {
    x: rect.left - by.x - (origin?.left ?? 0) + (parent?.scrollLeft ?? 0),
    y: rect.top - by.y - (origin?.top ?? 0) + (parent?.scrollTop ?? 0),
  }
}

/**
 * Slides items moved by a change to the drawn keys
 * @template K
 * @param {SlideMovedOptions<K>} options - Hearing the drawn keys change (the change is looked at once every listener
 *   has heard, so render has drawn it); how long, in ms, a slide takes (0: items jump, which an app passes for reduced
 *   motion); and the keys to leave alone when a change comes (left out: none)
 * @returns {SlideMoved<K>} The facet, which reports no keys; and stopping, after which no change slides anything
 */
function slideMoved({ drawn, duration, leave }) {
  /** @type {Map<K, Element>} */
  const elements = new Map()
  /** @type {WeakMap<Element, Readonly<{ x: number, y: number }>>} */
  const places = new WeakMap()
  /** @type {WeakMap<Element, Animation>} */
  const slides = new WeakMap()

  const keep = () => {
    for (const element of elements.values()) {
      places.set(element, placeOf(element))
    }
  }
  const resized = typeof ResizeObserver === 'function' ? new ResizeObserver(keep) : undefined

  const look = () => {
    for (const [key, element] of elements) {
      resized?.observe(element.parentElement ?? element)
      const was = places.get(element)
      const now = placeOf(element)
      places.set(element, now)
      if (was === undefined || duration <= 0 || leave?.has(key) === true) {
        continue
      }
      const at = drawnAt(element)
      const animation = slide(element, { x: at.x + was.x - now.x, y: at.y + was.y - now.y }, duration)
      if (animation !== undefined) {
        slides.set(element, animation)
      }
    }
  }

  const stopHearing = drawn.watch(() => {
    queueMicrotask(look)
  })

  return {
    apply(key, element) {
      if (elements.get(key) === element) {
        return
      }
      elements.set(key, element)
      places.set(element, placeOf(element))
      resized?.observe(element)
    },
    drop(key, element) {
      if (elements.get(key) === element) {
        elements.delete(key)
      }
      if (slides.has(element)) {
        stopSlide(element)
        slides.delete(element)
      }
      resized?.unobserve(element)
    },
    stop() {
      stopHearing()
      resized?.disconnect()
    },
    watch() {
      return () => undefined
    },
  }
}

export { slideMoved }
