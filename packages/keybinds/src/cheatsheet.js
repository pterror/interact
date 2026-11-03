/**
 * <keybinds-cheatsheet>: every command's bindings, grouped by category, those that don't apply now grayed out.
 *
 * Attributes: `open`; `auto-trigger` (open while a modifier is held on its own; tapping it twice keeps it open);
 * `trigger-key` (the modifier: $mod by default, which is Meta on Mac and Control elsewhere, or Control, Alt, Shift,
 * Meta); `trigger-delay` (how long to hold it before opening, in ms; default 1000).
 *
 * Properties: `commands`, `context` (what `when` conditions see), `open`, `inputs` (which bindings are shown, and how;
 * default keys only).
 *
 * Events: `open` when it opens, however that happened; `close` when it's dismissed.
 *
 * Classes: .cheatsheet, __backdrop, __dialog, __group, __group-title, __list, __item (--disabled), __item-label,
 * __item-keys, __item-binding, __item-key.
 */

/**
 * @import { Command, Context } from './command.js'
 * @import { InputUI } from './input.js'
 */

import { cheatsheetGroups } from './cheatsheet-groups.js'
import { holdToOpen } from './cheatsheet-trigger.js'
import { OVERLAY_STYLE, make, styleOf } from './component-dom.js'
import { keysUI } from './keys-ui.js'
import { markKind } from './modal.js'

/** A cheatsheet of bindings */
class KeybindCheatsheet extends HTMLElement {
  static kind = 'cheatsheet'
  static observedAttributes = ['auto-trigger', 'open', 'trigger-delay', 'trigger-key']

  /** @type {readonly InputUI[]} */
  #inputs = [keysUI()]
  /**
   * Stops following how the inputs show bindings changing (a layout() switching)
   * @type {readonly (() => void)[]}
   */
  #unwatch = []
  /** @type {readonly Command[]} */
  #commands = []
  /** @type {Context} */
  #context = {}
  /** @type {(() => void) | undefined} */
  #stopTrigger
  /** @readonly */
  #dialog = make('div', { className: 'cheatsheet__dialog', part: 'dialog' })

  /** Builds the cheatsheet's shadow DOM */
  constructor() {
    super()
    const backdrop = make('div', { className: 'cheatsheet__backdrop', part: 'backdrop' })
    this.#dialog.setAttribute('role', 'dialog')
    this.#dialog.setAttribute('aria-modal', 'true')
    const root = make('div', { className: 'cheatsheet', part: 'cheatsheet' })
    root.append(backdrop, this.#dialog)
    this.attachShadow({ mode: 'open' }).append(styleOf(OVERLAY_STYLE), root)
    backdrop.addEventListener('click', () => {
      this.#close()
    })
  }

  /** @returns {readonly InputUI[]} Which bindings are shown, and how */
  get inputs() {
    return this.#inputs
  }

  /** @param {readonly InputUI[]} inputs - Which bindings are shown, and how */
  set inputs(inputs) {
    this.#inputs = inputs
    if (this.isConnected) {
      this.#watch()
    }
    this.#refresh()
  }

  /** @returns {readonly Command[]} The commands shown */
  get commands() {
    return this.#commands
  }

  /** @param {readonly Command[]} commands - The commands shown */
  set commands(commands) {
    this.#commands = commands
    this.#refresh()
  }

  /** @returns {Context} What `when` conditions see */
  get context() {
    return this.#context
  }

  /** @param {Context} context - What `when` conditions see */
  set context(context) {
    this.#context = context
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
   * Follows its attributes
   * @param {string} name - Which changed
   * @param {string | null} _previous - Its value before
   * @param {string | null} value - Its value now
   * @returns {void}
   */
  attributeChangedCallback(name, _previous, value) {
    if (name === 'open') {
      if (value !== null) {
        this.dispatchEvent(new CustomEvent('open'))
        this.#render()
      }
    } else if (name === 'auto-trigger' || this.hasAttribute('auto-trigger')) {
      this.#trigger(this.hasAttribute('auto-trigger'))
    }
  }

  /** @returns {void} */
  connectedCallback() {
    markKind(this, 'cheatsheet')
    this.#watch()
    this.#trigger(this.hasAttribute('auto-trigger'))
  }

  /** @returns {void} */
  disconnectedCallback() {
    this.#trigger(false)
    this.#stopWatching()
  }

  /**
   * Follows how the inputs show bindings, so an open cheatsheet shows them as they look now
   * @returns {void}
   */
  #watch() {
    this.#stopWatching()
    this.#unwatch = this.#inputs.flatMap(({ watch }) =>
      watch === undefined
        ? []
        : [
            watch(() => {
              this.#refresh()
            }),
          ],
    )
  }

  /** @returns {void} */
  #stopWatching() {
    for (const stop of this.#unwatch) {
      stop()
    }
    this.#unwatch = []
  }

  /**
   * Starts or stops opening while a modifier is held
   * @param {boolean} on - Whether it should
   * @returns {void}
   */
  #trigger(on) {
    this.#stopTrigger?.()
    this.#stopTrigger = on
      ? holdToOpen(
          {
            close: () => {
              this.#close()
            },
            isOpen: () => this.open,
            onClose: (closed) => {
              this.addEventListener('close', closed)
              return () => {
                this.removeEventListener('close', closed)
              }
            },
            setOpen: (open) => {
              this.open = open
            },
          },
          { delay: this.getAttribute('trigger-delay'), key: this.getAttribute('trigger-key') },
        )
      : undefined
  }

  /** @returns {void} */
  #close() {
    this.open = false
    this.dispatchEvent(new CustomEvent('close'))
  }

  /**
   * Shows the bindings again if it's open
   * @returns {void}
   */
  #refresh() {
    if (this.open) {
      this.#render()
    }
  }

  /** @returns {void} */
  #render() {
    this.#dialog.replaceChildren(...cheatsheetGroups(this.#commands, this.#context, this.#inputs))
  }
}

export { KeybindCheatsheet }
