/**
 * <keybinds-command-palette>: commands found by typing, and run by choosing one.
 *
 * Attributes: `open`; `auto-trigger` ($mod+K toggles it); `placeholder` (default "Type a command..."); `hide-inactive`
 * (list only commands that apply now, rather than showing the rest disabled).
 *
 * Properties: `commands`, `context` (what `when` conditions see), `matcher`, `inputs` (how bindings are shown; default
 * keys only), `source` (further commands for a non-empty query, merged with `commands`), `sourceDelay` (ms of typing
 * pause before `source` is asked; default 200), `open`.
 *
 * Events: `execute` (detail: { command }) when a command is chosen and run; `close` when it's dismissed.
 *
 * Classes: .palette, __backdrop, __dialog, __input, __list, __item (--active, --disabled), __item-label,
 * __item-label-match, __item-description, __item-category, __item-keys, __item-key, __empty.
 */

/**
 * @import { Command, Context } from './command.js'
 * @import { InputUI } from './input.js'
 * @import { PaletteSource } from './palette-source.js'
 * @import { Matcher } from './search.js'
 */

import { OVERLAY_STYLE, styleOf } from './component-dom.js'
import { keysUI } from './keys-ui.js'
import { markKind } from './modal.js'
import { PaletteList } from './palette-list.js'
import { MOVES, PLACEHOLDER, paletteMarkup, toggleOnModK } from './palette-parts.js'
import { paletteResults } from './palette-search.js'
import { SourceAnswers } from './palette-source.js'

const SOURCE_DELAY = 200

/** A command palette */
class CommandPalette extends HTMLElement {
  static kind = 'command-palette'
  static observedAttributes = ['auto-trigger', 'open', 'placeholder']

  /**
   * How bindings are shown: a match shows its first
   * @type {readonly InputUI[]}
   */
  inputs = [keysUI()]
  /** Milliseconds of typing pause before `source` is asked */
  sourceDelay = SOURCE_DELAY
  /** @type {readonly Command[]} */
  #commands = []
  /** @type {Context} */
  #context = {}
  /** @type {Matcher | undefined} */
  #matcher
  /** @type {PaletteSource | undefined} */
  #source
  /** @readonly */
  #answers = new SourceAnswers(() => {
    this.#search(false)
  })
  /** @type {(() => void) | undefined} */
  #stopTrigger
  /**
   * @readonly
   * @type {HTMLInputElement}
   */
  #input
  /**
   * @readonly
   * @type {PaletteList}
   */
  #list

  /** Builds the palette's shadow DOM */
  constructor() {
    super()
    const { backdrop, input, list, root } = paletteMarkup()
    this.#input = input
    this.#list = new PaletteList(list, (index) => {
      this.#execute(index)
    })
    this.attachShadow({ mode: 'open' }).append(styleOf(OVERLAY_STYLE), root)
    backdrop.addEventListener('click', () => {
      this.#close()
    })
    this.#input.addEventListener('input', () => {
      this.#search(true)
    })
    this.#input.addEventListener('keydown', (event) => {
      this.#key(event)
    })
  }

  /** @returns {readonly Command[]} The commands to search */
  get commands() {
    return this.#commands
  }

  /** @param {readonly Command[]} commands - The commands to search */
  set commands(commands) {
    this.#commands = commands
    this.#refresh(false)
  }

  /** @returns {Context} What `when` conditions see */
  get context() {
    return this.#context
  }

  /** @param {Context} context - What `when` conditions see */
  set context(context) {
    this.#context = context
    this.#refresh(false)
  }

  /** @returns {Matcher | undefined} How queries match, if not the default */
  get matcher() {
    return this.#matcher
  }

  /** @param {Matcher | undefined} matcher - How queries match, undefined for the default */
  set matcher(matcher) {
    this.#matcher = matcher
    this.#refresh(false)
  }

  /** @returns {PaletteSource | undefined} Where further commands come from */
  get source() {
    return this.#source
  }

  /** @param {PaletteSource | undefined} source - Where further commands come from */
  set source(source) {
    this.#source = source
    this.#refresh(true)
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
      if (value === null) {
        this.#closed()
      } else {
        this.#opened()
      }
    } else if (name === 'auto-trigger') {
      this.#trigger(value !== null)
    } else {
      this.#input.placeholder = value ?? PLACEHOLDER
    }
  }

  /** @returns {void} */
  connectedCallback() {
    markKind(this, 'command-palette', true)
    this.#trigger(this.hasAttribute('auto-trigger'))
  }

  /** @returns {void} */
  disconnectedCallback() {
    this.#trigger(false)
  }

  /**
   * Starts or stops $mod+K toggling it
   * @param {boolean} on - Whether it should
   * @returns {void}
   */
  #trigger(on) {
    this.#stopTrigger?.()
    this.#stopTrigger = on
      ? toggleOnModK({
          toggle: () => {
            this.open = !this.open
          },
        })
      : undefined
  }

  /** @returns {void} */
  #opened() {
    this.#input.value = ''
    this.#list.reset()
    this.#search(true)
    this.#input.focus()
  }

  /** @returns {void} */
  #closed() {
    this.#answers.clear()
    this.#input.blur()
  }

  /** @returns {void} */
  #close() {
    this.open = false
    this.dispatchEvent(new CustomEvent('close'))
  }

  /**
   * Searches again if it's open
   * @param {boolean} ask - Whether to ask `source` again for the query
   * @returns {void}
   */
  #refresh(ask) {
    if (this.open) {
      this.#search(ask)
    }
  }

  /**
   * Lists what matches the query: every visible command for none
   * @param {boolean} ask - Whether to ask `source` again for the query
   * @returns {void}
   */
  #search(ask) {
    const query = this.#input.value
    if (ask) {
      this.#ask(query)
    }
    const results = paletteResults(query, {
      answered: this.#answers.commands,
      commands: this.#commands,
      context: this.#context,
      hideInactive: this.hasAttribute('hide-inactive'),
      matcher: this.#matcher,
    })
    this.#list.show(results, this.inputs)
  }

  /**
   * Asks `source` once typing pauses, if there is one
   * @param {string} query - What was typed
   * @returns {void}
   */
  #ask(query) {
    const source = this.#source
    if (source === undefined) {
      this.#answers.clear()
      return
    }
    this.#answers.ask(query, {
      delay: this.sourceDelay,
      source,
      still: (asked) => this.open && this.#input.value === asked,
    })
  }

  /**
   * What a key does in the search field
   * @param {KeyboardEvent} event - The key going down
   * @returns {void}
   */
  #key(event) {
    const move = MOVES.get(event.key)
    if (move !== undefined) {
      event.preventDefault()
      this.#list.move(move)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      this.#execute(this.#list.active)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      this.#close()
    }
  }

  /**
   * Runs a match, closing first, if its command applies
   * @param {number} index - Which match
   * @returns {void}
   */
  #execute(index) {
    const result = this.#list.results[index]
    if (result === undefined || !result.active) {
      return
    }
    this.#close()
    result.command.execute(this.#context)
    this.dispatchEvent(new CustomEvent('execute', { detail: { command: result.command } }))
  }
}

export { CommandPalette }
