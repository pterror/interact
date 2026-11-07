/**
 * What a key does in a menu, as the WAI-ARIA Authoring Practices menu pattern has it.
 * @import { Modifiers } from './listbox-keys.js'
 * @import { Activation, Menu } from './menu.js'
 */

/**
 * The activation a key means, if any: Enter, or Space unless it is part of what is being typed.
 * @template F
 * @param {Menu<F>} menu - The menu
 * @param {string} key - The key
 * @param {Modifiers} modifiers - What was held
 * @returns {Activation | undefined} The activation
 */
function activationOf(menu, key, modifiers) {
  if (key === 'Enter') {
    return 'enter'
  }
  return key === ' ' && !modifiers.shift && !modifiers.toggle && !menu.list.typing ? 'space' : undefined
}

/**
 * Closes a menu if it is a submenu, so focus goes back to the menu it opened from.
 * @template F
 * @param {Menu<F>} menu - The menu
 * @returns {boolean} Whether it was one
 */
function closeIfSubmenu(menu) {
  if (menu.parent !== undefined) {
    menu.close()
  }
  return menu.parent !== undefined
}

/**
 * Acts on a key in a menu: the arrows, Home, End and typing move among the items, passing over separators; Enter runs
 * the active item or opens its submenu; Space does too, but leaves the menu open for a checkbox or radio item; the
 * arrow toward the inline end opens a submenu with focus on its first item, and the one back closes a submenu. Escape
 * and Tab are its layer's: Escape closes the menu focus is in, and Tab moving focus out closes them all.
 * @template F
 * @param {Menu<F>} menu - The menu
 * @param {string} key - The key, as `KeyboardEvent.key` names it
 * @param {Readonly<{ modifiers: Modifiers, direction: 'ltr' | 'rtl' }>} how - What was held, and which way text runs,
 *   which says which arrow is toward the inline end
 * @returns {boolean} Whether it meant something, so its default should be prevented
 */
function menuKey(menu, key, { direction, modifiers }) {
  const [inward, outward] = direction === 'rtl' ? ['ArrowLeft', 'ArrowRight'] : ['ArrowRight', 'ArrowLeft']
  const active = menu.list.active.get()
  if (key === inward) {
    return active !== undefined && menu.openSubmenu(active, true)
  }
  if (key === outward) {
    return closeIfSubmenu(menu)
  }
  const activation = activationOf(menu, key, modifiers)
  if (activation !== undefined) {
    return active !== undefined && menu.activate(active, activation)
  }
  return !modifiers.toggle && menu.list.key(key, modifiers)
}

export { menuKey }
