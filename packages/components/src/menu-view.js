/**
 * A menu's default web views: a menu button (a button that opens its menu below it) and a context menu (a menu that
 * opens at a point), each with its submenus in overlays inside its own; and a menu's rows, and what the pointer and
 * keys do on them.
 * @import { Placement } from '@interact/dom/anchored'
 * @import { View } from '@interact/dom/component'
 * @import { TemplateResult } from '@interact/dom/template'
 * @import { Menu } from './menu.js'
 * @import { MenuEntry } from './menu-entry.js'
 * @import { Row } from './legacy-rows-view.js'
 */

import { intentArea } from '@interact/core'
import { deepActiveElement, html, releaseOverlay, syncOverlay } from '@interact/dom'

import { modifiersOf, rowId, rowsViewport, syncRows } from './legacy-rows-view.js'
import { entryRole } from './menu-entry.js'
import { menuKey } from './menu-keys.js'
import { menuStyles } from './menu-styles.js'

/**
 * The overlay each menu's submenu is shown in, and which submenu, so it is let go when that submenu closes.
 * @type {WeakMap<object, Readonly<{ element: HTMLElement, submenu: object }>>}
 */
const shown = new WeakMap()

/**
 * Where a submenu goes: beside its entry toward the inline end, lined up with it.
 * @type {Partial<Placement>}
 */
const SUBMENU_PLACEMENT = { align: 'start', gap: 0, side: 'inline-end' }

/**
 * Where a context menu goes: its corner at the point it was asked for.
 * @type {Partial<Placement>}
 */
const AT_POINT = { align: 'start', gap: 0, side: 'block-end' }

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
  const counted = row.partial && item !== undefined
  return html`<div
    part=${partsOf(entry, row.active)}
    role=${entry === undefined ? 'menuitem' : entryRole(entry)}
    id=${row.id}
    aria-checked=${checkedOf(entry)}
    aria-disabled=${item?.disabled === true ? 'true' : undefined}
    aria-haspopup=${opens ? 'menu' : undefined}
    aria-expanded=${opens ? String(menu.submenu?.position === row.position) : undefined}
    aria-setsize=${counted ? row.setsize : undefined}
    aria-posinset=${counted ? row.posinset : undefined}
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

/**
 * A menu button's id.
 * @template F
 * @param {Menu<F>} menu - The menu
 * @returns {string} The id
 */
function buttonId(menu) {
  return `${menu.id}-button`
}

/**
 * What one of a menu's parts is, if it is there: an element directly inside `parent`.
 * @param {HTMLElement} parent - Where to look
 * @param {string} part - The part
 * @returns {HTMLElement | undefined} The part
 */
function partIn(parent, part) {
  const found = parent.querySelector(`:scope > [part~="${part}"]`)
  return found instanceof HTMLElement ? found : undefined
}

/**
 * Lets go of the overlays of a menu's submenu and of every submenu open from it in turn.
 * @param {object} menu - The menu
 * @returns {void}
 */
function releaseFrom(menu) {
  const known = shown.get(menu)
  if (known !== undefined) {
    releaseFrom(known.submenu)
    releaseOverlay(known.element)
    shown.delete(menu)
  }
}

/**
 * Keeps a menu's list, and its submenu's overlay and so on down, in line with the menu: the list's scroll position,
 * focus if the menu asks for it, and the open submenu shown in its overlay beside the entry it opened from, letting go
 * of whichever was shown before if it was another.
 * @template F
 * @param {Menu<F>} menu - The menu
 * @param {HTMLElement} overlay - The overlay its list is in
 * @param {() => void} again - Asks for another render
 * @returns {void}
 */
function syncMenu(menu, overlay, again) {
  const viewport = partIn(overlay, 'viewport')
  if (viewport === undefined) {
    return
  }
  syncRows(menu.list, viewport, again)
  if (menu.takeFocus()) {
    viewport.focus({ preventScroll: true })
  }
  const open = menu.submenu
  const element = open === undefined ? undefined : partIn(overlay, 'submenu')
  const known = shown.get(menu)
  if (known !== undefined && (known.element !== element || known.submenu !== open?.menu)) {
    releaseFrom(menu)
  }
  if (open !== undefined && element !== undefined) {
    const row = viewport.querySelector(`[id="${rowId(menu.list, open.position)}"]`) ?? viewport
    syncOverlay(element, open.menu.layer, { anchor: row, focus: 'stay', placement: SUBMENU_PLACEMENT })
    shown.set(menu, { element, submenu: open.menu })
    syncMenu(open.menu, element, again)
  }
}

/**
 * After a render: the menu's overlay shown beside its button or at its point, focus taken into its list as it opens and
 * given back as it closes, and its submenus kept in line.
 * @template F
 * @param {Menu<F>} menu - The menu
 * @param {HTMLElement} root - Where its view is
 * @param {() => void} again - Asks for another render
 * @returns {void}
 */
function synced(menu, root, again) {
  const overlay = partIn(root, 'overlay')
  if (overlay === undefined) {
    return
  }
  const point = menu.point.get()
  const anchor = point ?? partIn(root, 'button')
  const viewport = partIn(overlay, 'viewport')
  syncOverlay(overlay, menu.layer, {
    ...(anchor === undefined ? {} : { anchor }),
    ...(point === undefined ? {} : { placement: AT_POINT }),
    focus: 'move',
    initialFocus: () => viewport,
  })
  syncMenu(menu, overlay, again)
}

/**
 * Lets go of a menu's overlays when its view leaves the page.
 * @template F
 * @param {Menu<F>} menu - The menu
 * @param {HTMLElement} root - Where its view was
 * @returns {void}
 */
function released(menu, root) {
  releaseFrom(menu)
  const overlay = partIn(root, 'overlay')
  if (overlay !== undefined) {
    releaseOverlay(overlay)
  }
}

/**
 * What a key on a menu button does beyond pressing it, as the APG menu button pattern has it: Down opens the menu with
 * focus on its first item, Up on its last.
 * @template F
 * @param {Menu<F>} menu - The menu
 * @param {Event} event - The key
 * @returns {void}
 */
function buttonKey(menu, event) {
  if (!(event instanceof KeyboardEvent) || (event.key !== 'ArrowDown' && event.key !== 'ArrowUp')) {
    return
  }
  event.preventDefault()
  menu.open(event.key === 'ArrowUp' ? 'last' : 'first')
}

/**
 * A menu button: the button, named by the menu's label, and the menu's overlay, named by the button.
 * @template F
 * @param {Menu<F>} menu - The menu
 * @returns {TemplateResult} The view
 */
function renderButton(menu) {
  const open = menu.layer.open.get()
  return html`<button
      part="button"
      type="button"
      id=${buttonId(menu)}
      aria-haspopup="menu"
      aria-expanded=${open ? 'true' : 'false'}
      aria-controls=${`${menu.id}-menu`}
      @click=${() => {
        if (menu.layer.open.get()) {
          menu.close()
        } else {
          menu.open('first')
        }
      }}
      @keydown=${(event) => {
        buttonKey(menu, event)
      }}
      >${menu.list.label}</button
    ><div part="overlay" popover="manual">${menuBody(menu, buttonId(menu))}</div>`
}

/**
 * A context menu: the menu's overlay, named by its label, opened at a point (`openAt`).
 * @template F
 * @param {Menu<F>} menu - The menu
 * @returns {TemplateResult} The view
 */
function renderContext(menu) {
  return html`<div part="overlay" popover="manual">${menuBody(menu, undefined)}</div>`
}

/**
 * The menu button's default web view.
 * @template F
 * @returns {View<Menu<F>>} The view
 */
function menuButtonView() {
  return { disconnected: released, kind: 'menu-button', render: renderButton, rendered: synced, styles: menuStyles }
}

/**
 * The context menu's default web view.
 * @template F
 * @returns {View<Menu<F>>} The view
 */
function contextMenuView() {
  return { disconnected: released, kind: 'context-menu', render: renderContext, rendered: synced, styles: menuStyles }
}

export { contextMenuView, menuBody, menuButtonView }
