/**
 * The mouse, listened to for one keybinds(): buttons going down and up, held buttons released when the page never
 * sees them let go, side buttons kept from navigating while bound, and scrolling run in steps.
 */

/** @import { Dispatch, Lookups } from './input.js' */

import { eventMods, modsToPrefix } from './binding-mods.js'
import { overlayOpen } from './modal.js'
import { WheelGestures } from './mouse-wheel.js'

/**
 * How scroll bindings step: a command runs once per `step` pixels, and a pause of `idle` ms starts a new gesture
 * @typedef {Readonly<{ idle?: number, step?: number }>} WheelOptions
 */

/** Pointer buttons as lookups name them, by `MouseEvent.button` */
const POINTER_BUTTONS = ['click', 'middle', 'right', 'back', 'forward']

/** Pointer buttons in the order of their bits in `MouseEvent.buttons`, lowest first */
const BUTTON_BITS = ['click', 'right', 'middle', 'back', 'forward']

/** Back and forward, which browsers bind to history navigation */
const SIDE_BUTTONS = new Set(['back', 'forward'])

const BINARY = 2
const SET = 1
const NONE = 0

/**
 * A pointer button's name as bindings write it, by `MouseEvent.button`
 * @param {number} button - The button
 * @returns {string | undefined} Its name, or undefined for a button no binding names
 */
function pointerButtonName(button) {
  return POINTER_BUTTONS[button]
}

/**
 * Whether `MouseEvent.buttons` says a button is down
 * @param {number} buttons - The event's `buttons`
 * @param {string} name - The button, as lookups name it
 * @returns {boolean} Whether it is down
 */
function isDown(buttons, name) {
  const position = BUTTON_BITS.indexOf(name)
  return BUTTON_BITS.includes(name) && Math.trunc(buttons / BINARY ** position) % BINARY === SET
}

/**
 * A mouse event's lookups, for any suffix and modifiers
 * @param {string} name - Its button, as lookups name it
 * @returns {Lookups} Its lookups: exact, and without modifiers
 */
function lookupsOf(name) {
  return (suffix, mods) => [[`${modsToPrefix(mods)}${name}${suffix}`], [`${name}${suffix}`]]
}

/** The mouse, listened to for one keybinds() */
class MouseListener {
  /**
   * @readonly
   * @type {Dispatch}
   */
  #dispatch
  /**
   * Side buttons whose press or release a command took; their auxclick is cancelled too
   * @readonly
   * @type {Set<string>}
   */
  #swallowAux = new Set()
  /**
   * @readonly
   * @type {WheelGestures}
   */
  #wheel

  /**
   * Starts listening
   * @param {Dispatch} dispatch - Where presses are reported
   * @param {WheelOptions} wheel - How scrolling steps
   */
  constructor(dispatch, wheel) {
    this.#dispatch = dispatch
    this.#wheel = new WheelGestures(dispatch, wheel)
    const { capture, target } = dispatch
    for (const type of ['mousedown', 'mouseup', 'auxclick', 'mousemove']) {
      target.addEventListener(type, this, { capture })
    }
    target.addEventListener('wheel', this, { capture, passive: false })
  }

  /**
   * Hears the mouse
   * @param {Event} event - A mouse or wheel event
   * @returns {void}
   */
  handleEvent(event) {
    if (event instanceof WheelEvent) {
      this.#wheel.scrolled(event)
    } else if (event instanceof MouseEvent) {
      this.#mouse(event)
    }
  }

  /**
   * A mouse event other than scrolling
   * @param {MouseEvent} event - The event
   * @returns {void}
   */
  #mouse(event) {
    if (event.type === 'auxclick') {
      this.#auxClick(event)
      return
    }
    this.#reconcile(event)
    if (event.type === 'mousedown') {
      this.#down(event)
    } else if (event.type === 'mouseup') {
      this.#up(event)
    }
  }

  /**
   * A button can be let go where the page doesn't see it (over another window after focus moved), but every mouse
   * event says which buttons are down. Any held button that isn't gets its release now, rather than guessing at blur
   * whether it will come back
   * @param {MouseEvent} event - Any mouse event
   * @returns {void}
   */
  #reconcile(event) {
    for (const id of this.#dispatch.presses.keys()) {
      const goingUp = event.type === 'mouseup' && pointerButtonName(event.button) === id
      if (!isDown(event.buttons, id) && !goingUp) {
        this.#dispatch.up(id, new MouseEvent('mouseup', { button: POINTER_BUTTONS.indexOf(id), cancelable: true }))
      }
    }
  }

  /**
   * A button went down
   * @param {MouseEvent} event - The mousedown
   * @returns {void}
   */
  #down(event) {
    const name = pointerButtonName(event.button)
    if (name === undefined || overlayOpen(event)) {
      return
    }
    this.#swallowAux.delete(name)
    const press = this.#dispatch.down(name, event, { lookups: lookupsOf(name), mods: eventMods(event) })
    if (press.fired.size > NONE && SIDE_BUTTONS.has(name)) {
      this.#swallowAux.add(name)
    }
  }

  /**
   * A button came up. Browsers navigate on a side button's mouseup and auxclick, so both are cancelled while a
   * command takes the button
   * @param {MouseEvent} event - The mouseup
   * @returns {void}
   */
  #up(event) {
    const name = pointerButtonName(event.button)
    if (name === undefined) {
      return
    }
    const ended = this.#dispatch.up(name, event, { blocked: overlayOpen(event) })
    if (ended !== undefined && SIDE_BUTTONS.has(name) && (ended.consumed || ended.press.fired.size > NONE)) {
      event.preventDefault()
      this.#swallowAux.add(name)
    }
  }

  /**
   * An auxclick, cancelled if a command took its side button
   * @param {MouseEvent} event - The auxclick
   * @returns {void}
   */
  #auxClick(event) {
    const name = pointerButtonName(event.button)
    if (name !== undefined && this.#swallowAux.delete(name)) {
      event.preventDefault()
    }
  }

  /** @returns {void} */
  stop() {
    const { capture, target } = this.#dispatch
    for (const type of ['mousedown', 'mouseup', 'auxclick', 'mousemove', 'wheel']) {
      target.removeEventListener(type, this, { capture })
    }
    this.#wheel.clear()
    this.#swallowAux.clear()
  }
}

export { MouseListener, pointerButtonName }
