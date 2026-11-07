/**
 * @import { Store } from '@interact/core/store'
 * @import { View } from '@interact/dom/component'
 */

import { storeView } from '@interact/dom'

import { listboxStyles } from './listbox-styles.js'

/**
 * The listbox's default web view: what its store's extensions render, with the listbox's stylesheet.
 * @returns {View<Store>} The view
 */
function listboxView() {
  return storeView({ kind: 'listbox', styles: listboxStyles })
}

export { listboxView }
