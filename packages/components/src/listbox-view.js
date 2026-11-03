/**
 * @import { View } from '@interact/dom/component'
 * @import { TemplateResult } from '@interact/dom/template'
 * @import { Listbox } from './listbox.js'
 * @import { Row } from './rows-view.js'
 */

import { html } from '@interact/dom'

import { listboxStyles } from './listbox-styles.js'
import { syncRows } from './rows-place.js'
import { modifiersOf, rowsViewport } from './rows-view.js'

/**
 * One option: its text, or nothing until it arrives, placed in its scrollable row, and hidden but present when it is
 * the active item outside the window.
 * @template T, F
 * @param {Listbox<T, F>} listbox - The listbox
 * @param {Row} row - Where it is
 * @returns {TemplateResult} The option
 */
function option(listbox, row) {
  const item = listbox.items.item(row.position)
  const selected = listbox.choose.isSelected(row.position)
  const parts = `row option${selected ? ' option-selected' : ''}${row.active ? ' option-active' : ''}`
  return html`<div
    part=${parts}
    role="option"
    id=${row.id}
    aria-selected=${selected ? 'true' : 'false'}
    aria-setsize=${row.setsize}
    aria-posinset=${row.posinset}
    aria-busy=${item === undefined ? 'true' : false}
    data-offscreen=${row.offscreen}
    style=${row.style}
    @click=${(event) => {
      if (event instanceof MouseEvent) {
        listbox.choose.press(row.position, modifiersOf(event))
      }
    }}
    @dblclick=${() => {
      listbox.activate(row.position)
    }}
    >${item === undefined ? '' : listbox.text(item)}</div
  >`
}

/**
 * What a listbox renders: its scrolling viewport of options.
 * @template T, F
 * @param {Listbox<T, F>} listbox - The listbox
 * @returns {TemplateResult} The view
 */
function render(listbox) {
  return rowsViewport(listbox, {
    focus: () => {
      listbox.focus()
    },
    keydown: (event) => {
      if (listbox.key(event.key, modifiersOf(event))) {
        event.preventDefault()
      }
    },
    label: listbox.label,
    multiselectable: listbox.choose.mode === 'multiple',
    role: 'listbox',
    row: (row) => option(listbox, row),
  })
}

/**
 * After a render, keeps the viewport's scroll position where the listbox's top is.
 * @template T, F
 * @param {Listbox<T, F>} listbox - The listbox
 * @param {HTMLElement} root - Where the view is
 * @param {() => void} again - Asks for another render
 * @returns {void}
 */
function sync(listbox, root, again) {
  const viewport = root.querySelector(':scope > [part~="viewport"]')
  if (viewport instanceof HTMLElement) {
    syncRows(listbox, viewport, again)
  }
}

/**
 * The listbox's default web view.
 * @template T, F
 * @returns {View<Listbox<T, F>>} The view
 */
function listboxView() {
  return { kind: 'listbox', render, rendered: sync, styles: listboxStyles }
}

export { listboxView }
