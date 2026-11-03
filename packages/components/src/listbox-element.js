/**
 * @import { ComponentClass } from '@interact/dom/component'
 * @import { Listbox } from './listbox.js'
 */

import { component } from '@interact/dom'

import { listboxView } from './listbox-view.js'

/**
 * The listbox as a custom element class, made when asked, since it needs `HTMLElement`; nothing is registered until
 * the app calls `register`. `create` makes each instance's listbox from its element, so an instance adopting server
 * markup can start with the source and state the server rendered.
 * @template T, F
 * @param {(host: HTMLElement) => Listbox<T, F>} create - Makes an instance's listbox
 * @returns {ComponentClass<Listbox<T, F>>} The class
 */
function listboxElement(create) {
  return component(listboxView(), create)
}

export { listboxElement }
