/**
 * @import { ItemSource } from '@interact/core/source'
 * @import { Builder, EffectType, Extension } from '@interact/core/state'
 * @import { TemplateResult } from '@interact/dom/template'
 * @import { ActiveItem } from './active-item.js'
 */

import { defineEffect, inputHandler, keyInput, precedence } from '@interact/core'
import { viewContent } from '@interact/dom'

/**
 * What makes a list a listbox, and no more: the list is a `listbox` with an accessible name and its rows are options,
 * each with an id (its listbox's id and its position, unique in the page for light DOM) that the active item names as
 * the list's active descendant; Enter, or a double press, activates an item (`activated`); and the list is what the
 * listbox's view shows. Everything else a listbox does is an extension given beside it: keyboard navigation,
 * typeahead, selection, focus entering, windowing, and a rendering, such as the default one.
 * @template T
 * @template {ItemSource<T>} S
 */
class Listbox {
  /**
   * An item activated, by its position: what Enter or a double press does.
   * @readonly
   * @type {EffectType<number>}
   */
  activated = defineEffect()
  /**
   * @readonly
   * @type {ActiveItem<T, TemplateResult, S>}
   */
  #current
  /**
   * @readonly
   * @type {string}
   */
  #id
  /**
   * @readonly
   * @type {string | undefined}
   */
  #label

  /**
   * @param {ActiveItem<T, TemplateResult, S>} current - The list's active item
   * @param {string} id - What its options' ids start with
   * @param {string | undefined} label - Its accessible name
   */
  constructor(current, id, label) {
    this.#current = current
    this.#id = id
    this.#label = label
  }

  /**
   * The id of the option at a position.
   * @param {number} position - Where it is
   * @returns {string} Its id
   */
  rowId(position) {
    return `${this.#id}-${String(position)}`
  }

  /**
   * Puts the listbox in a configuration.
   * @param {Builder} into - The configuration being built
   * @param {number} level - Its level
   * @returns {void}
   */
  install(into, level) {
    const current = this.#current
    const { list } = current
    /** @type {Extension} */
    const parts = [
      current,
      list.attributes.of((row) =>
        row.kind === 'item' ? { id: this.rowId(row.position), part: 'option', role: 'option' } : {},
      ),
      list.containerAttributes.of(() => ({
        'aria-label': this.#label === '' ? undefined : this.#label,
        role: 'listbox',
      })),
      inputHandler.of((input, store) => {
        if (!input.is(keyInput) || input.value.key !== 'Enter' || list.listOf(store.state).count() === 0) {
          return false
        }
        const at = current.positionIn(store.state)
        if (at !== undefined) {
          store.dispatch({ effects: this.activated.of(at) })
        }
        return true
      }),
      precedence(
        'high',
        inputHandler.of((input, store) => {
          if (!input.is(list.press) || input.value.count < 2) {
            return false
          }
          store.dispatch({ effects: this.activated.of(input.value.position) })
          return true
        }),
      ),
      viewContent.of((state) => list.render(state)),
    ]
    into.add(parts, level)
  }
}

/**
 * The listbox core for a list.
 * @template T
 * @template {ItemSource<T>} S
 * @param {ActiveItem<T, TemplateResult, S>} current - The list's active item
 * @param {Readonly<{ id?: string | undefined, label?: string | undefined }>} [options] - What its options' ids start with (`listbox` by
 *   default), and its accessible name
 * @returns {Listbox<T, S>} The extension
 */
function listbox(current, options = {}) {
  return new Listbox(current, options.id ?? 'listbox', options.label)
}

export { Listbox, listbox }
