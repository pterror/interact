/**
 * What a menu holds, as the WAI-ARIA Authoring Practices menu pattern has it: commands, checkbox and radio items,
 * separators between groups (radio items that go together sit between two), and items that open a submenu of their
 * own. Whether an item is checked is the app's: activating it is reported, and the app changes its items.
 * @import { Source } from '@interact/core/source'
 */

/**
 * One entry in a menu. Every kind has an `id`, unique in its menu. An item has a `label`, may be `disabled` (it can
 * still take focus, but does nothing), and may show a `shortcut`, the keys that run it, as people read them.
 * @template F
 * @typedef {Readonly<
 *   | { kind: 'command', id: string, label: string, disabled?: boolean, shortcut?: string }
 *   | { kind: 'checkbox', id: string, label: string, checked: boolean, disabled?: boolean, shortcut?: string }
 *   | { kind: 'radio', id: string, label: string, checked: boolean, disabled?: boolean, shortcut?: string }
 *   | { kind: 'separator', id: string }
 *   | { kind: 'submenu', id: string, label: string, items: Source<MenuEntry<F>, F>, disabled?: boolean }
 * >} MenuEntry
 */

/**
 * An entry that is an item, not a separator.
 * @template F
 * @typedef {Exclude<MenuEntry<F>, Readonly<{ kind: 'separator' }>>} MenuItem
 */

/**
 * Whether focus passes over an entry: a separator, which only divides.
 * @template F
 * @param {MenuEntry<F>} entry - The entry
 * @returns {boolean} Whether it is a separator
 */
function isSeparator(entry) {
  return entry.kind === 'separator'
}

/**
 * What an entry is called, for typing to find it: its label, or nothing for a separator.
 * @template F
 * @param {MenuEntry<F>} entry - The entry
 * @returns {string} Its text
 */
function entryText(entry) {
  return entry.kind === 'separator' ? '' : entry.label
}

/**
 * The role an entry has: a menu item of its kind, or a separator.
 * @template F
 * @param {MenuEntry<F>} entry - The entry
 * @returns {'menuitem' | 'menuitemcheckbox' | 'menuitemradio' | 'separator'} Its role
 */
function entryRole(entry) {
  if (entry.kind === 'checkbox') {
    return 'menuitemcheckbox'
  }
  if (entry.kind === 'radio') {
    return 'menuitemradio'
  }
  return entry.kind === 'separator' ? 'separator' : 'menuitem'
}

export { entryRole, entryText, isSeparator }
