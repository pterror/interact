/**
 * @import { Store } from '@interact/core/store'
 * @import { View } from '@interact/dom/component'
 */

import { storeView } from '@interact/dom'

import { comboboxStyles } from './combobox-styles.js'

/**
 * The combobox's default web view: what its store's extensions render, with the combobox's stylesheet.
 * @returns {View<Store>} The view
 */
function comboboxView() {
  return storeView({ kind: 'combobox', styles: comboboxStyles })
}

export { comboboxView }
