/**
 * Room made where a drag would land: the items between the dragged item's place and where it would land drawn moved
 * one place, by their `translate`, towards the place it leaves, sliding there. Dropped or cancelled, they stay drawn
 * where they are until the drag ends, then slide from there to where they are laid out: nowhere, if the reorder put
 * them where they were drawn; back, if it was refused or never came. It sets the `translate` of items other than the
 * dragged one, and no other style.
 *
 * One place is the distance from the dragged item's start to the next item's (to the previous item's end from its
 * own end, for the last), measured where they are laid out when the drag begins, and again when the dragged item's
 * rank changes under it.
 */

import { laidOut, translated } from './translated.js'

/** Below this, in pixels, a slide wouldn't show */
const UNSEEN = 0.5

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
 * @typedef {Readonly<{ axis: 'x' | 'y', rank: (key: K) => number | undefined, duration: number }>} MakeRoomOptions
 */

/**
 * The facet, and showing it a drag (drag's `showing`)
 * @template K
 * @typedef {Readonly<{
 *   apply: (key: K, element: Element) => void,
 *   watch: (listener: (keys?: readonly K[]) => void) => () => void,
 *   drop: (key: K, element: Element) => void,
 *   show: (at: Dragging<K> | undefined, motion: Motion<K>) => void,
 * }>} MakeRoom
 */

/**
 * Moves aside the items a drag would pass
 * @template K
 * @param {MakeRoomOptions<K>} options - Which way the items run, across (`x`) or down (`y`); each key's rank, at
 *   once; and how long, in ms, items slide (0: they jump)
 * @returns {MakeRoom<K>} The facet, and showing it a drag
 */
function makeRoom({ axis, duration, rank }) {
  /** @type {Map<K, Element>} */
  const elements = new Map()
  /** @type {Set<(keys?: readonly K[]) => void>} */
  const listeners = new Set()
  /** @type {WeakMap<Element, number>} */
  const shifted = new WeakMap()
  /** @type {WeakMap<Element, Animation>} */
  const sliding = new WeakMap()
  /** @type {Readonly<{ key: K, from: number | undefined, step: number, at: Dragging<K> | undefined }> | undefined} */
  let drag = undefined
  /** @type {Map<Element, DOMRect>} */
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
    const own = rank(key)
    const target = rank(at.target)
    const from = rank(drag.key)
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
      const at = rank(other)
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
   * Slides an element from where it was drawn to where it is laid out
   * @param {Element} element - The element
   * @param {Readonly<DOMRect>} before - Where it was drawn
   * @returns {void}
   */
  const slideIn = (element, before) => {
    const after = element.getBoundingClientRect()
    const by = axis === 'x' ? before.left - after.left : before.top - after.top
    if (duration > 0 && Math.abs(by) >= UNSEEN) {
      const start = axis === 'x' ? `${String(by)}px 0px` : `0px ${String(by)}px`
      sliding.set(
        element,
        element.animate([{ translate: start }, { translate: '0px 0px' }], { duration, easing: 'ease-out' }),
      )
    }
  }

  return {
    apply(key, element) {
      elements.set(key, element)
      const shift = shiftOf(key)
      const was = shifted.get(element) ?? 0
      if (shift === was || !(element instanceof HTMLElement || element instanceof SVGElement)) {
        return
      }
      const drawn = translated(element)[axis]
      sliding.get(element)?.cancel()
      element.style.translate = shift === 0 ? '' : axis === 'x' ? `${String(shift)}px 0px` : `0px ${String(shift)}px`
      shifted.set(element, shift)
      if (duration > 0 && Math.abs(drawn - shift) >= UNSEEN) {
        const start = axis === 'x' ? `${String(drawn)}px 0px` : `0px ${String(drawn)}px`
        const end = axis === 'x' ? `${String(shift)}px 0px` : `0px ${String(shift)}px`
        sliding.set(
          element,
          element.animate([{ translate: start }, { translate: end }], { duration, easing: 'ease-out' }),
        )
      }
    },
    drop(key, element) {
      if (elements.get(key) === element) {
        elements.delete(key)
      }
      if (shifted.has(element) && (element instanceof HTMLElement || element instanceof SVGElement)) {
        sliding.get(element)?.cancel()
        element.style.translate = ''
        shifted.delete(element)
      }
    },
    show(at, { key, phase }) {
      if (phase === 'moving') {
        const from = rank(key)
        const step = drag?.key === key && drag.from === from ? drag.step : from === undefined ? 0 : stepOf(key, from)
        drag = { at, from, key, step }
        report()
      } else if (phase === 'ended') {
        drag = undefined
        for (const [element, before] of letGo) {
          if (element instanceof HTMLElement || element instanceof SVGElement) {
            sliding.get(element)?.cancel()
            element.style.translate = ''
            shifted.delete(element)
            slideIn(element, before)
          }
        }
        letGo.clear()
        report()
      } else {
        for (const element of elements.values()) {
          if ((shifted.get(element) ?? 0) !== 0) {
            letGo.set(element, element.getBoundingClientRect())
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
