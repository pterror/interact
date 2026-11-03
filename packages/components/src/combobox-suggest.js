/**
 * @import { Layer } from '@interact/core/layer'
 * @import { Source } from '@interact/core/source'
 * @import { OpenAt } from './combobox-landing.js'
 * @import { Suggest } from './combobox-options.js'
 * @import { Listbox } from './listbox.js'
 */

import { Latest } from './latest.js'

const NONE = 0

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
   * @param {Readonly<{
   *   suggest: Suggest<T, F>,
   *   list: Listbox<T, F>,
   *   layer: Layer,
   *   land: (at: OpenAt) => Promise<void>,
   * }>} parts - What finds the options for some text, the list they are shown in, its layer, opened on them, and
   *   what makes an option active once they are shown
   */
  constructor({ land, layer, list, suggest }) {
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
   * Finds the options for some text, and shows them unless something else was asked for meanwhile.
   * @param {string} text - The text
   * @returns {Promise<void>} When they are shown, or dropped
   */
  async #find(text) {
    const found = await this.#latest.ask(async () => this.#suggest(text))
    if (found !== undefined) {
      await this.#show(found.answer)
    }
  }

  /**
   * Shows options found, opening the list and making one active where asked; with none, closes the list.
   * @param {Source<T, F> | undefined} source - The options found
   * @returns {Promise<void>} When one is active, if one is asked for
   */
  async #show(source) {
    this.#list.source.set(source)
    if (this.#list.items.count === NONE) {
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

export { Suggestions }
