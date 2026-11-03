/**
 * @import { ComponentClass } from '@interact/dom/component'
 * @import { Combobox } from './combobox.js'
 */

import { component } from '@interact/dom'

import { comboboxView } from './combobox-view.js'

/**
 * The combobox as a custom element class: nothing is registered until the app calls `register`. `create` makes each
 * instance's combobox from its element.
 * @template T, F
 * @param {(host: HTMLElement) => Combobox<T, F>} create - Makes an instance's combobox
 * @returns {ComponentClass<Combobox<T, F>>} The class
 */
function comboboxElement(create) {
  return component(comboboxView(), create)
}

export { comboboxElement }
