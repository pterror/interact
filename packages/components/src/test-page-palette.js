/**
 * The command palette in a browser test's page: registering it, putting it in the page with a button that opens it,
 * and seeing what it shows, where focus is, and what ran with focus where.
 * @import { DomMode } from '@interact/dom/css'
 * @import { Palette } from './palette.js'
 */

import { deepActiveElement, register } from '@interact/dom'

import { paletteElement } from './palette-element.js'
import { editorPalette } from './test-palettes.js'

/**
 * What the page's palette shows: whether its dialog is open, where focus is, the search field's value and its combobox
 * state, the results' labels with what matched marked, which is active, the status, the dialog's height, and each
 * command that ran with where focus was as it did.
 * @typedef {Readonly<{
 *   open: boolean,
 *   focus: string,
 *   value: string,
 *   combobox: Readonly<{
 *     role: string | undefined,
 *     expanded: string | undefined,
 *     controls: boolean,
 *     active: string | undefined,
 *   }>,
 *   results: readonly string[],
 *   status: string,
 *   height: number,
 *   ran: readonly string[],
 * }>} PaletteSeen
 */

const NO_HEIGHT = 0
/** @type {string[]} */
const ran = []
/** @type {Palette<string> | undefined} */
let made = undefined

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
 * Waits for renders, searches and focus going back to pass.
 * @returns {Promise<void>} When they have
 */
async function settle() {
  await frame()
  await frame()
}

/**
 * Where focus is, by name: the search field, the opener, or the page.
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
  return active.id === '' ? active.tagName.toLowerCase() : active.id
}

/**
 * Registers the palette as `p-command-palette`, its palette noting what runs and where focus was then.
 * @returns {void}
 */
function registerPalette() {
  register(
    [
      paletteElement(() => {
        made = editorPalette((id) => {
          ran.push(`${id} with focus on ${focusName()}`)
        })
        return made
      }),
    ],
    { prefix: 'p' },
  )
}

/**
 * The root the palette's view is in.
 * @returns {HTMLElement | ShadowRoot} The root
 */
function rootOf() {
  const host = document.querySelector('p-command-palette')
  if (!(host instanceof HTMLElement)) {
    throw new TypeError('There is no palette')
  }
  return host.shadowRoot ?? host
}

/**
 * The palette the page made.
 * @returns {Palette<string>} It
 */
function paletteNow() {
  if (made === undefined) {
    throw new TypeError('No palette was made')
  }
  return made
}

/**
 * A button that opens the palette.
 * @returns {HTMLButtonElement} The button
 */
function opener() {
  const button = document.createElement('button')
  button.id = 'opener'
  button.textContent = 'Commands'
  button.addEventListener('click', () => {
    paletteNow().open()
  })
  return button
}

/**
 * Puts the palette in the page, in a DOM mode, with a button before it that opens it, and focuses that button.
 * @param {DomMode} mode - Where it lives
 * @returns {Promise<void>} When it has rendered
 */
async function putPalette(mode) {
  registerPalette()
  const element = document.createElement('p-command-palette')
  element.setAttribute('dom-mode', mode)
  const button = opener()
  document.body.append(button, element)
  await settle()
  button.focus()
}

/**
 * A result's label, with what the query matched in brackets, and a star if it is the active one.
 * @param {Element} option - The result
 * @returns {string} Its label
 */
function resultText(option) {
  const label = option.querySelector('[part~="label"]')
  const text = [...(label?.children ?? [])]
    .map((run) => (run.matches('[part~="match"]') ? `[${run.textContent}]` : run.textContent))
    .join('')
  return option.getAttribute('aria-selected') === 'true' ? `*${text}` : text
}

/**
 * The search field's combobox state: its role, whether it says its list is expanded, whether its list is the results,
 * and the label of the result it names as active.
 * @param {HTMLElement | ShadowRoot} root - Where the view is
 * @returns {PaletteSeen['combobox']} The state
 */
function comboboxOf(root) {
  const field = root.querySelector('[part~="search"]')
  const results = root.querySelector('[part~="viewport"]')
  const activeId = field?.getAttribute('aria-activedescendant')
  const active = activeId === null || activeId === undefined ? undefined : root.querySelector(`[id="${activeId}"]`)
  return {
    active: active?.querySelector('[part~="label"]')?.textContent ?? undefined,
    controls: results !== null && field?.getAttribute('aria-controls') === results.id,
    expanded: field?.getAttribute('aria-expanded') ?? undefined,
    role: field?.getAttribute('role') ?? undefined,
  }
}

/**
 * What the page's palette shows now, once renders have passed.
 * @returns {Promise<PaletteSeen>} What showed
 */
async function seen() {
  await settle()
  const root = rootOf()
  const dialog = root.querySelector('[part~="dialog"]')
  const field = root.querySelector('[part~="search"]')
  const options = [...root.querySelectorAll('[role="option"]:not([data-offscreen])')]
  return {
    combobox: comboboxOf(root),
    focus: focusName(),
    height: dialog?.getBoundingClientRect().height ?? NO_HEIGHT,
    open: dialog instanceof HTMLDialogElement && dialog.open,
    ran: [...ran],
    results: options.map((option) => resultText(option)),
    status: root.querySelector('[part~="status"]')?.textContent ?? '',
    value: field instanceof HTMLInputElement ? field.value : '',
  }
}

/**
 * Adopts the server's palette: notes its search field, registers the element, and reports whether the same field
 * stayed, and what shows.
 * @returns {Promise<PaletteSeen & Readonly<{ same: boolean }>>} What adopting left
 */
async function adoptPalette() {
  const before = rootOf().querySelector('[part~="search"]')
  registerPalette()
  await settle()
  const after = rootOf().querySelector('[part~="search"]')
  return { ...(await seen()), same: before !== null && before === after }
}

/**
 * Puts the button that opens the palette before the server's palette, and focuses it.
 * @returns {void}
 */
function addOpener() {
  const button = opener()
  document.body.prepend(button)
  button.focus()
}

export { addOpener, adoptPalette, putPalette, seen, settle }
