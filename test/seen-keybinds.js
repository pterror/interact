/**
 * What the keybinds test page shows, and what ran in it.
 */

import { deepActiveElement } from '@interact/dom'

/**
 * What the page shows: whether the palette is open, what it found (matched letters in brackets) and where focus is;
 * whether the context menu is open and its entries ("-" before one that can't run); whether the Cut button is
 * disabled; and what ran.
 * @typedef {Readonly<{
 *   palette: boolean,
 *   results: readonly string[],
 *   focus: string,
 *   menu: boolean,
 *   entries: readonly string[],
 *   cutDisabled: boolean,
 *   ran: readonly string[],
 * }>} KeybindsSeen
 */

/** @type {string[]} */
const ran = []
const NO_RUNS = 0

/**
 * Notes a command run.
 * @param {string} id - The command
 * @returns {void}
 */
function note(id) {
  ran.push(id)
}

/**
 * Waits for the next frame to be drawn.
 * @returns {Promise<void>} When it has been
 */
async function frame() {
  /** @type {PromiseWithResolvers<void>} */
  const drawn = Promise.withResolvers()
  requestAnimationFrame(() => {
    drawn.resolve()
  })
  await drawn.promise
}

/**
 * Waits for renders, searches and a command run after an overlay closes to pass.
 * @returns {Promise<void>} When they have
 */
async function settle() {
  await frame()
  await frame()
  await frame()
}

/**
 * A component's view.
 * @param {string} tag - Its element's name
 * @returns {HTMLElement | ShadowRoot} Where its view is
 */
function rootOf(tag) {
  const host = document.querySelector(tag)
  if (!(host instanceof HTMLElement)) {
    throw new TypeError(`There is no ${tag}`)
  }
  return host.shadowRoot ?? host
}

/**
 * A row's label, its matched letters in brackets.
 * @param {Element} row - The row
 * @returns {string} The label
 */
function labelText(row) {
  const label = row.querySelector('[part~="label"]')
  const runs = [...(label?.children ?? [])]
  if (runs.length === NO_RUNS) {
    return label?.textContent ?? ''
  }
  return runs.map((run) => (run.matches('[part~="match"]') ? `[${run.textContent}]` : run.textContent)).join('')
}

/**
 * Where focus is, by name: the palette's search field, the area, a button, a role, or the page.
 * @returns {string} The name
 */
function focusName() {
  const active = deepActiveElement(document)
  if (active === undefined || active === document.body) {
    return 'page'
  }
  if (active.matches('[part~="search"]')) {
    return 'search'
  }
  return active.id === '' ? (active.getAttribute('role') ?? active.tagName.toLowerCase()) : active.id
}

/**
 * A menu row as the test reads it: "-" before one that can't run.
 * @param {Element} row - The row
 * @returns {string} The row
 */
function entryText(row) {
  return `${row.getAttribute('aria-disabled') === 'true' ? '-' : ''}${labelText(row)}`
}

/**
 * What the page shows now, once renders have passed.
 * @returns {Promise<KeybindsSeen>} What shows
 */
async function seenPage() {
  await settle()
  const palette = rootOf('k-command-palette')
  const menu = rootOf('k-context-menu')
  const dialog = palette.querySelector('[part~="dialog"]')
  const cut = document.querySelector('#cut-button')
  const rows = [...menu.querySelectorAll('[role^="menuitem"]:not([data-offscreen])')]
  return {
    cutDisabled: cut instanceof HTMLButtonElement && cut.disabled,
    entries: rows.map((row) => entryText(row)),
    focus: focusName(),
    menu: menu.querySelector('[part~="overlay"]')?.matches(':popover-open') ?? false,
    palette: dialog instanceof HTMLDialogElement && dialog.open,
    ran: [...ran],
    results: [...palette.querySelectorAll('[role="option"]:not([data-offscreen])')].map((row) => labelText(row)),
  }
}

export { note, seenPage, settle }
