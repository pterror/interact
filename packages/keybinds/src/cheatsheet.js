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
 * Held open by its trigger, it shows while the modifier is held; tapping the modifier twice keeps it open, and tapping
 * twice again, Escape or a click outside closes it.
 *
 * Classes: .cheatsheet, __backdrop, __dialog, __group, __group-title, __list, __item (--disabled), __item-label,
 * __item-keys, __item-binding, __item-key.
 */

/**
 * @import { Command, Context } from './command.js'
 * @import { InputUI } from './input.js'
 * @import { ActiveCommand } from './search.js'
 */

import { bindingParts } from './binding-format.js'
import { isMac } from './binding-mods.js'
import { OVERLAY_STYLE, make, namesOf, styleOf } from './component-dom.js'
import { keysUI } from './keys-ui.js'
import { markKind } from './modal.js'
import { onModifierHold, onModifierTaps } from './modifiers.js'
import { groupByCategory } from './search.js'

/**
 * How long the trigger's modifier is held before it opens: long enough that pausing with the modifier down to find the
 * rest of a shortcut doesn't open it
 */
const DEFAULT_DELAY = 1000

/**
 * One command's row: its label and its bindings, each binding's keys as `<kbd>`s in a span of their own
 * @param {ActiveCommand} entry - The command, and whether it applies
 * @param {readonly InputUI[]} inputs - How bindings are shown
 * @returns {HTMLLIElement} The row
 */
function itemOf({ active, command }, inputs) {
  const item = make('li', {
    className: namesOf({ cheatsheet__item: true, 'cheatsheet__item--disabled': !active }),
    part: namesOf({ item: true, 'item-disabled': !active }),
  })
  const bindings = make('span', { className: 'cheatsheet__item-keys', part: 'item-keys' })
  for (const keys of bindingParts(command, inputs)) {
    const binding = make('span', { className: 'cheatsheet__item-binding', part: 'item-binding' })
    binding.append(
      ...keys.map((key) => make('kbd', { className: 'cheatsheet__item-key', part: 'item-key', text: key })),
    )
    bindings.append(binding)
  }
  item.append(make('span', { className: 'cheatsheet__item-label', part: 'item-label', text: command.label }), bindings)
  return item
}

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
    if (!on) {
      this.#stopTrigger = undefined
      return
    }
    const key = this.getAttribute('trigger-key')
    // "$mod" (the default) is Meta on Mac and Control elsewhere, as in bindings
    const modifier = key === null || key === '' || key.toLowerCase() === '$mod' ? (isMac ? 'Meta' : 'Control') : key
    const ms = Number(this.getAttribute('trigger-delay') ?? DEFAULT_DELAY)
    let pinned = false
    const unhold = onModifierHold(
      modifier,
      (held) => {
        if (!pinned) {
          this.open = held
        }
      },
      { delay: Number.isFinite(ms) ? ms : DEFAULT_DELAY },
    )
    const untap = onModifierTaps(modifier, () => {
      pinned = !this.open
      this.open = pinned
    })
    /**
     * Closes on Escape, which was for closing it and not for whatever is underneath too
     * @param {KeyboardEvent} event - A key going down
     * @returns {void}
     */
    const escape = (event) => {
      if (event.key === 'Escape' && this.open) {
        event.preventDefault()
        event.stopPropagation()
        this.#close()
      }
    }
    globalThis.addEventListener('keydown', escape, true)
    const unpin = () => {
      pinned = false
    }
    this.addEventListener('close', unpin)
    this.#stopTrigger = () => {
      unhold()
      untap()
      globalThis.removeEventListener('keydown', escape, true)
      this.removeEventListener('close', unpin)
    }
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

  /**
   * Shows each category's commands, with every binding through the inputs it shows, and those that don't apply now
   * marked
   * @returns {void}
   */
  #render() {
    const inputs = this.#inputs
    const fields = inputs.filter((input) => input.axis !== true).map(({ field }) => field)
    /** @type {HTMLDivElement[]} */
    const groups = []
    for (const [category, entries] of Object.entries(groupByCategory(this.#commands, this.#context, fields))) {
      const group = make('div', { className: 'cheatsheet__group', part: 'group' })
      const list = make('ul', { className: 'cheatsheet__list', part: 'list' })
      list.append(...entries.map((entry) => itemOf(entry, inputs)))
      group.append(make('div', { className: 'cheatsheet__group-title', part: 'group-title', text: category }), list)
      groups.push(group)
    }
    this.#dialog.replaceChildren(...groups)
  }
}

export { KeybindCheatsheet }
