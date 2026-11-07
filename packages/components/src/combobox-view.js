/**
 * The combobox's default web view (the WAI-ARIA APG combobox pattern): its field, an input for an editable one and a
 * button-like element for a select-only one, and the listbox of options it controls, in a popup anchored below it.
 * Focus stays in the field, which names the active option as its active descendant; that option is the one selected.
 * @import { View } from '@interact/dom/component'
 * @import { TemplateResult } from '@interact/dom/template'
 * @import { Combobox, ComboboxModifiers } from './combobox.js'
 * @import { Row } from './legacy-rows-view.js'
 */

import { html, releaseOverlay, syncOverlay } from '@interact/dom'

import { comboboxInput } from './combobox-field.js'
import { comboboxStyles } from './combobox-styles.js'
import { activeDescendant, rowsViewport, syncRows } from './legacy-rows-view.js'

/**
 * What was held with a key: Alt, Shift, and Control or Command.
 * @param {KeyboardEvent} event - The key
 * @returns {ComboboxModifiers} What was held
 */
function modifiersOf(event) {
  return { alt: event.altKey, shift: event.shiftKey, toggle: event.ctrlKey || event.metaKey }
}

/**
 * Whether an option is the one chosen.
 * @template T, F
 * @param {Combobox<T, F>} box - The combobox
 * @param {T} item - The option
 * @returns {boolean} Whether it is
 */
function isChosen(box, item) {
  const value = box.value.get()
  const { source } = box.list.items
  return value !== undefined && source !== undefined && source.key(value) === source.key(item)
}

/**
 * One option: its text, or nothing until it arrives. Pressing it chooses it; the pointer over it makes it active.
 * @template T, F
 * @param {Combobox<T, F>} box - The combobox
 * @param {Row} row - Where it is
 * @returns {TemplateResult} The option
 */
function option(box, row) {
  const item = box.list.items.item(row.position)
  const chosen = item !== undefined && isChosen(box, item)
  const parts = `row option${row.active ? ' option-active' : ''}${chosen ? ' option-chosen' : ''}`
  return html`<div
    part=${parts}
    role="option"
    id=${row.id}
    aria-selected=${row.active ? 'true' : 'false'}
    aria-setsize=${row.setsize}
    aria-posinset=${row.posinset}
    aria-busy=${item === undefined ? 'true' : false}
    data-offscreen=${row.offscreen}
    style=${row.style}
    @click=${() => {
      box.choose(row.position)
    }}
    @pointermove=${() => {
      box.point(row.position)
    }}
    >${item === undefined ? '' : box.list.text(item)}</div
  >`
}

/**
 * A select-only combobox's field: focusable, showing the option chosen or the placeholder, opening its list when
 * pressed.
 * @template T, F
 * @param {Combobox<T, F>} box - The combobox
 * @param {string} listId - The id of its listbox
 * @returns {TemplateResult} The field
 */
function selectField(box, listId) {
  const value = box.value.get()
  return html`<div
    part="field"
    role="combobox"
    tabindex="0"
    aria-label=${box.label}
    aria-haspopup="listbox"
    aria-expanded=${box.layer.open.get() ? 'true' : 'false'}
    aria-controls=${listId}
    aria-activedescendant=${activeDescendant(box.list)}
    @click=${() => {
      box.toggle()
    }}
    @keydown=${(event) => {
      if (event instanceof KeyboardEvent && box.key(event.key, modifiersOf(event))) {
        event.preventDefault()
      }
    }}
    ><span part=${value === undefined ? 'value placeholder' : 'value'}
      >${value === undefined ? box.placeholder : box.list.text(value)}</span
    ></div
  >`
}

/**
 * An editable combobox's field: a text input, focus staying in it as options are suggested.
 * @template T, F
 * @param {Combobox<T, F>} box - The combobox
 * @param {string} listId - The id of its listbox
 * @returns {TemplateResult} The field
 */
function editField(box, listId) {
  return comboboxInput({
    active: activeDescendant(box.list),
    autocomplete: box.kind.autocomplete,
    controls: listId,
    expanded: box.layer.open.get(),
    input: (text, deleting) => {
      box.type(text, deleting)
    },
    key: (event) => box.key(event.key, modifiersOf(event)),
    label: box.label,
    part: 'field',
    value: box.text.get(),
  })
}

/**
 * The combobox: its field, and its listbox of options in a popup. A press in the popup keeps focus in the field.
 * @template T, F
 * @param {Combobox<T, F>} box - The combobox
 * @returns {TemplateResult} The view
 */
function render(box) {
  const listId = `${box.id}-listbox`
  return html`<div part="combobox"
    >${box.kind.editable ? editField(box, listId) : selectField(box, listId)}<div
      part="overlay popup"
      popover="manual"
      @mousedown=${(event) => {
        event.preventDefault()
      }}
      ><div part="list" style=${`--_options: ${String(box.list.items.count)}`}
        >${rowsViewport(box.list, {
          focusable: false,
          id: listId,
          label: box.label,
          multiselectable: false,
          role: 'listbox',
          row: (row) => option(box, row),
        })}</div
      ></div
    ></div
  >`
}

/**
 * What one of the view's parts is, if it is there.
 * @param {HTMLElement} root - Where to look
 * @param {string} part - The part
 * @returns {HTMLElement | undefined} The part
 */
function partIn(root, part) {
  const found = root.querySelector(`[part~="${part}"]`)
  return found instanceof HTMLElement ? found : undefined
}

/**
 * Keeps an editable field's text what the combobox says: what was typed, with an inline completion selected after it.
 * @template T, F
 * @param {Combobox<T, F>} box - The combobox
 * @param {HTMLInputElement} field - Its field
 * @returns {void}
 */
function syncText(box, field) {
  const typed = box.text.get()
  const shown = box.completion ?? typed
  if (field.value !== shown) {
    field.value = shown
    if (shown !== typed) {
      field.setSelectionRange(typed.length, shown.length)
    }
  }
}

/**
 * After a render: the popup shown while the list is open, below the field and at least as wide, its options' scroll
 * position where the list's top is, and an editable field's text with its completion.
 * @template T, F
 * @param {Combobox<T, F>} box - The combobox
 * @param {HTMLElement} root - Where its view is
 * @param {() => void} again - Asks for another render
 * @returns {void}
 */
function synced(box, root, again) {
  const container = partIn(root, 'combobox')
  const field = partIn(root, 'field')
  const popup = partIn(root, 'popup')
  if (container === undefined || field === undefined || popup === undefined) {
    return
  }
  container.style.setProperty('--_field-width', `${String(field.getBoundingClientRect().width)}px`)
  syncOverlay(popup, box.layer, { anchor: field, focus: 'stay' })
  const viewport = partIn(popup, 'viewport')
  if (viewport !== undefined && box.layer.open.get()) {
    syncRows(box.list, viewport, again)
  }
  if (field instanceof HTMLInputElement) {
    syncText(box, field)
  }
}

/**
 * Lets the popup go when the view leaves the page.
 * @param {unknown} _box - The combobox, which needs nothing done
 * @param {HTMLElement} root - Where its view was
 * @returns {void}
 */
function released(_box, root) {
  const popup = partIn(root, 'popup')
  if (popup !== undefined) {
    releaseOverlay(popup)
  }
}

/**
 * The combobox's default web view.
 * @template T, F
 * @returns {View<Combobox<T, F>>} The view
 */
function comboboxView() {
  return { disconnected: released, kind: 'combobox', render, rendered: synced, styles: comboboxStyles }
}

export { comboboxView }
