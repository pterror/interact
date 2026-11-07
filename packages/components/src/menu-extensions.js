/**
 * @import { MenuExtensions } from './menu.js'
 * @import { Wait } from './submenus.js'
 */

import { defaultRendering } from '@interact/dom'

import { focusEntering } from './focus-entering.js'
import { followPointer } from './follow-pointer.js'
import { navigation } from './navigation.js'
import { submenus } from './submenus.js'
import { typeahead } from './typeahead.js'
import { windowing } from './windowing.js'

const DEFAULT_ROWS = 10

/**
 * What a menu and each of its submenus are made of besides their core, as the WAI-ARIA Authoring Practices menu
 * pattern has it: keyboard navigation, typeahead, focus entering, the active item following the pointer with focus,
 * submenus made the same way, windowing that shows as many rows as there are entries up to `rows`, and the default
 * rendering. An app making a menu of other parts gives its own.
 * @param {Readonly<{ rows?: number | undefined, wait?: Wait | undefined }>} [options] - The most rows a menu shows
 *   before scrolling (10), and how a submenu's opening waits for the pointer to rest (a timer)
 * @returns {MenuExtensions} The extensions
 */
function menuExtensions(options = {}) {
  const rows = options.rows ?? DEFAULT_ROWS
  /** @type {MenuExtensions} */
  const extensions = (menu) => [
    navigation(menu.current),
    typeahead(menu.current),
    submenus(menu, { extensions, wait: options.wait }),
    focusEntering(menu.current),
    followPointer(menu.current, { focus: true }),
    windowing(menu.list, { rows, shrink: true }),
    defaultRendering(menu.list, { role: 'menu', rowRole: 'menuitem' }),
  ]
  return extensions
}

export { menuExtensions }
