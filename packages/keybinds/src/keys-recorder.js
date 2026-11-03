/**
 * Recording a key binding from what's pressed next: a press, or with `release` the press and its release.
 */

import { RELEASE_SUFFIX } from './binding.js'
import { keyId } from './keys-listener.js'

/**
 * How recording goes: whether it records a release, what events to leave alone, and where to listen (the window
 * recording happens in; default the global one)
 * @typedef {Readonly<{ ignore: (event: Event) => boolean, release: boolean, target?: Window }>} RecordOptions
 */

/**
 * What a recording gives its binding to, and how a key event is written as one (undefined if it can't be)
 * @typedef {Readonly<{ done: (binding: string) => void, toBinding: (event: KeyboardEvent) => string | undefined }>}
 *   RecordTo
 */

/** One recording of a key binding */
class KeyRecorder {
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
   * @type {Window}
   */
  #target
  /**
   * The press being held until its keyup, for a release: the press-time modifiers are what the release binds to
   * @type {Readonly<{ binding: string, id: string }> | undefined}
   */
  #held

  /**
   * Starts listening for the next key
   * @param {RecordOptions} options - How recording goes
   * @param {RecordTo} to - What gets the binding, and its syntax
   */
  constructor(options, to) {
    this.#options = options
    this.#to = to
    this.#target = options.target ?? globalThis.window
    this.#target.addEventListener('keydown', this, true)
    this.#target.addEventListener('keyup', this, true)
  }

  /**
   * Hears the keyboard
   * @param {Event} event - A keydown or keyup
   * @returns {void}
   */
  handleEvent(event) {
    if (!(event instanceof KeyboardEvent) || this.#options.ignore(event)) {
      return
    }
    if (event.type === 'keyup') {
      this.#up(event)
    } else {
      this.#down(event)
    }
  }

  /**
   * A key went down: recorded at once, or held until it comes up
   * @param {KeyboardEvent} event - The keydown
   * @returns {void}
   */
  #down(event) {
    const binding = event.key === 'Escape' ? undefined : this.#to.toBinding(event)
    if (binding === undefined) {
      return
    }
    event.preventDefault()
    event.stopPropagation()
    if (!this.#options.release) {
      this.#to.done(binding)
    } else if (!event.repeat) {
      this.#held = { binding, id: keyId(event) }
    }
  }

  /**
   * A key came up: the held press's release is recorded
   * @param {KeyboardEvent} event - The keyup
   * @returns {void}
   */
  #up(event) {
    const held = this.#held
    if (held === undefined || held.id !== keyId(event)) {
      return
    }
    event.preventDefault()
    event.stopPropagation()
    this.#held = undefined
    this.#to.done(`${held.binding}${RELEASE_SUFFIX}`)
  }

  /** @returns {void} */
  stop() {
    this.#target.removeEventListener('keydown', this, true)
    this.#target.removeEventListener('keyup', this, true)
  }
}

export { KeyRecorder }
