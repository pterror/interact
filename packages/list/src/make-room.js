/**
 * Room made where a drag would land: the items between the dragged item's place and where it would land drawn moved
 * one place, by their `translate`, towards the place it leaves, sliding there. Dropped or cancelled, they stay drawn
 * where they are until the drag ends, then slide from there to where they are laid out: nowhere, if the reorder put
 * them where they were drawn; back, if it was refused or the drag cancelled. It sets the `translate` of items other
 * than the dragged one, and no other style.
 *
 * One place is the distance from the dragged item's start to the next item's (to the previous item's end from its
 * own end, for the last), measured where they are laid out when the drag begins, and again when the dragged item's
 * rank changes under it.
 */

import { drawnAt, slide, sliding } from './slide.js'
import { laidOut } from './translated.js'

/**
 * Where a drag would land, as drag shows it
 * @template K
 * @typedef {Readonly<{ key: K, target: K, after: boolean }>} Dragging
 */

/**
 * A drag's key and how it stands, as drag shows it
 * @template K
 * @typedef {Readonly<{ key: K, phase: 'moving' | 'dropped' | 'cancelled' | 'ended' }>} Motion
 */

/**
 * @template K
 * @typedef {Readonly<{
 *   axis: 'x' | 'y',
 *   rank: Readonly<{ rank: (key: K) => number | undefined }>,
 *   duration: number,
 * }>} MakeRoomOptions
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
 * }>} MakeRoom
 */

/**
 * Moves aside the items a drag would pass
 * @template K
 * @param {MakeRoomOptions<K>} options - Which way the items run, across (`x`) or down (`y`); each key's rank, at
 *   once; and how long, in ms, items slide (0: they jump)
 * @returns {MakeRoom<K>} The facet, showing it a drag, and whether it draws a key: while the key is moved aside, or
 *   held through a drop, or sliding
 */
function makeRoom({ axis, duration, rank }) {
  /** @type {Map<K, Element>} */
  const elements = new Map()
  /** @type {Set<(keys?: readonly K[]) => void>} */
  const listeners = new Set()
  /** @type {WeakMap<Element, number>} */
  const shifted = new WeakMap()
  /** @type {WeakMap<Element, Animation>} */
  const slides = new WeakMap()
  /** @type {Readonly<{ key: K, from: number | undefined, step: number, at: Dragging<K> | undefined }> | undefined} */
  let drag = undefined
  /** @type {Map<Element, Readonly<{ x: number, y: number }>>} */
  const letGo = new Map()

  /**
   * How far a key's element is drawn from where it is laid out, for the drag as it stands
   * @param {K} key - The key
   * @returns {number} Pixels along the axis
   */
  const shiftOf = (key) => {
    const at = drag?.at
    if (drag === undefined || at === undefined || key === drag.key) {
      return 0
    }
    const own = rank.rank(key)
    const target = rank.rank(at.target)
    const from = rank.rank(drag.key)
    if (own === undefined || target === undefined || from === undefined) {
      return 0
    }
    const { step } = drag
    let to = at.after ? target + 1 : target
    if (target > from) {
      to -= 1
    }
    if (from < own && own <= to) {
      return -step
    }
    if (to <= own && own < from) {
      return step
    }
    return 0
  }

  /**
   * Reports the keys whose element is drawn other than the drag now has it
   * @returns {void}
   */
  const report = () => {
    /** @type {K[]} */
    const keys = []
    for (const [key, element] of elements) {
      if (shiftOf(key) !== (shifted.get(element) ?? 0)) {
        keys.push(key)
      }
    }
    if (keys.length > 0) {
      for (const listener of listeners) {
        listener(keys)
      }
    }
  }

  /**
   * One place, measured where the items are laid out
   * @param {K} key - The dragged key
   * @param {number} from - Its rank
   * @returns {number} Pixels along the axis
   */
  const stepOf = (key, from) => {
    const element = elements.get(key)
    if (element === undefined) {
      return 0
    }
    /** @type {Element | undefined} */
    let next = undefined
    /** @type {Element | undefined} */
    let previous = undefined
    for (const [other, each] of elements) {
      const at = rank.rank(other)
      if (at === from + 1) {
        next = each
      } else if (at === from - 1) {
        previous = each
      }
    }
    const own = laidOut(element, axis)
    if (next !== undefined) {
      return laidOut(next, axis).start - own.start
    }
    if (previous !== undefined) {
      const before = laidOut(previous, axis)
      return own.start + own.size - (before.start + before.size)
    }
    return own.size
  }

  /**
   * Draws an element moved by `shift`, sliding there from where it is drawn
   * @param {Element} element - The element
   * @param {number} by - Pixels along the axis
   * @returns {void}
   */
  const moveAside = (element, by) => {
    if (!(element instanceof HTMLElement || element instanceof SVGElement)) {
      return
    }
    const from = drawnAt(element)
    element.style.translate = by === 0 ? '' : axis === 'x' ? `${String(by)}px 0px` : `0px ${String(by)}px`
    if (by === 0) {
      shifted.delete(element)
    } else {
      shifted.set(element, by)
    }
    const animation = slide(element, from, duration)
    if (animation === undefined) {
      slides.delete(element)
    } else {
      slides.set(element, animation)
    }
  }

  return {
    apply(key, element) {
      elements.set(key, element)
      const now = shiftOf(key)
      if (now !== (shifted.get(element) ?? 0) && !letGo.has(element)) {
        moveAside(element, now)
      }
    },
    drop(key, element) {
      if (elements.get(key) === element) {
        elements.delete(key)
      }
      letGo.delete(element)
      slides.get(element)?.cancel()
      slides.delete(element)
      if (shifted.has(element) && (element instanceof HTMLElement || element instanceof SVGElement)) {
        element.style.translate = ''
        shifted.delete(element)
      }
    },
    has(key) {
      const element = elements.get(key)
      return (
        element !== undefined &&
        ((shifted.get(element) ?? 0) !== 0 || letGo.has(element) || sliding(slides.get(element)))
      )
    },
    showing(at, { key, phase }) {
      if (phase === 'moving') {
        const from = rank.rank(key)
        const step = drag?.key === key && drag.from === from ? drag.step : from === undefined ? 0 : stepOf(key, from)
        drag = { at, from, key, step }
        report()
      } else if (phase === 'ended') {
        drag = undefined
        const held = [...letGo]
        letGo.clear()
        for (const [element, before] of held) {
          if (element instanceof HTMLElement || element instanceof SVGElement) {
            element.style.translate = ''
            shifted.delete(element)
            const animation = slide(element, before, duration)
            if (animation !== undefined) {
              slides.set(element, animation)
            }
          }
        }
        report()
      } else {
        for (const element of elements.values()) {
          if ((shifted.get(element) ?? 0) !== 0) {
            letGo.set(element, drawnAt(element))
          }
        }
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

export { makeRoom }
