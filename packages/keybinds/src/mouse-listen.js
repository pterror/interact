/**
 * The mouse as presses: a button going down is a press known by its name ("click", "middle", "back"), and its coming
 * up ends it. A button let go where the page doesn't see it is released by the next mouse event, which says which
 * buttons are down. A side button whose press or release a handler took doesn't navigate. With `wheel`, scrolling is
 * steps: a press per notch, or per `step` px of a trackpad's small deltas; the page holds still during a bound
 * gesture, and a pause of `idle` ms ends it. A step no handler takes gives the rest of the gesture to the page.
 */

import { eventModifiers, modifierPrefix } from './modifiers.js'
import { mouseName } from './mouse-parse.js'

/**
 * @typedef {Readonly<{ ctrl: boolean, alt: boolean, shift: boolean, meta: boolean }>} Modifiers
 */

/**
 * @typedef {Readonly<{ exact: readonly string[], bare: readonly string[], mods: Modifiers }>} Query
 */

/**
 * @typedef {Readonly<{ id: string, query: Query, event: Event, typing: boolean, repeat: boolean }>} Press
 */

/**
 * @typedef {Readonly<{ id: string, event: Event, typing: boolean, blocked: boolean }>} Release
 */

/**
 * Where presses go; `down` gives what took the press, or undefined
 * @typedef {Readonly<{ down: (press: Press) => unknown, up: (release: Release) => void }>} Sink
 */

/**
 * Whether a scroll has a binding that applies now; how many px are a step (default 50); and the pause that ends a
 * gesture, in ms (default 200)
 * @typedef {Readonly<{ bound: (query: Query) => boolean, step?: number, idle?: number }>} WheelOptions
 */

/**
 * @typedef {Readonly<{
 *   target: EventTarget,
 *   to: Sink,
 *   capture?: boolean,
 *   blocked?: (event: Event) => boolean,
 *   wheel?: WheelOptions,
 * }>} MouseListenOptions
 */

/** @typedef {{ amount: number, last: number, ours: boolean }} Gesture */

/** Buttons by `MouseEvent.button` */
const BUTTONS = ['click', 'middle', 'right', 'back', 'forward']

/** Buttons by their bit in `MouseEvent.buttons`, lowest first */
const BITS = ['click', 'right', 'middle', 'back', 'forward']

const SIDE = new Set(['back', 'forward'])
const DEFAULT_STEP = 50
const DEFAULT_IDLE = 200
const LINE_HEIGHT = 16
const PAGE_HEIGHT = 800

/**
 * A button or scroll's query
 * @param {string} name - The button, or the scroll's direction
 * @param {Modifiers} mods - The modifiers held
 * @returns {Query} Its lookups
 */
function queryOf(name, mods) {
  return { bare: [name], exact: [`${modifierPrefix(mods)}${name}`], mods }
}

/**
 * How far a wheel event scrolls along its main axis
 * @param {WheelEvent} event - The event
 * @returns {number} The distance in px
 */
function wheelDistance(event) {
  const distance = Math.abs(event.deltaY === 0 ? event.deltaX : event.deltaY)
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
    return distance * LINE_HEIGHT
  }
  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    return distance * (event.view?.innerHeight ?? PAGE_HEIGHT)
  }
  return distance
}

/**
 * Listens to the mouse
 * @param {MouseListenOptions} options - Where to listen; where presses go; whether in the capture phase; which events
 *   to leave alone (default none); and, to listen to scrolling, how it steps
 * @returns {() => void} Stopping
 */
function mouseListen({ blocked = () => false, capture = false, target, to, wheel }) {
  /** @type {Set<string>} */
  const down = new Set()
  /** @type {Set<string>} */
  const swallowed = new Set()
  /** @type {Map<string, Gesture>} */
  const gestures = new Map()

  /**
   * Ends a button's press
   * @param {string} name - The button
   * @param {MouseEvent} event - Its mouseup
   * @param {boolean} isBlocked - Whether it came up where handlers don't run
   * @returns {void}
   */
  const release = (name, event, isBlocked) => {
    down.delete(name)
    to.up({ blocked: isBlocked, event, id: name, typing: false })
    if (SIDE.has(name) && (swallowed.has(name) || event.defaultPrevented)) {
      event.preventDefault()
      swallowed.add(name)
    }
  }

  /**
   * @param {Event} event - A mousedown, mouseup, mousemove or auxclick
   * @returns {void}
   */
  const onMouse = (event) => {
    if (!(event instanceof MouseEvent)) {
      return
    }
    const name = mouseName(event)
    if (event.type === 'auxclick') {
      if (name !== undefined && swallowed.delete(name)) {
        event.preventDefault()
      }
      return
    }
    for (const id of down) {
      if (Math.trunc(event.buttons / 2 ** BITS.indexOf(id)) % 2 === 0 && !(event.type === 'mouseup' && id === name)) {
        release(id, new MouseEvent('mouseup', { button: BUTTONS.indexOf(id), cancelable: true }), false)
      }
    }
    if (name !== undefined && event.type === 'mousedown' && !blocked(event)) {
      swallowed.delete(name)
      down.add(name)
      const query = queryOf(name, eventModifiers(event))
      if (to.down({ event, id: name, query, repeat: false, typing: false }) !== undefined && SIDE.has(name)) {
        swallowed.add(name)
      }
    } else if (name !== undefined && event.type === 'mouseup' && down.has(name)) {
      release(name, event, blocked(event))
    }
  }

  /**
   * A scroll: a step once the gesture has scrolled far enough, one per event so a flick doesn't queue a burst
   * @param {Event} event - A wheel event
   * @returns {void}
   */
  const onWheel = (event) => {
    const direction = event instanceof WheelEvent ? mouseName(event) : undefined
    if (wheel === undefined || !(event instanceof WheelEvent) || direction === undefined || blocked(event)) {
      return
    }
    const mods = eventModifiers(event)
    const query = queryOf(direction, mods)
    if (!wheel.bound(query)) {
      return
    }
    const { idle = DEFAULT_IDLE, step = DEFAULT_STEP } = wheel
    const now = performance.now()
    const lookup = `${modifierPrefix(mods)}${direction}`
    const going = gestures.get(lookup)
    const gesture = going === undefined || now - going.last > idle ? { amount: 0, last: now, ours: true } : going
    gesture.last = now
    gestures.set(lookup, gesture)
    if (!gesture.ours) {
      return
    }
    event.preventDefault()
    const scrolled = gesture.amount + wheelDistance(event)
    gesture.amount = scrolled < step ? scrolled : Math.min(scrolled - step, step)
    if (scrolled >= step) {
      gesture.ours = to.down({ event, id: direction, query, repeat: false, typing: false }) !== undefined
      to.up({ blocked: false, event, id: direction, typing: false })
    }
  }

  for (const type of ['mousedown', 'mouseup', 'mousemove', 'auxclick']) {
    target.addEventListener(type, onMouse, { capture })
  }
  target.addEventListener('wheel', onWheel, { capture, passive: false })
  return () => {
    for (const type of ['mousedown', 'mouseup', 'mousemove', 'auxclick']) {
      target.removeEventListener(type, onMouse, { capture })
    }
    target.removeEventListener('wheel', onWheel, { capture })
    down.clear()
    swallowed.clear()
    gestures.clear()
  }
}

export { mouseListen }
