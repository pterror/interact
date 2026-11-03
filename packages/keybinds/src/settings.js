/**
 * <keybinds-settings>: the panel where people rebind commands and axes, recording new bindings, settling conflicts and
 * resetting to the defaults.
 *
 * Attributes: `open`.
 *
 * Properties: `store` (the BindingsStore it edits), `inputs` (which bindings are shown and can be recorded; default
 * keys only), `releases`, `holds`, `sequences` (whether release, hold and tap, and several-step bindings can be
 * recorded: set them when keybinds() has releases(), holds(), sequences()), `open`.
 *
 * Events: `close` when it's dismissed; `change` (detail: { commandId, bindings }) when a binding changes; `reset`
 * (detail: { commandId? }) when bindings are reset.
 *
 * Classes: .settings, __backdrop, __dialog, __header, __title, __reset-all, __group, __group-title, __list, __item,
 * __item-label, __item-bindings, __item-reset, __binding (--recording), __binding-keys, __binding-key,
 * __binding-remove, __item-add, __recording-overlay, __conflict.
 */

/**
 * @import { InputUI } from './input.js'
 * @import { AnyBindingsStore } from './store.js'
 */

import { keysUI } from './keys-ui.js'
import { markKind } from './modal.js'
import { headerOf, settingsMarkup } from './settings-parts.js'
import { SettingsSession } from './settings-session.js'
import { groupsOf } from './settings-view.js'

const PAUSE = 1000

/** The panel where people rebind commands and axes */
class KeybindSettings extends HTMLElement {
  static kind = 'settings'
  static observedAttributes = ['open']
  /** How long recording a sequence waits after a step before taking the steps so far, in milliseconds */
  static SEQUENCE_PAUSE = PAUSE

  /** Whether release bindings ("k:up") can be recorded and switched to */
  releases = false
  /** Whether hold and tap bindings ("k:hold", "k:tap") can be recorded */
  holds = false
  /** Whether bindings of several steps ("g i") can be recorded */
  sequences = false
  /** @type {AnyBindingsStore | undefined} */
  #store
  /** @type {readonly InputUI[]} */
  #inputs = [keysUI()]
  /** @type {readonly (() => void)[]} */
  #unwatch = []
  /** @readonly */
  #rerender = () => {
    this.#refresh()
  }
  /** @readonly */
  #session = new SettingsSession({
    changed: () => {
      this.#render()
    },
    dispatch: (event) => {
      this.dispatchEvent(event)
    },
    inputs: () => this.#inputs,
    pause: () => KeybindSettings.SEQUENCE_PAUSE,
    store: () => this.#store,
    window: () => this.ownerDocument.defaultView ?? globalThis.window,
  })
  /**
   * @readonly
   * @type {HTMLDivElement}
   */
  #dialog

  /** Builds the panel's shadow DOM */
  constructor() {
    super()
    const { backdrop, dialog } = settingsMarkup(this.attachShadow({ mode: 'open' }))
    this.#dialog = dialog
    backdrop.addEventListener('click', () => {
      this.#close()
    })
  }

  /** @returns {AnyBindingsStore | undefined} The store it edits */
  get store() {
    return this.#store
  }

  /** @param {AnyBindingsStore | undefined} store - The store it edits */
  set store(store) {
    this.#store?.removeEventListener('change', this.#rerender)
    this.#store = store
    store?.addEventListener('change', this.#rerender)
    this.#refresh()
  }

  /** @returns {readonly InputUI[]} Which bindings are shown and can be recorded */
  get inputs() {
    return this.#inputs
  }

  /** @param {readonly InputUI[]} inputs - Which bindings are shown and can be recorded */
  set inputs(inputs) {
    this.#inputs = inputs
    if (this.isConnected) {
      this.#watch()
    }
    this.#refresh()
  }

  /** @returns {boolean} Whether it's open */
  get open() {
    return this.hasAttribute('open')
  }

  /** @param {boolean} open - Whether it's open */
  set open(open) {
    this.toggleAttribute('open', open)
  }

  /**
   * Follows its `open` attribute: opening shows the bindings as they are, closing stops recording
   * @param {string} _name - Which changed
   * @param {string | null} _previous - Its value before
   * @param {string | null} value - Its value now
   * @returns {void}
   */
  attributeChangedCallback(_name, _previous, value) {
    this.#session.stop()
    if (value !== null) {
      this.#render()
    }
  }

  /** @returns {void} */
  connectedCallback() {
    markKind(this, KeybindSettings.kind, true)
    this.#watch()
  }

  /** @returns {void} */
  disconnectedCallback() {
    this.#session.stop()
    for (const stop of this.#unwatch) {
      stop()
    }
    this.#unwatch = []
    this.#store?.removeEventListener('change', this.#rerender)
  }

  /**
   * Follows whether each input can be recorded now (a pad connected), so its add button comes and goes
   * @returns {void}
   */
  #watch() {
    for (const stop of this.#unwatch) {
      stop()
    }
    this.#unwatch = this.#inputs.flatMap((input) => (input.watch === undefined ? [] : [input.watch(this.#rerender)]))
  }

  /** @returns {void} */
  #close() {
    this.#session.stop()
    this.open = false
    this.dispatchEvent(new CustomEvent('close'))
  }

  /** @returns {void} */
  #refresh() {
    if (this.open) {
      this.#render()
    }
  }

  /** @returns {void} */
  #render() {
    const store = this.#store
    if (store === undefined) {
      this.#dialog.replaceChildren()
      return
    }
    const view = {
      conflict: this.#session.conflict,
      holds: this.holds,
      inputs: this.#inputs,
      recording: this.#session.recording,
      releases: this.releases,
      sequences: this.sequences,
      store,
    }
    this.#dialog.replaceChildren(
      headerOf(() => {
        this.#session.resetAll()
      }),
      ...groupsOf({ actions: this.#session.actions, view }),
    )
  }
}

export { KeybindSettings }
