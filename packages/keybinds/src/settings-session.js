/**
 * A settings panel's editing: recording a binding, the question when one is taken, and what each of the panel's
 * controls does.
 */

/**
 * @import { InputUI } from './input.js'
 * @import { RecordingState, Slot } from './settings-record.js'
 * @import { Conflict, SettingsActions } from './settings-view.js'
 * @import { AnyBindingsStore } from './store.js'
 */

import { findConflict } from './binding.js'
import { BindingEditor } from './settings-editor.js'
import { onSwitch } from './settings-parts.js'
import { Recording } from './settings-record.js'

/**
 * What a session works on and tells: the store and inputs, the window to record in, how long a sequence waits after
 * a step, that what's shown changed, and where its events go
 * @typedef {Readonly<{ changed: () => void, dispatch: (event: Event) => void, inputs: () => readonly InputUI[], pause:
 *   () => number, store: () => AnyBindingsStore | undefined, window: () => Window }>} SessionHooks
 */

/** Editing in a settings panel */
class SettingsSession {
  /**
   * @readonly
   * @type {SessionHooks}
   */
  #hooks
  /** @type {Conflict | undefined} */
  #conflict
  /**
   * @readonly
   * @type {Recording}
   */
  #recording
  /**
   * @readonly
   * @type {BindingEditor}
   */
  #editor
  /**
   * What the panel's controls do
   * @readonly
   * @type {SettingsActions}
   */
  actions

  /**
   * Edits for a panel
   * @param {SessionHooks} hooks - What it works on and tells
   */
  constructor(hooks) {
    this.#hooks = hooks
    this.#editor = new BindingEditor(hooks)
    this.#recording = new Recording({
      changed: hooks.changed,
      done: (binding) => {
        this.#recorded(binding)
      },
      ignore: onSwitch,
      pause: hooks.pause,
    })
    this.actions = this.#actionsOf(this.#recording, this.#editor)
  }

  /** @returns {Conflict | undefined} A taken binding, waiting on whether to replace the other command's */
  get conflict() {
    return this.#conflict
  }

  /** @returns {RecordingState} Recording as it is now */
  get recording() {
    return this.#recording.state
  }

  /**
   * Resets every command to its defaults
   * @returns {void}
   */
  resetAll() {
    this.#editor.resetAll()
  }

  /**
   * Stops recording, and forgets any question
   * @returns {void}
   */
  stop() {
    this.#recording.stop()
    this.#conflict = undefined
  }

  /**
   * What each control does
   * @param {Recording} recording - The recording
   * @param {BindingEditor} editor - The edits
   * @returns {SettingsActions} The actions
   */
  #actionsOf(recording, editor) {
    return {
      accept: () => {
        this.#accept()
      },
      cancel: () => {
        this.#cancel()
      },
      capture: (suffix) => {
        recording.capture(suffix)
      },
      finish: () => {
        recording.finish()
      },
      flip: (slot, flipped) => {
        this.#flip(slot, flipped)
      },
      record: (slot) => {
        this.#start(slot)
      },
      remove: (slot) => {
        editor.remove(slot)
      },
      reset: (id) => {
        editor.reset(id)
      },
      toggleSteps: () => {
        recording.toggleSteps()
      },
    }
  }

  /**
   * Starts recording a binding
   * @param {Slot} slot - Which binding
   * @returns {void}
   */
  #start(slot) {
    this.#conflict = undefined
    this.#recording.start(slot, this.#hooks.window())
    this.#hooks.changed()
  }

  /**
   * A binding was recorded: it takes its slot, unless it's taken, which asks first
   * @param {string} binding - The binding
   * @returns {void}
   */
  #recorded(binding) {
    const { slot } = this.#recording.state
    if (slot !== undefined && !this.#asks(slot, binding, false)) {
      this.#apply(slot, binding)
    }
  }

  /**
   * Switches a binding to another form of it, unless that's taken, which asks first
   * @param {Slot} slot - Which binding
   * @param {string} flipped - Its other form
   * @returns {void}
   */
  #flip(slot, flipped) {
    if (!this.#asks(slot, flipped, true)) {
      this.#apply(slot, flipped)
    }
  }

  /**
   * Asks whether to replace another command's binding, if this one is taken
   * @param {Slot} slot - Which binding it's for
   * @param {string} binding - The binding
   * @param {boolean} flip - Whether it came from switching a binding's form
   * @returns {boolean} Whether it's taken, and the question is shown
   */
  #asks(slot, binding, flip) {
    const store = this.#hooks.store()
    const taken =
      store === undefined ? undefined : findConflict(store.entries(), { binding, except: slot.id, input: slot.input })
    if (taken === undefined) {
      return false
    }
    if (flip) {
      this.#recording.hold(slot)
    }
    this.#conflict = { binding, flip, id: taken.commandId, label: taken.label, slot }
    this.#hooks.changed()
    return true
  }

  /**
   * Puts a binding in its slot, and stops recording
   * @param {Slot} slot - Which binding
   * @param {string} binding - The binding
   * @returns {void}
   */
  #apply(slot, binding) {
    this.stop()
    this.#editor.apply(slot, binding)
  }

  /**
   * Replaces the other command's binding: takes it from that command, and puts it in the slot
   * @returns {void}
   */
  #accept() {
    const conflict = this.#conflict
    if (conflict !== undefined) {
      this.stop()
      this.#editor.move(conflict.id, conflict.slot, conflict.binding)
    }
  }

  /**
   * Leaves the other command's binding, and stops a switch that asked
   * @returns {void}
   */
  #cancel() {
    if (this.#conflict?.flip === true) {
      this.stop()
    }
    this.#conflict = undefined
    this.#hooks.changed()
  }
}

export { SettingsSession }
