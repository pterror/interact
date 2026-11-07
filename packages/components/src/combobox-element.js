/**
 * @import { Store } from '@interact/core/store'
 * @import { ComponentClass } from '@interact/dom/component'
 */

import { component } from '@interact/dom'

import { comboboxView } from './combobox-view.js'

/**
 * The combobox as a custom element class: nothing is registered until the app calls `register`. `create` makes each
 * instance's combobox from its element.
 * @param {(host: HTMLElement) => Store} create - Makes an instance's combobox
 * @returns {ComponentClass<Store>} The class
 */
function comboboxElement(create) {
  return component(comboboxView(), create)
}

export { comboboxElement }
