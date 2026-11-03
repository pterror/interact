/**
 * <keybinds-context-menu>: a context menu of commands, ranked by a scorer, with a search above them. It shows the top
 * `maxVisible` (default 7), and a "▾ N more" row below them shows the rest when pointed at, focused or clicked.
 *
 * Attributes: `open`; `auto-trigger` (open where the target is right-clicked); `menu` (the tag that picks its
 * commands); `target` (a selector for what's right-clicked; default its parent).
 *
 * Properties: `commands`, `context` (what `when` conditions see), `open`, `menu`, `position` ({ x, y } in viewport
 * pixels), `scorer` (how commands rank; default `defaultScorer(history)`), `history` (when commands were run, for the
 * default scorer), `maxVisible`, `inputs` (how bindings are shown; default keys only).
 *
 * Events: `execute` (detail: { command }) when a command is chosen and run; `close` when it's dismissed.
 *
 * Parts: search, context-menu, backdrop, list, separator, item (item-active, item-disabled), item-label, item-keys,
 * item-key, more-row.
 */

/**
 * @import { Command, Context } from './command.js'
 * @import { InputUI } from './input.js'
 * @import { MenuParts } from './menu-parts.js'
 * @import { Point } from './menu-place.js'
 * @import { HistoryEntry, Scorer } from './search.js'
 */

import { keysUI } from './keys-ui.js'
import { MenuList } from './menu-list.js'
import { closeOnBackdrop, focusOnOpen, menuMarkup, menuSearch } from './menu-parts.js'
import { OnScreen } from './menu-place.js'
import { moreRow, visibleRows } from './menu-scored.js'
import { MenuTrigger } from './menu-trigger.js'
import { markKind } from './modal.js'
import { defaultScorer } from './scorer.js'

const CORNER = 0
const MAX_VISIBLE = 7

/** A context menu of ranked commands, with a search */
class ContextMenu extends HTMLElement {
  static kind = 'context-menu'
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
  /** @type {Scorer | undefined} */
  #scorer
  /** @type {readonly HistoryEntry[]} */
  #history = []
  #maxVisible = MAX_VISIBLE
  /** Whether the rest are shown, past the top `maxVisible` */
  #expanded = false
  /** @readonly */
  #trigger = new MenuTrigger((point) => {
    this.#position = point
    this.#show()
    this.open = true
  })
  /** @readonly */
  #onScreen = new OnScreen()
  /**
   * @readonly
   * @type {HTMLInputElement}
   */
  #search = menuSearch()
  /**
   * @readonly
   * @type {MenuParts}
   */
  #parts
  /**
   * @readonly
   * @type {MenuList}
   */
  #list

  /** Builds the menu's shadow DOM */
  constructor() {
    super()
    const shadow = this.attachShadow({ mode: 'open' })
    this.#parts = menuMarkup(shadow, [this.#search])
    this.#list = new MenuList(this.#parts.list, (index) => {
      this.#execute(index)
    })
    closeOnBackdrop(this.#parts.backdrop, () => {
      this.#close()
    })
    this.#search.addEventListener('input', () => {
      this.#expanded = false
      this.#show()
    })
    shadow.addEventListener('keydown', (event) => {
      if (this.open && event instanceof KeyboardEvent) {
        this.#list.key(event, {
          close: () => {
            this.#close()
          },
          inSearch: event.target === this.#search,
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
      this.#onScreen.place(this.#parts.box, this.#position)
    }
  }

  /** @returns {Scorer} How commands rank */
  get scorer() {
    return this.#scorer ?? defaultScorer(this.#history)
  }

  /** @param {Scorer | undefined} scorer - How commands rank, undefined for the default over `history` */
  set scorer(scorer) {
    this.#scorer = scorer
    this.#refresh()
  }

  /** @returns {readonly HistoryEntry[]} When commands were run, for the default scorer */
  get history() {
    return this.#history
  }

  /** @param {readonly HistoryEntry[]} history - When commands were run, for the default scorer */
  set history(history) {
    this.#history = history
    this.#refresh()
  }

  /** @returns {number} How many it shows before "N more" */
  get maxVisible() {
    return this.#maxVisible
  }

  /** @param {number} count - How many it shows before "N more"; anything but a positive number means 7 */
  set maxVisible(count) {
    this.#maxVisible = count > CORNER ? count : MAX_VISIBLE
    this.#refresh()
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
      if (value === null) {
        this.#onScreen.stop()
      } else {
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
    markKind(this, ContextMenu.kind, true)
    this.#trigger.set(this, this.hasAttribute('auto-trigger'))
  }

  /** @returns {void} */
  disconnectedCallback() {
    this.#trigger.set(this, false)
  }

  /**
   * Opens with nothing typed and nothing active
   * @returns {void}
   */
  #opened() {
    this.#list.reset()
    this.#expanded = false
    this.#search.value = ''
    this.#show()
    this.#onScreen.place(this.#parts.box, this.#position)
    focusOnOpen(this.#search, this.#parts.list)
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

  /**
   * Shows the commands that match what's typed, or every one of its menu ranked, up to `maxVisible` unless expanded
   * @returns {void}
   */
  #show() {
    const { hidden, rows } = visibleRows(this.#commands, {
      context: this.#context,
      expanded: this.#expanded,
      limit: this.#maxVisible,
      menu: this.#menu,
      query: this.#search.value,
      scorer: this.scorer,
    })
    const more = moreRow(hidden, () => {
      this.#expanded = true
      this.#show()
    })
    this.#list.show(rows, this.inputs, more)
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

export { ContextMenu }
