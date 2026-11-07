/**
 * @import { Store } from '@interact/core/store'
 * @import { View } from '@interact/dom/component'
 */

import { storeView } from '@interact/dom'

import { paletteStyles } from './palette-styles.js'

/**
 * The command palette's default web view: what its store's extensions render, with the palette's stylesheet.
 * @returns {View<Store>} The view
 */
function paletteView() {
  return storeView({ kind: 'command-palette', styles: paletteStyles })
}

export { paletteView }
