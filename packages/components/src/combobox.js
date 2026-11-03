/**
 * @import { DismissReason } from '@interact/core/layer'
 * @import { ComboboxModifiers } from './combobox-keys.js'
 * @import { OpenAt } from './combobox-landing.js'
 * @import { ComboboxKind, ComboboxOptions } from './combobox-options.js'
 */

import { Controllable, Layer, Listeners, startsWithTyped } from '@interact/core'

import { comboboxKey } from './combobox-keys.js'
import { landingFor } from './combobox-landing.js'
import { kindOf, listOptions } from './combobox-options.js'
import { Suggestions } from './combobox-suggest.js'
import { Latest } from './latest.js'
import { Listbox } from './listbox.js'

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
    /**
     * The options.
     * @readonly
     * @type {Listbox<T, F>}
     */
    this.list = new Listbox(listOptions(options, this.id))
    const { suggest } = this.kind
    /**
     * What it suggests as its text changes, if it autocompletes.
     * @readonly
     */
    this.suggestions =
      suggest === undefined
        ? undefined
        : new Suggestions({ land: async (at) => this.#land(at), layer: this.layer, list: this.list, suggest })
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
   * Acts on a key typed in the field, as the APG combobox pattern says for its kind.
   * @param {string} key - The key, as `KeyboardEvent.key` names it
   * @param {ComboboxModifiers} modifiers - What was held
   * @returns {boolean} Whether it was used, so its default should be prevented
   */
  key(key, modifiers) {
    return comboboxKey(this, key, modifiers)
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
   * Makes an option active as the list opens, where `at` says. A later landing, or the list closing, drops this one.
   * @param {OpenAt} at - Where
   * @returns {Promise<void>} When it has landed, or not
   */
  async #land(at) {
    const landed = await this.#landings.ask(async () => landingFor(this.list, this.value.get(), at))
    if (landed?.answer !== undefined && this.layer.open.get()) {
      this.list.goTo(landed.answer)
    }
  }

  /**
   * Follows its own state: an editable field's text follows the option chosen; leaving with the list open chooses its
   * active option when it selects by itself; every change is reported.
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
      this.#left(reason)
    })
    this.#followOpen()
    for (const changing of [this.text, this.list]) {
      changing.subscribe(() => {
        this.#changes.emit(undefined)
      })
    }
  }

  /**
   * Closing drops a landing still to come, and leaves no option active.
   * @returns {void}
   */
  #followOpen() {
    this.layer.open.subscribe((open) => {
      if (!open) {
        this.#landings.drop()
        this.list.active.request(undefined)
      }
      this.#changes.emit(undefined)
    })
  }

  /**
   * The list dismissed: leaving it (Tab, a press elsewhere) chooses its active option when the combobox selects by
   * itself.
   * @param {DismissReason} reason - Why it was dismissed
   * @returns {void}
   */
  #left(reason) {
    const active = this.list.active.get()
    const leaving = reason === 'outside' || reason === 'focus-outside'
    if (this.kind.selectsOnLeave && leaving && active !== undefined) {
      this.choose(active)
    }
  }
}

export { Combobox }
