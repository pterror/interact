/**
 * Recording a binding in the settings panel: which binding is being recorded, what's captured (a press, or a release,
 * hold or tap), whether it takes several steps and the steps so far, and Escape to stop.
 */

/** @import { InputUI } from './input.js' */

import { RELEASE_SUFFIX } from './binding.js'

const NONE = 0

/**
 * Which binding: a command's, through an input, and which of its bindings (undefined for a new one)
 * @typedef {Readonly<{ id: string, index: number | undefined, input: InputUI }>} Slot
 */

/**
 * Recording as it is now: the binding being recorded, what's captured (a press "", or ":up", ":hold", ":tap"), whether
 * it takes several steps, and the steps so far
 * @typedef {Readonly<{ sequence: boolean, slot: Slot | undefined, steps: readonly string[], suffix: string }>}
 *   RecordingState
 */

/**
 * What recording tells the panel and asks of it: a binding was recorded, its state changed, which events not to
 * record, and how long a sequence waits after a step
 * @typedef {Readonly<{ changed: () => void, done: (binding: string) => void, ignore: (event: Event) => boolean, pause:
 *   () => number }>} RecordingHooks
 */

/** Recording one binding at a time */
class Recording {
  /**
   * @readonly
   * @type {RecordingHooks}
   */
  #hooks
  /** @type {Slot | undefined} */
  #slot
  #suffix = ''
  #sequence = false
  /** @type {readonly string[]} */
  #steps = []
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  #timer
  /** @type {(() => void) | undefined} */
  #stopRecorder
  /** @type {Window | undefined} */
  #window

  /**
   * Records for a panel
   * @param {RecordingHooks} hooks - What it tells the panel and asks of it
   */
  constructor(hooks) {
    this.#hooks = hooks
  }

  /** @returns {RecordingState} Recording as it is now */
  get state() {
    return { sequence: this.#sequence, slot: this.#slot, steps: this.#steps, suffix: this.#suffix }
  }

  /**
   * Starts recording a binding from what's done next in a window, until it's recorded, Escape, or stop()
   * @param {Slot} slot - Which binding
   * @param {Window} window - Where to listen
   * @returns {void}
   */
  start(slot, window) {
    this.stop()
    this.#slot = slot
    this.#window = window
    window.addEventListener('keydown', this, true)
    this.#listen()
  }

  /**
   * Marks a binding as the one being changed, without recording: a switch to it waiting on a conflict
   * @param {Slot} slot - Which binding
   * @returns {void}
   */
  hold(slot) {
    this.stop()
    this.#slot = slot
  }

  /**
   * Stops recording, and forgets what it was recording
   * @returns {void}
   */
  stop() {
    this.#stopRecorder?.()
    this.#stopRecorder = undefined
    this.#window?.removeEventListener('keydown', this, true)
    this.#window = undefined
    clearTimeout(this.#timer)
    this.#slot = undefined
    this.#suffix = ''
    this.#sequence = false
    this.#steps = []
  }

  /**
   * Switches what's captured; choosing what's already chosen goes back to a press
   * @param {string} suffix - ":up", ":hold" or ":tap"
   * @returns {void}
   */
  capture(suffix) {
    this.#suffix = this.#suffix === suffix ? '' : suffix
    if (this.#suffix !== '') {
      this.#sequence = false
    }
    this.#listen()
    this.#hooks.changed()
  }

  /**
   * Switches between one step and several
   * @returns {void}
   */
  toggleSteps() {
    this.#sequence = !this.#sequence
    if (this.#sequence) {
      this.#suffix = ''
    }
    this.#steps = []
    clearTimeout(this.#timer)
    this.#listen()
    this.#hooks.changed()
  }

  /**
   * Takes the steps recorded so far as the binding
   * @returns {void}
   */
  finish() {
    clearTimeout(this.#timer)
    if (this.#steps.length > NONE) {
      this.#hooks.done(this.#steps.join(' '))
    }
  }

  /**
   * Stops recording on Escape, which isn't recorded
   * @param {Event} event - A key going down in the window
   * @returns {void}
   */
  handleEvent(event) {
    if (event instanceof KeyboardEvent && event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      this.stop()
      this.#hooks.changed()
    }
  }

  /**
   * (Re)starts the input's recorder, for a press or a release as the switches say
   * @returns {void}
   */
  #listen() {
    this.#stopRecorder?.()
    this.#stopRecorder = undefined
    const input = this.#slot?.input
    if (input?.record === undefined || this.#window === undefined) {
      return
    }
    this.#stopRecorder = input.record(
      { ignore: this.#hooks.ignore, release: this.#suffix === RELEASE_SUFFIX, target: this.#window },
      (binding) => {
        this.#recorded(input, binding)
      },
    )
  }

  /**
   * A binding was recorded: one step of a sequence, or the whole binding. One that can't be held or tapped (a scroll)
   * isn't recorded while that's asked for
   * @param {InputUI} input - The input it came through
   * @param {string} binding - The binding
   * @returns {void}
   */
  #recorded(input, binding) {
    const suffix = this.#suffix
    if (suffix !== '' && input.release !== undefined && !input.release(binding)) {
      return
    }
    if (!this.#sequence) {
      this.#hooks.done(suffix === '' || suffix === RELEASE_SUFFIX ? binding : binding + suffix)
      return
    }
    this.#step(binding)
  }

  /**
   * Takes one step of a sequence, and waits for the next, or a pause
   * @param {string} binding - The step
   * @returns {void}
   */
  #step(binding) {
    this.#steps = [...this.#steps, binding]
    clearTimeout(this.#timer)
    this.#timer = setTimeout(() => {
      this.finish()
    }, this.#hooks.pause())
    this.#listen()
    this.#hooks.changed()
  }
}

export { Recording }
