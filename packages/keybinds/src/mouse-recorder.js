/**
 * Recording a mouse binding from what's done next: a click or a scroll, or with `release` a button's press and its
 * release. Scrolling has no release.
 */

/** @import { RecordOptions } from './keys-recorder.js' */

import { RELEASE_SUFFIX } from './binding.js'

/**
 * What a recording gives its binding to, and how a mouse event is written as one (undefined if it can't be)
 * @typedef {Readonly<{ done: (binding: string) => void, toBinding: (event: MouseEvent) => string | undefined }>}
 *   RecordTo
 */

const TYPES = ['mousedown', 'mouseup', 'wheel']

/**
 * Keeps an event from reaching anything else: it is the recording's
 * @param {Event} event - The event
 * @returns {void}
 */
function take(event) {
  event.preventDefault()
  event.stopPropagation()
}

/** One recording of a mouse binding */
class MouseRecorder {
  /**
   * @readonly
   * @type {RecordOptions}
   */
  #options
  /**
   * @readonly
   * @type {RecordTo}
   */
  #to
  /**
   * @readonly
   * @type {EventTarget}
   */
  #target
  /**
   * The press being held until its mouseup, for a release
   * @type {Readonly<{ binding: string, button: number }> | undefined}
   */
  #held

  /**
   * Starts listening for the next click or scroll
   * @param {RecordOptions} options - How recording goes
   * @param {RecordTo} to - What gets the binding, and how an event is written
   */
  constructor(options, to) {
    this.#options = options
    this.#to = to
    this.#target = options.target ?? globalThis
    for (const type of TYPES) {
      this.#target.addEventListener(type, this, true)
    }
  }

  /**
   * Hears the mouse
   * @param {Event} event - A mousedown, mouseup or wheel
   * @returns {void}
   */
  handleEvent(event) {
    if (event instanceof WheelEvent) {
      this.#wheel(event)
    } else if (event instanceof MouseEvent && !this.#options.ignore(event)) {
      if (event.type === 'mouseup') {
        this.#up(event)
      } else {
        this.#down(event)
      }
    }
  }

  /**
   * A button went down: recorded at once, or held until it comes up
   * @param {MouseEvent} event - The mousedown
   * @returns {void}
   */
  #down(event) {
    const binding = this.#to.toBinding(event)
    if (binding === undefined) {
      return
    }
    take(event)
    if (this.#options.release) {
      this.#held = { binding, button: event.button }
    } else {
      this.#to.done(binding)
    }
  }

  /**
   * A button came up: the held press's release is recorded
   * @param {MouseEvent} event - The mouseup
   * @returns {void}
   */
  #up(event) {
    const held = this.#held
    if (held === undefined || held.button !== event.button) {
      return
    }
    take(event)
    this.#held = undefined
    this.#to.done(`${held.binding}${RELEASE_SUFFIX}`)
  }

  /**
   * The wheel moved: recorded, unless a release is being recorded
   * @param {WheelEvent} event - The scroll
   * @returns {void}
   */
  #wheel(event) {
    const binding = this.#options.release ? undefined : this.#to.toBinding(event)
    if (binding === undefined) {
      return
    }
    take(event)
    this.#to.done(binding)
  }

  /** @returns {void} */
  stop() {
    for (const type of TYPES) {
      this.#target.removeEventListener(type, this, true)
    }
  }
}

export { MouseRecorder }
