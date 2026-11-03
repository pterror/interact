/**
 * @import { ComponentClass } from '@interact/dom/component'
 * @import { Palette } from './palette.js'
 */

import { component } from '@interact/dom'

import { paletteView } from './palette-view.js'

/**
 * The command palette as a custom element class, opened with its palette's `open`: nothing is registered until the app
 * calls `register`. `create` makes each instance's palette from its element.
 * @template C
 * @param {(host: HTMLElement) => Palette<C>} create - Makes an instance's palette
 * @returns {ComponentClass<Palette<C>>} The class
 */
function paletteElement(create) {
  return component(paletteView(), create)
}

export { paletteElement }
