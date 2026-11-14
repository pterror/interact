/**
 * The dragged item drawn following the pointer, by its `translate`, from where it was drawn when the drag began; and,
 * once the drag ends, sliding from where it was let go to where it is laid out then (after a drop's reorder). It sets
 * the `translate` of the dragged item's element only, and no other style.
 */

import { translated } from './translated.js'

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
  /** @type {Readonly<{ x: number, y: number }>} */
  let grabbed = { x: 0, y: 0 }
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
      if (moved === element && (element instanceof HTMLElement || element instanceof SVGElement)) {
        element.style.translate = ''
        moved = undefined
      }
    },
    show(_at, { from, key, phase, point }) {
      const element = elements.get(key)
      if (phase === 'moving') {
        if (moving === undefined) {
          grabbed = element === undefined ? { x: 0, y: 0 } : translated(element)
          if (element !== undefined) {
            settling.get(element)?.cancel()
          }
        }
        moving = {
          key,
          x: axis === 'y' ? 0 : grabbed.x + point.x - from.x,
          y: axis === 'x' ? 0 : grabbed.y + point.y - from.y,
        }
        changed(key)
      } else if (phase === 'ended') {
        moving = undefined
        if (moved instanceof HTMLElement || moved instanceof SVGElement) {
          moved.style.translate = ''
          moved = undefined
        }
        changed(key)
        const before = letGo
        letGo = undefined
        if (element === undefined || before === undefined || duration <= 0) {
          return
        }
        const after = element.getBoundingClientRect()
        const x = before.left - after.left
        const y = before.top - after.top
        if (x !== 0 || y !== 0) {
          const animation = element.animate(
            [{ translate: `${String(x)}px ${String(y)}px` }, { translate: '0px 0px' }],
            { duration, easing: 'ease-out' },
          )
          settling.set(element, animation)
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
