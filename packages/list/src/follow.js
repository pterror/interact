/**
 * The dragged item drawn following the pointer, by its `translate`: where it was drawn when the drag began (part-way
 * through a slide, if it was), moved as far as the pointer since, however the items under it have moved (scrolled,
 * or others added or taken out). Once the drag ends, dropped or cancelled, it slides from where it was let go to where
 * it is laid out then (the list as drag ends it: reordered, or not, so a cancelled drag slides back to where it
 * started), marked `data-settling` while it does. It sets the `translate` of the dragged item's element only, and no
 * other style.
 */

import { drawnAt, slide, sliding, stopSlide } from './slide.js'
import { translated } from './translated.js'

/**
 * Where a drag would land, as drag shows it
 * @template K
 * @typedef {Readonly<{ key: K, target: K, after: boolean }>} Dragging
 */

/**
 * A drag's pointer and how it stands, as drag shows it
 * @template K
 * @typedef {Readonly<{ key: K, from: Readonly<{ x: number, y: number }>, point: Readonly<{ x: number, y: number }>,
 *   phase: 'moving' | 'dropped' | 'cancelled' | 'ended' }>} Motion
 */

/**
 * @typedef {Readonly<{ axis?: 'x' | 'y', duration: number }>} FollowOptions
 */

/**
 * The facet; showing it a drag (drag's `showing`); and whether it draws a key's `translate` now
 * @template K
 * @typedef {Readonly<{
 *   apply: (key: K, element: Element) => void,
 *   watch: (listener: (keys?: readonly K[]) => void) => () => void,
 *   drop: (key: K, element: Element) => void,
 *   showing: (at: Dragging<K> | undefined, motion: Motion<K>) => void,
 *   has: (key: K) => boolean,
 * }>} Follow
 */

/**
 * @param {Element} element - The element
 * @param {string} translate - Its `translate`, or `''` for none
 * @returns {void}
 */
function write(element, translate) {
  if (element instanceof HTMLElement || element instanceof SVGElement) {
    element.style.translate = translate
  }
}

/**
 * Draws the dragged item where the pointer takes it
 * @template K
 * @param {FollowOptions} options - The one axis it moves along (left out: both), and how long, in ms, it slides into
 *   place when the drag ends (0: it jumps)
 * @returns {Follow<K>} The facet, showing it a drag, and whether it draws a key: from the drag's first move until
 *   its slide into place is over
 */
function follow({ axis, duration }) {
  /** @type {Map<K, Element>} */
  const elements = new Map()
  /** @type {Set<(keys?: readonly K[]) => void>} */
  const listeners = new Set()
  /** @type {WeakMap<Element, Animation>} */
  const settling = new WeakMap()
  /** @type {K | undefined} */
  let dragged = undefined
  /** @type {Readonly<{ key: K, x: number, y: number }> | undefined} */
  let moving = undefined
  /** @type {Readonly<{ x: number, y: number }> | undefined} */
  let anchor = undefined
  /** @type {Element | undefined} */
  let moved = undefined
  /** @type {Readonly<{ x: number, y: number }> | undefined} */
  let letGo = undefined

  /**
   * @param {K} key - The key whose element changed
   * @returns {void}
   */
  const changed = (key) => {
    for (const listener of listeners) {
      listener([key])
    }
  }

  /**
   * Stops an element sliding into place, and unmarks it
   * @param {Element} element - The element
   * @returns {void}
   */
  const settled = (element) => {
    settling.delete(element)
    stopSlide(element)
    if (element instanceof HTMLElement || element instanceof SVGElement) {
      delete element.dataset['settling']
    }
  }

  /**
   * Slides an element from where it was let go to where it is laid out, marked while it does
   * @param {Element} element - The element
   * @param {Readonly<{ x: number, y: number }>} from - Where it was let go
   * @returns {void}
   */
  const settle = (element, from) => {
    const animation = slide(element, from, duration)
    if (animation === undefined) {
      return
    }
    settling.set(element, animation)
    if (element instanceof HTMLElement || element instanceof SVGElement) {
      element.dataset['settling'] = ''
    }
    const done = () => {
      if (settling.get(element) === animation) {
        settled(element)
      }
    }
    animation.addEventListener('finish', done)
    animation.addEventListener('cancel', done)
  }

  return {
    apply(key, element) {
      elements.set(key, element)
      if (moving?.key === key) {
        write(element, `${String(moving.x)}px ${String(moving.y)}px`)
        moved = element
      } else if (moved === element) {
        write(element, '')
        moved = undefined
      }
    },
    drop(key, element) {
      if (elements.get(key) === element) {
        elements.delete(key)
      }
      settled(element)
      if (moved === element) {
        write(element, '')
        moved = undefined
      }
    },
    has(key) {
      if (key === dragged) {
        return true
      }
      const element = elements.get(key)
      return element !== undefined && sliding(settling.get(element))
    },
    showing(_at, { from, key, phase, point }) {
      const element = elements.get(key)
      if (phase === 'moving') {
        dragged = key
        if (element === undefined) {
          moving = { key, x: 0, y: 0 }
          return
        }
        if (anchor === undefined) {
          anchor = drawnAt(element)
          settled(element)
        }
        const rect = element.getBoundingClientRect()
        const by = translated(element)
        moving = {
          key,
          x: axis === 'y' ? 0 : anchor.x + point.x - from.x - (rect.left - by.x),
          y: axis === 'x' ? 0 : anchor.y + point.y - from.y - (rect.top - by.y),
        }
        changed(key)
      } else if (phase === 'ended') {
        dragged = undefined
        moving = undefined
        anchor = undefined
        if (moved !== undefined) {
          write(moved, '')
          moved = undefined
        }
        changed(key)
        const before = letGo
        letGo = undefined
        if (element !== undefined && before !== undefined) {
          settle(element, before)
        }
      } else {
        letGo = element === undefined ? undefined : drawnAt(element)
      }
    },
    watch(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

export { follow }
