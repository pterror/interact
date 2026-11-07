/**
 * The combobox in a browser test's page: registering it, putting one of each kind in the page between two buttons,
 * and seeing what it shows and where focus is.
 * @import { DomMode } from '@interact/dom/css'
 * @import { Combobox } from './combobox.js'
 */

import { deepActiveElement, register } from '@interact/dom'

import { comboboxElement } from './combobox-element.js'
import { fruitSearch, fruitSelect, numberSelect } from './test-comboboxes.js'

/**
 * The kinds of combobox the page makes: select-only with nothing chosen, select-only with Banana chosen (what an
 * element made without saying gets, as the server renders it), editable with list or inline autocomplete, and
 * select-only over ten billion numbers with five billion chosen.
 * @typedef {'select' | 'select-banana' | 'list' | 'both' | 'number'} Variant
 */

/**
 * What the page's combobox shows: whether its list is open, where focus is, its field's combobox state and what it
 * shows (an input's value and selected range), the options showing in the popup (a star on the one selected, the
 * active one), and
 * whether the popup is below the field and at least as wide.
 * @typedef {Readonly<{
 *   open: boolean,
 *   focus: string,
 *   field: Readonly<{
 *     role: string | undefined,
 *     expanded: string | undefined,
 *     controls: boolean,
 *     active: string | undefined,
 *     autocomplete: string | undefined,
 *   }>,
 *   shows: string,
 *   selected: readonly number[],
 *   options: readonly string[],
 *   below: boolean,
 *   wide: boolean,
 * }>} ComboboxSeen
 */

const FIVE_BILLION = 5_000_000_000
const NOTHING = 0
/**
 * The kind the next element made is: an element is made before the page can set anything on it.
 * @type {Variant | undefined}
 */
let wanted = undefined

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
 * Waits for renders and what is found to pass.
 * @returns {Promise<void>} When they have
 */
async function settle() {
  await frame()
  await frame()
}

/**
 * A fruit combobox of a kind: select-only with nothing chosen, editable with list or inline autocomplete, or, for any
 * other, select-only with Banana chosen.
 * @param {Variant | undefined} variant - The kind
 * @returns {Combobox<string>} A new combobox
 */
function fruitCombobox(variant) {
  if (variant === 'select') {
    return fruitSelect()
  }
  return variant === 'list' || variant === 'both' ? fruitSearch(variant) : fruitSelect('Banana')
}

/**
 * Registers the combobox as `p-combobox`: over ten billion numbers for that kind; otherwise over fruit, of the kind
 * wanted when each element is made.
 * @param {Variant | undefined} variant - The kind the page shows
 * @returns {void}
 */
function registerCombobox(variant) {
  wanted = variant
  if (variant === 'number') {
    register([comboboxElement(() => numberSelect(FIVE_BILLION))], { prefix: 'p' })
  } else {
    register([comboboxElement(() => fruitCombobox(wanted))], { prefix: 'p' })
  }
}

/**
 * The root the combobox's view is in.
 * @returns {HTMLElement | ShadowRoot} The root
 */
function rootOf() {
  const host = document.querySelector('p-combobox')
  if (!(host instanceof HTMLElement)) {
    throw new TypeError('There is no combobox')
  }
  return host.shadowRoot ?? host
}

/**
 * A button, before or after the combobox, something for Tab to go to.
 * @param {string} id - Its id
 * @returns {HTMLButtonElement} The button
 */
function button(id) {
  const made = document.createElement('button')
  made.id = id
  made.textContent = id
  return made
}

/**
 * The combobox's field.
 * @returns {HTMLElement} It
 */
function fieldOf() {
  const field = rootOf().querySelector('[part~="field"]')
  if (!(field instanceof HTMLElement)) {
    throw new TypeError('The combobox has no field')
  }
  return field
}

/**
 * Puts a combobox of a kind in the page's main landmark, between two buttons, in a DOM mode, and focuses its field.
 * @param {DomMode} mode - Where it lives
 * @param {Variant} variant - Its kind
 * @returns {Promise<void>} When it has rendered
 */
async function putCombobox(mode, variant) {
  registerCombobox(variant)
  const element = document.createElement('p-combobox')
  element.setAttribute('dom-mode', mode)
  const main = document.createElement('main')
  main.append(button('before'), element, button('after'))
  document.body.append(main)
  await settle()
  fieldOf().focus()
}

/**
 * Where focus is, by name: the combobox's field, a button, or the page.
 * @returns {string} The name
 */
function focusName() {
  const active = deepActiveElement(document)
  if (active === undefined || active === document.body) {
    return 'page'
  }
  return active.matches('[part~="field"]') ? 'field' : active.id
}

/**
 * The field's combobox state: its role, whether it says its list is expanded, whether its list is the listbox, the
 * text of the option it names as active, and how it autocompletes.
 * @param {HTMLElement | ShadowRoot} root - Where the view is
 * @param {HTMLElement} field - The field
 * @returns {ComboboxSeen['field']} The state
 */
function fieldState(root, field) {
  const list = root.querySelector('[role="listbox"]')
  const activeId = field.getAttribute('aria-activedescendant')
  const active = activeId === null ? undefined : root.querySelector(`[id="${activeId}"]`)
  return {
    active: active?.textContent ?? undefined,
    autocomplete: field.getAttribute('aria-autocomplete') ?? undefined,
    controls: list !== null && field.getAttribute('aria-controls') === list.id,
    expanded: field.getAttribute('aria-expanded') ?? undefined,
    role: field.getAttribute('role') ?? undefined,
  }
}

/**
 * An option's text, with a star if it is the one selected.
 * @param {Element} option - The option
 * @returns {string} Its text
 */
function optionText(option) {
  const text = option.textContent
  return option.getAttribute('aria-selected') === 'true' ? `*${text}` : text
}

/**
 * The options showing in the popup's viewport: the rows inside its box, not those rendered beyond it so a short scroll
 * finds them there.
 * @param {HTMLElement | ShadowRoot} root - Where the view is
 * @returns {Element[]} The options, in order
 */
function showing(root) {
  const viewport = root.querySelector('[part~="viewport"]')?.getBoundingClientRect()
  return [...root.querySelectorAll('[role="option"]:not([data-offscreen])')].filter((option) => {
    const box = option.getBoundingClientRect()
    return viewport !== undefined && box.top >= Math.floor(viewport.top) && box.bottom <= Math.ceil(viewport.bottom)
  })
}

/**
 * Whether the popup lies below the field, at least as wide.
 * @param {HTMLElement} field - The field
 * @param {Element | null} popup - The popup
 * @returns {Readonly<{ below: boolean, wide: boolean }>} Whether it does
 */
function placed(field, popup) {
  const fieldBox = field.getBoundingClientRect()
  const popupBox = popup?.getBoundingClientRect()
  return {
    below: popupBox !== undefined && popupBox.top >= fieldBox.bottom,
    wide: popupBox !== undefined && popupBox.width >= fieldBox.width,
  }
}

/**
 * What the page's combobox shows now, once renders have passed.
 * @returns {Promise<ComboboxSeen>} What showed
 */
async function seen() {
  await settle()
  const root = rootOf()
  const field = fieldOf()
  const popup = root.querySelector('[part~="popup"]')
  const options = showing(root)
  return {
    ...placed(field, popup),
    field: fieldState(root, field),
    focus: focusName(),
    open: popup?.matches(':popover-open') ?? false,
    options: options.map((option) => optionText(option)),
    selected: field instanceof HTMLInputElement ? [field.selectionStart ?? NOTHING, field.selectionEnd ?? NOTHING] : [],
    shows: field instanceof HTMLInputElement ? field.value : field.textContent,
  }
}

/**
 * Adopts the server's combobox: notes its field, registers the element, focuses the field, and reports whether the
 * same field stayed, and what shows.
 * @returns {Promise<ComboboxSeen & Readonly<{ same: boolean }>>} What adopting left
 */
async function adoptCombobox() {
  const before = rootOf().querySelector('[part~="field"]')
  registerCombobox(undefined)
  await settle()
  const after = fieldOf()
  after.focus()
  return { ...(await seen()), same: before !== null && before === after }
}

export { adoptCombobox, putCombobox, seen }
