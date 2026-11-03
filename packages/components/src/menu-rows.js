/**
 * A menu's rows, and what the pointer and keys do on them.
 * @import { TemplateResult } from '@interact/dom/template'
 * @import { Menu } from './menu.js'
 * @import { MenuEntry } from './menu-entry.js'
 * @import { Row } from './rows-view.js'
 */

import { intentArea } from '@interact/core'
import { deepActiveElement, html } from '@interact/dom'

import { entryRole } from './menu-entry.js'
import { menuKey } from './menu-keys.js'
import { modifiersOf, rowId, rowsViewport } from './rows-view.js'

/**
 * The parts a row has: every row's, and its kind's, and whether it is active or disabled.
 * @template F
 * @param {MenuEntry<F> | undefined} entry - Its entry, once read
 * @param {boolean} active - Whether it is the active item
 * @returns {string} The parts
 */
function partsOf(entry, active) {
  if (entry?.kind === 'separator') {
    return 'row separator'
  }
  const disabled = entry?.disabled === true ? ' item-disabled' : ''
  return `row item${active ? ' item-active' : ''}${disabled}`
}

/**
 * Whether a checkbox or radio item is checked, for `aria-checked`; nothing for other entries.
 * @template F
 * @param {MenuEntry<F> | undefined} entry - The entry
 * @returns {'true' | 'false' | undefined} The state
 */
function checkedOf(entry) {
  if (entry?.kind !== 'checkbox' && entry?.kind !== 'radio') {
    return undefined
  }
  return entry.checked ? 'true' : 'false'
}

/**
 * What shows beside a checked item: a check for a checkbox, a dot for a radio item.
 * @template F
 * @param {MenuEntry<F> | undefined} entry - The entry
 * @returns {string} The mark
 */
function markOf(entry) {
  if (checkedOf(entry) !== 'true') {
    return ''
  }
  return entry?.kind === 'radio' ? '•' : '✓'
}

/**
 * An item's place and the menu's size, for assistive technology, when only some rows are rendered; nothing for a
 * separator or an entry not yet read, or when every row is rendered and the browser counts them itself.
 * @template F
 * @param {Row} row - The row
 * @param {MenuEntry<F> | undefined} item - Its item, if it is one
 * @returns {Readonly<{ setsize: number, posinset: number }> | undefined} The place and size
 */
function placeIn(row, item) {
  return row.partial && item !== undefined ? { posinset: row.posinset, setsize: row.setsize } : undefined
}

/**
 * The pointer moved over a row: the menu makes it active, and focus comes to the menu's list unless it is there.
 * @template F
 * @param {Menu<F>} menu - The menu
 * @param {number} position - The row's position
 * @param {Event} event - The move
 * @returns {void}
 */
function pointed(menu, position, event) {
  const { currentTarget } = event
  if (!(event instanceof PointerEvent) || !(currentTarget instanceof Element)) {
    return
  }
  const viewport = currentTarget.closest('[part~="viewport"]')
  const took = menu.pointTo(position, { x: event.clientX, y: event.clientY })
  if (took && viewport instanceof HTMLElement && deepActiveElement(viewport.ownerDocument) !== viewport) {
    viewport.focus({ preventScroll: true })
  }
}

/**
 * The pointer left a row whose submenu is open: the area it may cross on its way there is noted.
 * @template F
 * @param {Menu<F>} menu - The menu
 * @param {number} position - The row's position
 * @param {Event} event - The leaving
 * @returns {void}
 */
function left(menu, position, event) {
  const { currentTarget } = event
  if (menu.submenu?.position !== position || !(event instanceof PointerEvent) || !(currentTarget instanceof Element)) {
    return
  }
  const submenu = currentTarget.closest('[part~="overlay"]')?.querySelector(':scope > [part~="submenu"]')
  if (submenu instanceof HTMLElement) {
    const rect = submenu.getBoundingClientRect()
    const area = { height: rect.height, width: rect.width, x: rect.x, y: rect.y }
    menu.headFor(intentArea({ x: event.clientX, y: event.clientY }, area))
  }
}

/**
 * One row: an item, with its check mark, label, shortcut and submenu arrow, or a separator; nothing until its entry
 * arrives. One template for every kind, so a row keeps its node whatever its entry turns out to be. When only some
 * rows are rendered, an item says its place and the menu's size, both counting separators (which entries before it are
 * separators isn't known without reading them); when all are, the browser counts them itself.
 * @template F
 * @param {Menu<F>} menu - The menu
 * @param {Row} row - Where it is
 * @returns {TemplateResult} The row
 */
function menuRow(menu, row) {
  const entry = menu.list.items.item(row.position)
  const item = entry?.kind === 'separator' ? undefined : entry
  const opens = item?.kind === 'submenu'
  return html`<div
    part=${partsOf(entry, row.active)}
    role=${entry === undefined ? 'menuitem' : entryRole(entry)}
    id=${row.id}
    aria-checked=${checkedOf(entry)}
    aria-disabled=${item?.disabled === true ? 'true' : undefined}
    aria-haspopup=${opens ? 'menu' : undefined}
    aria-expanded=${opens ? String(menu.submenu?.position === row.position) : undefined}
    aria-setsize=${placeIn(row, item)?.setsize}
    aria-posinset=${placeIn(row, item)?.posinset}
    aria-busy=${entry === undefined ? 'true' : false}
    data-offscreen=${row.offscreen}
    style=${row.style}
    @click=${() => {
      menu.activate(row.position, 'press')
    }}
    @pointermove=${(event) => {
      pointed(menu, row.position, event)
    }}
    @pointerleave=${(event) => {
      left(menu, row.position, event)
    }}
    ><span part="check" aria-hidden="true">${markOf(entry)}</span><span part="label">${item?.label ?? ''}</span
    ><span part="shortcut">${item !== undefined && item.kind !== 'submenu' ? (item.shortcut ?? '') : ''}</span
    ><span part="arrow" aria-hidden="true">${opens ? '›' : ''}</span></div
  >`
}

/**
 * A menu's list, and the overlay of its submenu inside it when one is open, named by `labelledby` (its button, or
 * the entry a submenu opened from) or else its label.
 * @template F
 * @param {Menu<F>} menu - The menu
 * @param {string | undefined} labelledby - The id of what names it
 * @returns {TemplateResult} The list, and its submenu's
 */
function menuBody(menu, labelledby) {
  const open = menu.submenu
  const list = rowsViewport(menu.list, {
    focus: () => {
      menu.list.focus()
    },
    id: `${menu.id}-menu`,
    keydown: (event) => {
      const target = event.currentTarget
      const direction = target instanceof Element && getComputedStyle(target).direction === 'rtl' ? 'rtl' : 'ltr'
      if (menuKey(menu, event.key, { direction, modifiers: modifiersOf(event) })) {
        event.preventDefault()
      }
    },
    label: labelledby === undefined ? menu.list.label : undefined,
    ...(labelledby === undefined ? {} : { labelledby }),
    multiselectable: false,
    role: 'menu',
    row: (row) => menuRow(menu, row),
  })
  const submenu =
    open === undefined
      ? undefined
      : html`<div part="overlay submenu" popover="manual">${menuBody(open.menu, rowId(menu.list, open.position))}</div>`
  return html`${list}${submenu}`
}

export { menuBody }
