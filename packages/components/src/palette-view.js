/**
 * The command palette's default web view: a modal dialog holding a search field that is an editable combobox (WAI-ARIA
 * APG combobox pattern, list autocomplete with automatic selection) over the listbox of commands found. Focus stays in
 * the field; the active command is its active descendant, and is the one selected.
 * @import { View } from '@interact/dom/component'
 * @import { TemplateResult } from '@interact/dom/template'
 * @import { FoundCommand } from './command-match.js'
 * @import { Palette } from './palette.js'
 * @import { Row } from './rows-view.js'
 */

import { html, releaseOverlay, repeat, syncOverlay } from '@interact/dom'

import { comboboxInput } from './combobox-field.js'
import { paletteStyles } from './palette-styles.js'
import { activeDescendant, rowsViewport, syncRows } from './rows-view.js'

/**
 * A run of a label's text: where it starts, what it is, and whether the query matched it.
 * @typedef {Readonly<{ start: number, text: string, matched: boolean }>} Run
 */

/**
 * A label in runs, matched and not, by where a search said it matched.
 * @param {string} label - The label
 * @param {readonly number[]} positions - Where it matched
 * @returns {Run[]} The runs, in order
 */
function runsOf(label, positions) {
  const matched = new Set(positions)
  /** @type {Run[]} */
  const runs = []
  let start = 0
  for (let index = 1; index <= label.length; index += 1) {
    if (index === label.length || matched.has(index) !== matched.has(start)) {
      runs.push({ matched: matched.has(start), start, text: label.slice(start, index) })
      start = index
    }
  }
  return runs
}

/**
 * A command's label, with what the query matched marked.
 * @param {FoundCommand} command - The command
 * @returns {TemplateResult} The label
 */
function labelOf(command) {
  return html`<span part="label"
    >${repeat(
      runsOf(command.label, command.positions ?? []),
      (run) => `${String(run.start)}${run.matched ? '*' : ''}`,
      (run) => (run.matched ? html`<mark part="match">${run.text}</mark>` : html`<span>${run.text}</span>`),
    )}</span
  >`
}

/**
 * One command found: its label, what it does and its group if it has them, and its shortcut; nothing until it
 * arrives. Pressing it runs it; the pointer over it makes it active.
 * @template C
 * @param {Palette<C>} palette - The palette
 * @param {Row} row - Where it is
 * @returns {TemplateResult} The option
 */
function result(palette, row) {
  const command = palette.list.items.item(row.position)
  const off = command !== undefined && !command.enabled
  const parts = `row result${row.active ? ' result-active' : ''}${off ? ' result-disabled' : ''}`
  return html`<div
    part=${parts}
    role="option"
    id=${row.id}
    aria-selected=${row.active ? 'true' : 'false'}
    aria-disabled=${off ? 'true' : undefined}
    aria-setsize=${row.setsize}
    aria-posinset=${row.posinset}
    aria-busy=${command === undefined ? 'true' : false}
    data-offscreen=${row.offscreen}
    style=${row.style}
    @click=${() => {
      palette.run(row.position)
    }}
    @pointermove=${() => {
      if (!off && palette.list.active.get() !== row.position) {
        palette.list.active.request(row.position)
      }
    }}
    >${command === undefined ? '' : labelOf(command)}<span part="description">${command?.description ?? ''}</span
    ><span part="category">${command?.category ?? ''}</span><span part="shortcut">${command?.shortcut ?? ''}</span></div
  >`
}

/**
 * What the status region says: that nothing was found, once a search has answered with nothing; otherwise nothing.
 * @template C
 * @param {Palette<C>} palette - The palette
 * @returns {string} What it says
 */
function statusOf(palette) {
  const answered = palette.list.source.get() !== undefined
  return answered && palette.list.items.count === 0 ? 'No matching commands' : ''
}

/**
 * The palette: a modal dialog with its search field, the commands found, and a status region over them.
 * @template C
 * @param {Palette<C>} palette - The palette
 * @returns {TemplateResult} The view
 */
function render(palette) {
  const listId = `${palette.id}-results`
  return html`<dialog part="overlay dialog" closedby="none" aria-label=${palette.label}
    >${comboboxInput({
      active: activeDescendant(palette.list),
      autocomplete: 'list',
      controls: listId,
      expanded: true,
      input: (text) => {
        palette.type(text)
      },
      key: (event) => palette.key(event.key),
      label: palette.searchLabel,
      part: 'search',
      placeholder: palette.placeholder,
      value: palette.query.get(),
    })}<div part="results"
      >${rowsViewport(palette.list, {
        focusable: false,
        id: listId,
        label: palette.label,
        multiselectable: false,
        role: 'listbox',
        row: (row) => result(palette, row),
      })}<div part="status" role="status">${statusOf(palette)}</div></div
    ></dialog
  >`
}

/**
 * What one of the view's parts is, if it is there: an element anywhere below `root`.
 * @param {HTMLElement} root - Where to look
 * @param {string} part - The part
 * @returns {HTMLElement | undefined} The part
 */
function partIn(root, part) {
  const found = root.querySelector(`[part~="${part}"]`)
  return found instanceof HTMLElement ? found : undefined
}

/**
 * After a render: the dialog shown modally while the palette is open, focus in its search field, and the results'
 * scroll position where the list's top is.
 * @template C
 * @param {Palette<C>} palette - The palette
 * @param {HTMLElement} root - Where its view is
 * @param {() => void} again - Asks for another render
 * @returns {void}
 */
function synced(palette, root, again) {
  const dialog = partIn(root, 'dialog')
  if (dialog === undefined) {
    return
  }
  syncOverlay(dialog, palette.layer, { focus: 'move', initialFocus: () => partIn(dialog, 'search') })
  const viewport = partIn(dialog, 'viewport')
  if (viewport !== undefined) {
    syncRows(palette.list, viewport, again)
  }
}

/**
 * Lets the dialog go when the view leaves the page.
 * @param {unknown} _palette - The palette, which needs nothing done
 * @param {HTMLElement} root - Where its view was
 * @returns {void}
 */
function released(_palette, root) {
  const dialog = partIn(root, 'dialog')
  if (dialog !== undefined) {
    releaseOverlay(dialog)
  }
}

/**
 * The command palette's default web view.
 * @template C
 * @returns {View<Palette<C>>} The view
 */
function paletteView() {
  return { disconnected: released, kind: 'command-palette', render, rendered: synced, styles: paletteStyles }
}

export { paletteView }
