/**
 * @import { Span } from '@interact/core/memory-source'
 * @import { CommandBridge } from './command-bridge.js'
 * @import { FoundCommand } from './command-match.js'
 */

import { Controllable, Layer, Listeners, MemorySource } from '@interact/core'

import { fieldListKey } from './field-keys.js'
import { Latest } from './latest.js'
import { landing } from './legacy-landing.js'
import { Listbox } from './legacy-listbox.js'

/**
 * How a palette starts: the bridge to its command system, the context its commands are found and run in (read as it
 * opens), its id (unique in the page for light DOM), its name and its search field's, text shown in the field while it
 * is empty (none unless given), how many results show at once, and whether commands that can't run now are shown
 * (greyed out, passed over) or left out.
 * @template C
 * @typedef {Readonly<{
 *   bridge: CommandBridge<C>,
 *   context: () => C,
 *   id?: string,
 *   label?: string,
 *   searchLabel?: string,
 *   placeholder?: string,
 *   rows?: number,
 *   inactive?: 'show' | 'hide',
 * }>} PaletteOptions
 */

const DEFAULT_ROWS = 10

/**
 * Whether a command can't run now, so focus passes over it.
 * @param {FoundCommand} command - The command
 * @returns {boolean} Whether it can't
 */
function cannotRun(command) {
  return !command.enabled
}

/**
 * What a found command is called.
 * @param {FoundCommand} command - The command
 * @returns {string} Its label
 */
function labelOf(command) {
  return command.label
}

/**
 * Its key in the results.
 * @param {FoundCommand} command - The command
 * @returns {string} Its id
 */
function idOf(command) {
  return command.id
}

/**
 * A command palette's behavior, with no DOM: a search field's query, the commands found for it in a listbox that
 * selects nothing and passes over commands that can't run, and the modal layer it opens in. The command system finds
 * the commands (its own search, or the bridge's by label); an answer for a query no longer typed is dropped. A command
 * chosen runs once the palette has gone and focus is back where it was, in the context it opened in.
 * @template C
 */
class Palette {
  /** @readonly */
  layer = new Layer({ modal: true })
  /**
   * What is typed in the search field.
   * @readonly
   */
  query = new Controllable('', false)
  /**
   * The commands found, best first.
   * @readonly
   * @type {Listbox<FoundCommand, Span>}
   */
  list
  /**
   * @readonly
   * @type {Listeners<undefined>}
   */
  #changes = new Listeners()
  /**
   * @readonly
   * @type {PaletteOptions<C>}
   */
  #options
  /**
   * The context it opened in, which its commands are found and run in: held in an object, since the context itself may
   * be undefined (every command, for some systems).
   * @type {Readonly<{ context: C }> | undefined}
   */
  #at = undefined
  /**
   * The searches asked for, of which only the latest is shown.
   * @readonly
   */
  #searches = new Latest()
  /**
   * Stops hearing the bridge's changes.
   * @readonly
   * @type {() => void}
   */
  #unfollow

  /** @param {PaletteOptions<C>} options - How it starts */
  constructor(options) {
    this.#options = options
    /** @readonly */
    this.id = options.id ?? 'palette'
    /** @readonly */
    this.label = options.label ?? 'Commands'
    /** @readonly */
    this.searchLabel = options.searchLabel ?? 'Search commands'
    /** @readonly */
    this.placeholder = options.placeholder
    this.list = new Listbox({
      id: `${this.id}-result`,
      label: this.label,
      mode: 'none',
      rows: options.rows ?? DEFAULT_ROWS,
      skip: cannotRun,
      text: labelOf,
    })
    this.#unfollow = options.bridge.subscribe(() => {
      if (this.layer.open.get()) {
        void this.#search()
      }
    })
    this.#follow()
  }

  /**
   * Stops following the bridge, for a palette that is done with.
   * @returns {void}
   */
  dispose() {
    this.#unfollow()
  }

  /**
   * Opens the palette with nothing typed, finding every command in the context it opens in.
   * @returns {void}
   */
  open() {
    this.#at = { context: this.#options.context() }
    this.query.set('')
    this.layer.open.request(true)
    void this.#search()
  }

  /**
   * Asks to close the palette, running nothing.
   * @returns {void}
   */
  close() {
    this.layer.open.request(false)
  }

  /**
   * Asks for a new query, as typing in the search field does.
   * @param {string} text - What is typed now
   * @returns {void}
   */
  type(text) {
    this.query.request(text)
  }

  /**
   * Acts on a key typed in the search field, if it is the results': the arrows and page keys move the active command,
   * and Enter runs it. The rest edit the query.
   * @param {string} key - The key, as `KeyboardEvent.key` names it
   * @returns {boolean} Whether it was the results', so its default should be prevented
   */
  key(key) {
    if (key === 'Enter') {
      const active = this.list.active.get()
      if (active !== undefined) {
        this.run(active)
      }
      return true
    }
    return fieldListKey(this.list, key)
  }

  /**
   * Runs the command found at a position, if it can run: the palette closes, and once it has gone and focus is back
   * where it was, the command runs in the context the palette opened in.
   * @param {number} position - Where it is among the results
   * @returns {boolean} Whether there was a command there that can run
   */
  run(position) {
    const command = this.list.items.item(position)
    const at = this.#at
    if (command === undefined || !command.enabled || at === undefined) {
      return false
    }
    this.close()
    this.layer.afterHidden(() => {
      this.#options.bridge.run(command.id, at.context)
    })
    return true
  }

  /**
   * Calls `listener` whenever anything a view shows may have changed.
   * @param {() => void} listener - What to call
   * @returns {() => void} Stops calling it
   */
  subscribe(listener) {
    return this.#changes.add(() => {
      listener()
    })
  }

  /**
   * Finds the commands for the query now, keeping what shows until they are found.
   * @returns {Promise<void>} When they are shown, or dropped for a later query
   */
  async #search() {
    const at = this.#at
    if (at === undefined) {
      return
    }
    const query = this.query.get()
    const found = await this.#searches.ask(async () => this.#options.bridge.search(query, at.context))
    if (found !== undefined && this.layer.open.get()) {
      this.#show(found.answer)
    }
  }

  /**
   * Shows what was found, the first command that can run active.
   * @param {readonly FoundCommand[]} found - What was found, best first
   * @returns {void}
   */
  #show(found) {
    const shown = this.#options.inactive === 'hide' ? found.filter((command) => command.enabled) : found
    this.list.source.set(new MemorySource(shown, idOf, labelOf))
    const first = landing(this.list, 0, 1)
    if (first !== undefined) {
      this.list.goTo(first)
    }
  }

  /**
   * Follows its own state: a new query is searched for; closing forgets what was found; every change is reported. (A
   * change the bridge reports is searched for while it is open, from the constructor.)
   * @returns {void}
   */
  #follow() {
    this.query.subscribe(() => {
      void this.#search()
      this.#changes.emit(undefined)
    })
    this.layer.open.subscribe((open) => {
      if (!open) {
        this.#searches.drop()
        this.list.source.set(undefined)
      }
      this.#changes.emit(undefined)
    })
    this.list.subscribe(() => {
      this.#changes.emit(undefined)
    })
  }
}

export { Palette }
