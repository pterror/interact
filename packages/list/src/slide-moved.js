/**
 * Items slid to their new place when the drawn keys change: an item that a reorder, an insertion or a removal moves
 * is drawn where it was and slides to where it is laid out now, instead of jumping there. A change during a slide
 * slides on from where the item is drawn. It animates `translate` with Web Animations and sets no style.
 *
 * Places are where items are laid out in their parent (their rect less their `translate`, from the parent's content
 * box's start, scrolled or not), kept from the last change, and again whenever the parent or an item is resized, so a
 * resize alone slides nothing. An item something else draws by its `translate` (a drag's facets) is left to it: one
 * with an inline `translate`, one whose inline `translate` was written in this frame (taken off just as the change
 * came), or one with an animation other than this one's running.
 */
import { translated } from './translated.js'

/**
 * Hearing the drawn keys change
 * @typedef {Readonly<{ watch: (listener: () => void) => () => void }>} Drawn
 */

/**
 * @typedef {Readonly<{ drawn: Drawn, duration: number }>} SlideMovedOptions
 */

/**
 * The facet
 * @template K
 * @typedef {Readonly<{
 *   apply: (key: K, element: Element) => void,
 *   watch: (listener: (keys?: readonly K[]) => void) => () => void,
 *   drop: (key: K, element: Element) => void,
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
 * Whether a `style` attribute's text sets `translate`
 * @param {string | null} style - The text
 * @returns {boolean} Whether it does
 */
const setsTranslate = (style) => style !== null && /(?<start>^|;)\s*translate\s*:/u.test(style)

/**
 * Slides items moved by a change to the drawn keys
 * @template K
 * @param {SlideMovedOptions} options - Hearing the drawn keys change (the change is looked at once every listener has
 *   heard, so render has drawn it); and how long, in ms, a slide takes (0: items jump, which an app passes for reduced
 *   motion)
 * @returns {SlideMoved<K>} The facet; it reports no keys, and hears the drawn keys while it is watched
 */
function slideMoved({ drawn, duration }) {
  /** @type {Map<K, Element>} */
  const elements = new Map()
  /** @type {WeakMap<Element, Readonly<{ x: number, y: number }>>} */
  const places = new WeakMap()
  /** @type {WeakMap<Element, Animation>} */
  const slides = new WeakMap()
  /** @type {WeakSet<Element>} */
  let written = new WeakSet()
  let clearing = false

  const forget = () => {
    written = new WeakSet()
    clearing = false
  }

  /**
   * @param {readonly MutationRecord[]} records - Changes to items' `style`
   * @returns {void}
   */
  const note = (records) => {
    for (const record of records) {
      if (
        record.target instanceof Element &&
        (setsTranslate(record.oldValue) || setsTranslate(record.target.getAttribute('style')))
      ) {
        written.add(record.target)
        if (!clearing && typeof requestAnimationFrame === 'function') {
          clearing = true
          requestAnimationFrame(forget)
        }
      }
    }
  }
  const styles = typeof MutationObserver === 'function' ? new MutationObserver(note) : undefined

  const keep = () => {
    for (const element of elements.values()) {
      places.set(element, placeOf(element))
    }
  }
  const resized = typeof ResizeObserver === 'function' ? new ResizeObserver(keep) : undefined

  const changed = () => {
    queueMicrotask(() => {
      if (styles !== undefined) {
        note(styles.takeRecords())
      }
      for (const element of elements.values()) {
        resized?.observe(element.parentElement ?? element)
        const was = places.get(element)
        const now = placeOf(element)
        places.set(element, now)
        if (
          was === undefined ||
          duration <= 0 ||
          written.has(element) ||
          setsTranslate(element.getAttribute('style')) ||
          !(element instanceof HTMLElement || element instanceof SVGElement)
        ) {
          continue
        }
        const mine = slides.get(element)
        const others = element
          .getAnimations()
          .some(
            (/** @type {Readonly<Animation>} */ animation) => animation !== mine && animation.playState === 'running',
          )
        if (others) {
          continue
        }
        const drawnBy = translated(element)
        const x = was.x + drawnBy.x - now.x
        const y = was.y + drawnBy.y - now.y
        if (Math.abs(x) < 0.5 && Math.abs(y) < 0.5) {
          continue
        }
        mine?.cancel()
        slides.set(
          element,
          element.animate([{ translate: `${String(x)}px ${String(y)}px` }, { translate: '0px 0px' }], {
            duration,
            easing: 'ease-out',
          }),
        )
      }
    })
  }

  return {
    apply(key, element) {
      if (elements.get(key) === element) {
        return
      }
      elements.set(key, element)
      places.set(element, placeOf(element))
      styles?.observe(element, { attributeFilter: ['style'], attributeOldValue: true, attributes: true })
      resized?.observe(element)
    },
    drop(key, element) {
      if (elements.get(key) === element) {
        elements.delete(key)
      }
      slides.get(element)?.cancel()
      slides.delete(element)
      resized?.unobserve(element)
    },
    watch() {
      return drawn.watch(changed)
    },
  }
}

export { slideMoved }
