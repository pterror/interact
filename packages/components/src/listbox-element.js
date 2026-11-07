/**
 * @import { Store } from '@interact/core/store'
 * @import { ComponentClass } from '@interact/dom/component'
 */

import { component } from '@interact/dom'

import { listboxView } from './listbox-view.js'

/**
 * The listbox as a custom element class, made when asked, since it needs `HTMLElement`; nothing is registered until
 * the app calls `register`. `create` makes each instance's store, with the listbox and whichever of its extensions
 * the app wants, from its element, so an instance adopting server markup can start in the state the server rendered.
 * @param {(host: HTMLElement) => Store} create - Makes an instance's store
 * @returns {ComponentClass<Store>} The class
 */
function listboxElement(create) {
  return component(listboxView(), create)
}

export { listboxElement }
