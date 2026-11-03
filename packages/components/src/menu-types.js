/**
 * @import { Source } from '@interact/core/source'
 * @import { Menu } from './menu.js'
 * @import { MenuEntry, MenuItem } from './menu-entry.js'
 */

/**
 * Waits, then runs something, unless stopped first.
 * @typedef {(milliseconds: number, run: () => void) => () => void} Wait
 */

/**
 * How a menu starts: its entries, an `id` its parts' ids start with (unique in the page for light DOM), its accessible
 * name, the most rows it shows before scrolling, how it waits (a test's clock, say), and, for a submenu, the menu it
 * opens from, which sets it.
 * @template F
 * @typedef {Readonly<{
 *   items?: Source<MenuEntry<F>, F>,
 *   id?: string,
 *   label?: string,
 *   rows?: number,
 *   wait?: Wait,
 *   parent?: Menu<F>,
 * }>} MenuOptions
 */

/**
 * An item chosen: which, where, and in which menu of a menu and its submenus.
 * @template F
 * @typedef {Readonly<{ entry: MenuItem<F>, position: number, menu: Menu<F> }>} MenuSelect
 */

/**
 * A submenu open from an entry: the entry's position, and the submenu.
 * @template F
 * @typedef {Readonly<{ position: number, menu: Menu<F> }>} OpenSubmenu
 */

/**
 * How an item was activated: Enter, Space, or a press with the pointer. Space on a checkbox or radio item leaves the
 * menu open; anything else that runs an item closes it.
 * @typedef {'enter' | 'space' | 'press'} Activation
 */

/**
 * Where focus goes as a menu opens: its first item, its last, or nowhere yet (a submenu opened by the pointer resting
 * on its entry).
 * @typedef {'first' | 'last' | 'none'} OpenFocus
 */

/**
 * Waits with a timer.
 * @type {Wait}
 */
function waitWithTimer(milliseconds, run) {
  const timer = setTimeout(run, milliseconds)
  return () => {
    clearTimeout(timer)
  }
}

export { waitWithTimer }
