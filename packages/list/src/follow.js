/**
 * The dragged item drawn following the pointer, by its `translate`: where it was drawn when the drag began (part-way
 * through settling, if it was), moved as far as the pointer since, however the items under it have moved (scrolled,
 * or others added or taken out). Once the drag ends, it slides from where it was let go to where it is laid out then
 * (the list as drag ends it: reordered, or not), marked `data-settling` while it does. It sets the `translate` of the
 * dragged item's element only, and no other style.
 */

import { translated } from './translated.js'

/** Below this, in pixels, a slide wouldn't show */
const UNSEEN = 0.5

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
 * The facet, and showing it a drag (drag's `showing`)
 * @template K
 * @typedef {Readonly<{
 *   apply: (key: K, element: Element) => void,
 *   watch: (listener: (keys?: readonly K[]) => void) => () => void,
 *   drop: (key: K, element: Element) => void,
 *   show: (at: unknown, motion: Motion<K>) => void,
 * }>} Follow
 */

/**
 * Draws the dragged item where the pointer takes it
 * @template K
 * @param {FollowOptions} options - The one axis it moves along (left out: both), and how long, in ms, it slides into
 *   place when the drag ends (0: it jumps)
 * @returns {Follow<K>} The facet, and showing it a drag
 */
function follow({ axis, duration }) {
  /** @type {Map<K, Element>} */
  const elements = new Map()
  /** @type {Set<(keys?: readonly K[]) => void>} */
  const listeners = new Set()
  /** @type {WeakMap<Element, Animation>} */
  const settling = new WeakMap()
  /** @type {Readonly<{ key: K, x: number, y: number }> | undefined} */
  let moving = undefined
  /** @type {Readonly<{ x: number, y: number }> | undefined} */
  let anchor = undefined
  /** @type {Element | undefined} */
  let moved = undefined
  /** @type {DOMRect | undefined} */
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
   * Stops an element sliding into place
   * @param {Element} element - The element
   * @returns {void}
   */
  const settled = (element) => {
    const animation = settling.get(element)
    settling.delete(element)
    animation?.cancel()
    if (element instanceof HTMLElement || element instanceof SVGElement) {
      delete element.dataset['settling']
    }
  }

  /**
   * Slides an element from where it was drawn to where it is laid out
   * @param {Element} element - The element
   * @param {Readonly<DOMRect>} before - Where it was drawn
   * @returns {void}
   */
  const settle = (element, before) => {
    const after = element.getBoundingClientRect()
    const x = before.left - after.left
    const y = before.top - after.top
    if (duration <= 0 || Math.hypot(x, y) < UNSEEN) {
      return
    }
    const animation = element.animate([{ translate: `${String(x)}px ${String(y)}px` }, { translate: '0px 0px' }], {
      duration,
      easing: 'ease-out',
    })
    settling.set(element, animation)
    if (element instanceof HTMLElement || element instanceof SVGElement) {
      element.dataset['settling'] = ''
    }
    animation.addEventListener('finish', () => {
      if (settling.get(element) === animation) {
        settled(element)
      }
    })
  }

  return {
    apply(key, element) {
      elements.set(key, element)
      if (element instanceof HTMLElement || element instanceof SVGElement) {
        if (moving?.key === key) {
          element.style.translate = `${String(moving.x)}px ${String(moving.y)}px`
          moved = element
        } else if (moved === element) {
          element.style.translate = ''
          moved = undefined
        }
      }
    },
    drop(key, element) {
      if (elements.get(key) === element) {
        elements.delete(key)
      }
      settled(element)
      if (moved === element && (element instanceof HTMLElement || element instanceof SVGElement)) {
        element.style.translate = ''
        moved = undefined
      }
    },
    show(_at, { from, key, phase, point }) {
      const element = elements.get(key)
      if (phase === 'moving') {
        if (element === undefined) {
          moving = { key, x: 0, y: 0 }
          return
        }
        if (anchor === undefined) {
          const drawn = element.getBoundingClientRect()
          anchor = { x: drawn.left, y: drawn.top }
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
        moving = undefined
        anchor = undefined
        if (moved instanceof HTMLElement || moved instanceof SVGElement) {
          moved.style.translate = ''
          moved = undefined
        }
        changed(key)
        const before = letGo
        letGo = undefined
        if (element !== undefined && before !== undefined) {
          settle(element, before)
        }
      } else {
        letGo = element?.getBoundingClientRect()
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
