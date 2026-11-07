/** @import { Source } from '@interact/core/source' */

import { Controllable, Layer, Listeners, startsWithTyped } from '@interact/core'

import { PLAIN } from './field-keys.js'
import { Latest } from './latest.js'
import { landing } from './legacy-landing.js'
import { Listbox } from './legacy-listbox.js'

/**
 * The options for what is typed, at once or later: the app's (or its server's) to find, `undefined` for none.
 * @template T, F
 * @typedef {(text: string) => Source<T, F> | undefined | Promise<Source<T, F> | undefined>} Suggest
 */

/**
 * What every combobox has: its id (unique in the page for light DOM), its accessible name, what a select-only one
 * shows with nothing chosen, how many options show at once, the clock typing is timed by, what an option is called,
 * and the option chosen to start with.
 * @template T
 * @typedef {Readonly<{
 *   id?: string,
 *   label?: string,
 *   placeholder?: string,
 *   rows?: number,
 *   now?: () => number,
 *   text?: (item: T) => string,
 *   value?: T,
 * }>} ComboboxBasics
 */

/**
 * How a combobox starts. Select-only: a button-like field and a fixed list of options, found by typing their first
 * letters. Editable without autocomplete: a text field over a fixed list. Editable with `list` autocomplete: the options
 * are what `suggest` finds for the text; with `both`, the active option's text also completes the field inline. List
 * autocomplete makes the first option found active itself (`automatic`) or waits for the arrows (`manual`); `both` is
 * always automatic. `clearOnEscape`: Escape with the list closed empties the field (by default it does).
 * @template T, F
 * @typedef {(ComboboxBasics<T> & Readonly<{ kind: 'select-only', source?: Source<T, F> }>)
 *   | (ComboboxBasics<T> & Readonly<{
 *     kind: 'editable', autocomplete?: 'none', source?: Source<T, F>, clearOnEscape?: boolean,
 *   }>)
 *   | (ComboboxBasics<T> & Readonly<{
 *     kind: 'editable',
 *     autocomplete: 'list' | 'both',
 *     suggest: Suggest<T, F>,
 *     selection?: 'manual' | 'automatic',
 *     clearOnEscape?: boolean,
 *   }>)} ComboboxOptions
 */

/**
 * What kind of combobox the options make: whether its field is editable, how it autocompletes, whether leaving with
 * its list open chooses the active option (select-only, `automatic`, `both`), whether Escape empties it, and what it
 * suggests from, if it suggests.
 * @template T, F
 * @typedef {Readonly<{
 *   editable: boolean,
 *   autocomplete: 'none' | 'list' | 'both',
 *   selectsOnLeave: boolean,
 *   clearsOnEscape: boolean,
 *   suggest: Suggest<T, F> | undefined,
 * }>} ComboboxKind
 */

/**
 * Where the active option goes as a combobox's list opens: nowhere, the option chosen (or nowhere), the option chosen
 * or else the first, the first, or the last.
 * @typedef {'none' | 'value' | 'value-or-first' | 'first' | 'last'} OpenAt
 */

/**
 * What was held with a key: Alt, Shift, and Control or Command.
 * @typedef {Readonly<{ alt: boolean, shift: boolean, toggle: boolean }>} ComboboxModifiers
 */

const DEFAULT_ROWS = 10
/** A key that types one character: `KeyboardEvent.key` names every other key with a word. */
const ONE_CHARACTER = /^.$/su
const MOVES = new Set(['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp'])
/** Keys that put the cursor back in an editable field's text, keeping what completed it, so no option is active. */
const TO_FIELD = new Set(['Home', 'End', 'ArrowLeft', 'ArrowRight'])

/**
 * What kind of combobox options make.
 * @template T, F
 * @param {ComboboxOptions<T, F>} options - The options
 * @returns {ComboboxKind<T, F>} The kind
 */
function kindOf(options) {
  if (options.kind === 'select-only') {
    return { autocomplete: 'none', clearsOnEscape: false, editable: false, selectsOnLeave: true, suggest: undefined }
  }
  const clearsOnEscape = options.clearOnEscape ?? true
  if (!('suggest' in options)) {
    return { autocomplete: 'none', clearsOnEscape, editable: true, selectsOnLeave: false, suggest: undefined }
  }
  const automatic = options.autocomplete === 'both' || options.selection === 'automatic'
  return {
    autocomplete: options.autocomplete,
    clearsOnEscape,
    editable: true,
    selectsOnLeave: automatic,
    suggest: options.suggest,
  }
}

/**
 * Whether a key is a character typed, with nothing but Shift held.
 * @param {string} key - The key
 * @param {ComboboxModifiers} modifiers - What was held
 * @returns {boolean} Whether it is
 */
function printable(key, modifiers) {
  return ONE_CHARACTER.test(key) && !modifiers.alt && !modifiers.toggle
}

/**
 * What an editable combobox with list autocomplete suggests: the options found for its text, shown in its list as they
 * arrive, opening it, or closing it when there are none. Only the answer for the text asked last is shown.
 * @template T, F
 */
class Suggestions {
  /** @readonly */
  #latest = new Latest()
  /**
   * Where the active option goes once the options asked for are shown, if anywhere.
   * @type {OpenAt | undefined}
   */
  #openAt = undefined
  /**
   * @readonly
   * @type {Suggest<T, F>}
   */
  #suggest
  /**
   * @readonly
   * @type {Listbox<T, F>}
   */
  #list
  /**
   * @readonly
   * @type {Layer}
   */
  #layer
  /**
   * @readonly
   * @type {(at: OpenAt) => Promise<void>}
   */
  #land

  /**
   * @param {Suggest<T, F>} suggest - What finds the options for some text
   * @param {Listbox<T, F>} list - The list they are shown in
   * @param {Layer} layer - Its layer, opened on them
   * @param {(at: OpenAt) => Promise<void>} land - What makes an option active once they are shown
   */
  constructor(suggest, list, layer, land) {
    this.#suggest = suggest
    this.#list = list
    this.#layer = layer
    this.#land = land
  }

  /**
   * Opens the list on the options for some text, its active option where `at` says.
   * @param {string} text - The text
   * @param {OpenAt} at - Where the active option goes
   * @returns {void}
   */
  open(text, at) {
    this.#openAt = at
    void this.#find(text)
  }

  /**
   * Text typed: its options are found, the first made active if the combobox selects by itself. Empty text closes
   * the list instead.
   * @param {string} text - The text
   * @param {boolean} selects - Whether the combobox selects by itself
   * @returns {void}
   */
  typed(text, selects) {
    if (text === '') {
      this.drop()
      this.#layer.open.request(false)
      return
    }
    this.#openAt = selects ? 'first' : undefined
    void this.#find(text)
  }

  /**
   * Drops every answer still to come.
   * @returns {void}
   */
  drop() {
    this.#latest.drop()
  }

  /**
   * Finds the options for some text and, unless something else was asked for meanwhile, shows them, opening the list
   * and making one active where asked; with none, closes the list.
   * @param {string} text - The text
   * @returns {Promise<void>} When they are shown and one is active, if one is asked for, or they were dropped
   */
  async #find(text) {
    const found = await this.#latest.ask(async () => this.#suggest(text))
    if (found === undefined) {
      return
    }
    this.#list.source.set(found.answer)
    if (this.#list.items.count === 0) {
      this.#layer.open.request(false)
      return
    }
    this.#layer.open.request(true)
    const at = this.#openAt
    this.#openAt = undefined
    if (at !== undefined) {
      await this.#land(at)
    }
  }
}

/**
 * A combobox's behavior, with no DOM (the WAI-ARIA APG combobox pattern): a field, the list of options it controls in
 * a layer of its own, and the option chosen, its `value`. Focus stays in the field; the list's active option is where
 * keys act. The option chosen is controllable, and so is an editable field's text, which follows it. Options come from
 * a source, ten or ten billion at the same cost. Leaving with the list open (Tab, a press elsewhere) chooses its active
 * option when the combobox selects by itself (`kind.selectsOnLeave`); Escape never does.
 * @template T, F
 */
class Combobox {
  /** @readonly */
  layer = new Layer()
  /**
   * What an editable combobox's field holds.
   * @readonly
   */
  text = new Controllable('', false)
  /**
   * @readonly
   * @type {Listeners<undefined>}
   */
  #changes = new Listeners()
  /**
   * The landings asked for as the list opens, of which only the latest counts.
   * @readonly
   */
  #landings = new Latest()
  #deleting = false

  /** @param {ComboboxOptions<T, F>} options - How it starts */
  constructor(options) {
    /** @readonly */
    this.id = options.id ?? 'combobox'
    /** @readonly */
    this.label = options.label ?? ''
    /** @readonly */
    this.placeholder = options.placeholder ?? ''
    /**
     * @readonly
     * @type {ComboboxKind<T, F>}
     */
    this.kind = kindOf(options)
    /**
     * The option chosen, if any.
     * @readonly
     * @type {Controllable<T | undefined>}
     */
    this.value = new Controllable(options.value, false)
    const source = 'source' in options ? options.source : undefined
    /**
     * The options, in a list that selects nothing, whose active option is the one the field names; fixed for a
     * combobox that doesn't suggest.
     * @readonly
     * @type {Listbox<T, F>}
     */
    this.list = new Listbox({
      id: `${this.id}-option`,
      label: options.label ?? '',
      mode: 'none',
      rows: options.rows ?? DEFAULT_ROWS,
      ...(source === undefined ? {} : { source }),
      ...(options.text === undefined ? {} : { text: options.text }),
      ...(options.now === undefined ? {} : { now: options.now }),
    })
    const { suggest } = this.kind
    /**
     * What it suggests as its text changes, if it autocompletes.
     * @readonly
     */
    this.suggestions =
      suggest === undefined ? undefined : new Suggestions(suggest, this.list, this.layer, async (at) => this.#land(at))
    this.#follow()
  }

  /**
   * Opens the list, its active option where `at` says; one that suggests finds its options for the text first, and
   * stays closed if there are none.
   * @param {OpenAt} [at] - Where the active option goes
   * @returns {void}
   */
  open(at = 'value') {
    if (this.suggestions === undefined) {
      this.layer.open.request(true)
      void this.#land(at)
    } else {
      this.suggestions.open(this.text.get(), at)
    }
  }

  /**
   * Asks to close the list, choosing nothing.
   * @returns {void}
   */
  close() {
    this.layer.open.request(false)
  }

  /**
   * Opens the list if it is closed, closes it if it is open: what a press on the field does.
   * @returns {void}
   */
  toggle() {
    if (this.layer.open.get()) {
      this.close()
    } else {
      this.open('value-or-first')
    }
  }

  /**
   * Chooses the option at a position, if it has been read, and closes the list.
   * @param {number} position - Where it is among the options
   * @returns {boolean} Whether there was an option there
   */
  choose(position) {
    const item = this.list.items.item(position)
    if (item === undefined) {
      return false
    }
    this.value.request(item)
    this.close()
    return true
  }

  /**
   * Chooses the active option, if there is one, and closes the list.
   * @returns {void}
   */
  chooseActive() {
    const active = this.list.active.get()
    if (active === undefined || !this.choose(active)) {
      this.close()
    }
  }

  /**
   * Empties an editable field, choosing nothing.
   * @returns {void}
   */
  clear() {
    this.suggestions?.drop()
    this.text.request('')
    this.value.request(undefined)
  }

  /**
   * New text typed in an editable field: nothing is chosen any more, and one that suggests finds its options for it,
   * opening its list on them.
   * @param {string} text - What the field holds now
   * @param {boolean} [deleting] - Whether it was deleting, so nothing completes it inline
   * @returns {void}
   */
  type(text, deleting = false) {
    this.#deleting = deleting
    this.text.request(text)
    if (this.value.get() !== undefined) {
      this.value.request(undefined)
    }
    this.suggestions?.typed(text, this.kind.selectsOnLeave)
  }

  /**
   * Acts on a key typed in the field, as the APG combobox pattern says for its kind, with its list closed or open.
   * Escape closes the list, choosing nothing; with it closed, it empties an editable field that clears on Escape.
   * @param {string} key - The key, as `KeyboardEvent.key` names it
   * @param {ComboboxModifiers} modifiers - What was held
   * @returns {boolean} Whether it was used, so its default should be prevented
   */
  key(key, modifiers) {
    if (key === 'Escape') {
      if (this.layer.open.get()) {
        this.layer.dismiss('escape')
        return true
      }
      if (this.kind.editable && this.kind.clearsOnEscape && this.text.get() !== '') {
        this.clear()
        return true
      }
      return false
    }
    if (this.layer.open.get()) {
      return this.kind.editable ? this.#openEditable(key, modifiers) : this.#openSelect(key, modifiers)
    }
    return this.kind.editable ? this.#closedEditable(key, modifiers) : this.#closedSelect(key, modifiers)
  }

  /**
   * The pointer over an option makes it active.
   * @param {number} position - Where it is
   * @returns {void}
   */
  point(position) {
    if (this.list.active.get() !== position) {
      this.list.active.request(position)
    }
  }

  /**
   * What the field shows with `both` autocomplete: what was typed, then the rest of the active option's text, while
   * the list is open, the option starts with what was typed, and the last edit was not a deletion.
   * @returns {string | undefined} The text shown, typed part and completion
   */
  get completion() {
    const active = this.list.active.get()
    const item = active === undefined ? undefined : this.list.items.item(active)
    const typed = this.text.get()
    if (this.kind.autocomplete !== 'both' || this.#deleting || item === undefined || typed === '') {
      return undefined
    }
    const whole = this.list.text(item)
    return this.layer.open.get() && startsWithTyped(whole, typed) ? `${typed}${whole.slice(typed.length)}` : undefined
  }

  /**
   * Keeps an inline completion as typed text, as moving the cursor into it does.
   * @returns {void}
   */
  keepCompletion() {
    const shown = this.completion
    if (shown !== undefined) {
      this.text.request(shown)
    }
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
   * Moves the active option in an open list: from none, Down and Page Down go to the first, Up and Page Up to the last.
   * @param {string} key - An arrow, page, Home or End key
   * @returns {boolean} True: the key was used
   */
  #moveIn(key) {
    const { list } = this
    if (list.active.get() !== undefined) {
      list.key(key, PLAIN)
      return true
    }
    const down = key === 'ArrowDown' || key === 'PageDown' || key === 'Home'
    const to = down ? landing(list, 0, 1) : landing(list, list.items.count - 1, -1)
    if (to !== undefined) {
      list.goTo(to)
    }
    return true
  }

  /**
   * A key with a select-only combobox's list closed: the arrows, Enter, Space, Home and End open it, and a character
   * typed opens it on the first option it starts.
   * @param {string} key - The key
   * @param {ComboboxModifiers} modifiers - What was held
   * @returns {boolean} Whether it was used
   */
  #closedSelect(key, modifiers) {
    if (key === 'ArrowDown' && modifiers.alt) {
      this.open('value')
    } else if (key === 'ArrowDown' || key === 'Enter' || key === ' ') {
      this.open('value-or-first')
    } else if (key === 'ArrowUp' || key === 'Home' || key === 'End') {
      this.open(key === 'End' ? 'last' : 'first')
    } else if (printable(key, modifiers)) {
      this.open('none')
      void this.list.type(key)
    } else {
      return false
    }
    return true
  }

  /**
   * A key with a select-only combobox's list open: the arrows, page keys, Home and End move the active option; Enter,
   * Space and Alt+Up choose it; a character typed goes to the option it starts (a space too, while typing goes on).
   * @param {string} key - The key
   * @param {ComboboxModifiers} modifiers - What was held
   * @returns {boolean} Whether it was used
   */
  #openSelect(key, modifiers) {
    const choosing = (key === 'ArrowUp' && modifiers.alt) || key === 'Enter' || (key === ' ' && !this.list.typing)
    if (choosing) {
      this.chooseActive()
      return true
    }
    if (MOVES.has(key) || key === 'Home' || key === 'End') {
      return this.#moveIn(key)
    }
    if (!printable(key, modifiers)) {
      return false
    }
    void this.list.type(key)
    return true
  }

  /**
   * A key with an editable combobox's list closed: Down opens it on the first option, Up on the last, Alt+Down on the
   * option chosen. The rest edit the text.
   * @param {string} key - The key
   * @param {ComboboxModifiers} modifiers - What was held
   * @returns {boolean} Whether it was used
   */
  #closedEditable(key, modifiers) {
    if (key === 'ArrowDown') {
      this.open(modifiers.alt ? 'value' : 'first')
      return true
    }
    if (key === 'ArrowUp' && !modifiers.alt) {
      this.open('last')
      return true
    }
    return false
  }

  /**
   * A key with an editable combobox's list open: the arrows and page keys move the active option; Enter and Alt+Up
   * choose it; Home, End and the left and right arrows put the cursor back in the text, with no option active.
   * @param {string} key - The key
   * @param {ComboboxModifiers} modifiers - What was held
   * @returns {boolean} Whether it was used
   */
  #openEditable(key, modifiers) {
    if (key === 'Enter' || (key === 'ArrowUp' && modifiers.alt)) {
      this.chooseActive()
      return true
    }
    if (MOVES.has(key)) {
      return this.#moveIn(key)
    }
    if (TO_FIELD.has(key) && this.list.active.get() !== undefined) {
      this.keepCompletion()
      this.list.active.request(undefined)
    }
    return false
  }

  /**
   * Makes an option active as the list opens, where `at` says, never on an option focus passes over: the option
   * chosen is found through the source's `positionOf`, without which it can't be found without reading every option.
   * A later landing, or the list closing, drops this one.
   * @param {OpenAt} at - Where
   * @returns {Promise<void>} When it has landed, or not
   */
  async #land(at) {
    const { list } = this
    const value = this.value.get()
    const landed = await this.#landings.ask(async () => {
      if (at === 'none') {
        return undefined
      }
      if (at === 'first' || at === 'last') {
        return at === 'first' ? landing(list, 0, 1) : landing(list, list.items.count - 1, -1)
      }
      const { source } = list.items
      const chosen =
        value === undefined || source === undefined ? undefined : await source.positionOf?.(source.key(value))
      return chosen ?? (at === 'value-or-first' ? landing(list, 0, 1) : undefined)
    })
    if (landed?.answer !== undefined && this.layer.open.get()) {
      this.list.goTo(landed.answer)
    }
  }

  /**
   * Follows its own state: an editable field's text follows the option chosen; leaving the list (Tab, a press
   * elsewhere) chooses its active option when it selects by itself; closing drops a landing still to come, and leaves
   * no option active; every change is reported.
   * @returns {void}
   */
  #follow() {
    this.value.subscribe((value) => {
      if (this.kind.editable && value !== undefined) {
        this.text.request(this.list.text(value))
      }
      this.#changes.emit(undefined)
    })
    this.layer.onDismiss((reason) => {
      const active = this.list.active.get()
      const leaving = reason === 'outside' || reason === 'focus-outside'
      if (this.kind.selectsOnLeave && leaving && active !== undefined) {
        this.choose(active)
      }
    })
    this.layer.open.subscribe((open) => {
      if (!open) {
        this.#landings.drop()
        this.list.active.request(undefined)
      }
      this.#changes.emit(undefined)
    })
    for (const changing of [this.text, this.list]) {
      changing.subscribe(() => {
        this.#changes.emit(undefined)
      })
    }
  }
}

export { Combobox }
