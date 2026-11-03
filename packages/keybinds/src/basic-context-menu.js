/**
 * <keybinds-basic-context-menu>: a context menu of commands, every one shown, without a search.
 *
 * Attributes: `open`; `auto-trigger` (open where the target is right-clicked); `menu` (the tag that picks its
 * commands); `target` (a selector for what's right-clicked; default its parent).
 *
 * Properties: `commands`, `context` (what `when` conditions see), `open`, `menu`, `position` ({ x, y } in viewport
 * pixels), `inputs` (how bindings are shown; default keys only).
 *
 * Events: `execute` (detail: { command }) when a command is chosen and run; `close` when it's dismissed.
 *
 * Classes: .context-menu, __backdrop, __list, __separator, __item (--active, --disabled), __item-label, __item-keys,
 * __item-key.
 */

/**
 * @import { Command, Context } from './command.js'
 * @import { InputUI } from './input.js'
 * @import { Point } from './menu-place.js'
 */

import { keysUI } from './keys-ui.js'
import { MenuList } from './menu-list.js'
import { closeOnBackdrop, menuMarkup } from './menu-parts.js'
import { placeAt } from './menu-place.js'
import { menuRows } from './menu-rows.js'
import { MenuTrigger } from './menu-trigger.js'
import { markKind } from './modal.js'

const CORNER = 0

/** A context menu of commands, without a search */
class BasicContextMenu extends HTMLElement {
  static kind = 'basic-context-menu'
  static observedAttributes = ['auto-trigger', 'menu', 'open']

  /**
   * How bindings are shown: an item shows its first
   * @type {readonly InputUI[]}
   */
  inputs = [keysUI()]
  /** @type {readonly Command[]} */
  #commands = []
  /** @type {Context} */
  #context = {}
  #menu = ''
  /** @type {Point} */
  #position = { x: CORNER, y: CORNER }
  /** @readonly */
  #trigger = new MenuTrigger((point) => {
    this.#position = point
    this.#show()
    this.open = true
  })
  /**
   * @readonly
   * @type {HTMLUListElement}
   */
  #element
  /**
   * @readonly
   * @type {MenuList}
   */
  #list

  /** Builds the menu's shadow DOM */
  constructor() {
    super()
    const shadow = this.attachShadow({ mode: 'open' })
    const { backdrop, list } = menuMarkup(shadow)
    this.#element = list
    this.#list = new MenuList(list, (index) => {
      this.#execute(index)
    })
    closeOnBackdrop(backdrop, () => {
      this.#close()
    })
    shadow.addEventListener('keydown', (event) => {
      if (this.open && event instanceof KeyboardEvent) {
        this.#list.key(event, {
          close: () => {
            this.#close()
          },
          inSearch: false,
        })
      }
    })
  }

  /** @returns {readonly Command[]} The commands it picks from */
  get commands() {
    return this.#commands
  }

  /** @param {readonly Command[]} commands - The commands it picks from */
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

  /** @returns {string} The tag that picks its commands, "" for every one not hidden */
  get menu() {
    return this.#menu
  }

  /** @param {string} menu - The tag that picks its commands, "" for every one not hidden */
  set menu(menu) {
    this.#menu = menu
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

  /** @returns {Point} Where it opens, in viewport pixels */
  get position() {
    return this.#position
  }

  /** @param {Point} position - Where it opens, in viewport pixels */
  set position(position) {
    this.#position = position
    if (this.open) {
      placeAt(this.#element, position)
    }
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
        this.#opened()
      }
    } else if (name === 'auto-trigger') {
      this.#trigger.set(this, value !== null)
    } else {
      this.menu = value ?? ''
    }
  }

  /** @returns {void} */
  connectedCallback() {
    markKind(this, BasicContextMenu.kind, true)
    this.#trigger.set(this, this.hasAttribute('auto-trigger'))
  }

  /** @returns {void} */
  disconnectedCallback() {
    this.#trigger.set(this, false)
  }

  /** @returns {void} */
  #opened() {
    this.#list.reset()
    this.#show()
    placeAt(this.#element, this.#position)
    this.#element.focus()
  }

  /** @returns {void} */
  #close() {
    this.open = false
    this.dispatchEvent(new CustomEvent('close'))
  }

  /** @returns {void} */
  #refresh() {
    if (this.open) {
      this.#show()
    }
  }

  /** @returns {void} */
  #show() {
    this.#list.show(menuRows(this.#commands, { context: this.#context, menu: this.#menu }), this.inputs)
  }

  /**
   * Runs an item's command, closing first, if it applies
   * @param {number} index - Which item
   * @returns {void}
   */
  #execute(index) {
    const row = this.#list.applying(index)
    if (row === undefined) {
      return
    }
    this.#close()
    row.command.execute(this.#context)
    this.dispatchEvent(new CustomEvent('execute', { detail: { command: row.command } }))
  }
}

export { BasicContextMenu }
