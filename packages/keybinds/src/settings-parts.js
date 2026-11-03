/**
 * The settings panel's pieces: its frame, a binding shown as keys with its switches, the prompt while one is recorded,
 * the question when a binding is taken, and the buttons that add one.
 */

/**
 * @import { InputUI } from './input.js'
 */

import { formatBinding } from './binding-format.js'
import { flipRelease, splitRelease } from './binding.js'
import { OVERLAY_STYLE, make, styleOf } from './component-dom.js'

const SETTINGS_STYLE = `${OVERLAY_STYLE}
@layer keybinds.structure {
  :where(.settings__backdrop) { position: fixed; inset: 0; }
}`

/**
 * A button with its class, part names and label, doing something when clicked
 * @param {Readonly<{ className: string, part: string, text: string }>} made - Its class, part names and label
 * @param {() => void} click - What it does
 * @returns {HTMLButtonElement} The button
 */
function button(made, click) {
  const element = make('button', made)
  element.addEventListener('click', click)
  return element
}

/**
 * A switch: a button that shows whether it's on
 * @param {Readonly<{ className: string, label: string, name: string, on: boolean }>} made - Its class, label, part
 *   name ("binding-release" is also "binding-release-on" while on), and whether it's on
 * @param {() => void} click - What it does
 * @returns {HTMLButtonElement} The switch
 */
function toggle({ className, label, name, on }, click) {
  const element = button({ className, part: on ? `${name} ${name}-on` : name, text: label }, click)
  element.setAttribute('aria-pressed', String(on))
  return element
}

/**
 * Whether an event happened on one of the switches in the recording prompt, whose clicks aren't recorded
 * @param {Event} event - The event
 * @returns {boolean} Whether it did
 */
function onSwitch(event) {
  return event
    .composedPath()
    .some((node) => node instanceof HTMLButtonElement && node.className.startsWith('settings__recording-'))
}

/**
 * The panel's frame: a backdrop, and the dialog its contents go in
 * @param {ShadowRoot} shadow - The panel's shadow root
 * @returns {Readonly<{ backdrop: HTMLDivElement, dialog: HTMLDivElement }>} The backdrop, and the dialog
 */
function settingsMarkup(shadow) {
  const backdrop = make('div', { className: 'settings__backdrop', part: 'backdrop' })
  const dialog = make('div', { className: 'settings__dialog', part: 'dialog' })
  dialog.setAttribute('role', 'dialog')
  dialog.setAttribute('aria-modal', 'true')
  dialog.setAttribute('aria-label', 'Keybind Settings')
  const root = make('div', { className: 'settings', part: 'settings' })
  root.append(backdrop, dialog)
  shadow.append(styleOf(SETTINGS_STYLE), root)
  return { backdrop, dialog }
}

/**
 * The panel's header: its title, and a button that resets every binding
 * @param {() => void} resetAll - Resets every binding
 * @returns {HTMLDivElement} The header
 */
function headerOf(resetAll) {
  const header = make('div', { className: 'settings__header', part: 'header' })
  header.append(
    make('div', { className: 'settings__title', part: 'title', text: 'Keyboard Shortcuts' }),
    button({ className: 'settings__reset-all', part: 'reset-all', text: 'Reset All' }, resetAll),
  )
  return header
}

/**
 * A binding's display parts, as `<kbd>`s, which start recording it again when clicked
 * @param {InputUI} input - The input it's through
 * @param {string} binding - The binding
 * @param {() => void} record - Starts recording it again
 * @returns {HTMLSpanElement} The keys
 */
function keysOf(input, binding, record) {
  const keys = make('span', { className: 'settings__binding-keys', part: 'binding-keys' })
  keys.append(
    ...formatBinding(input, binding).map((part) =>
      make('kbd', { className: 'settings__binding-key', part: 'binding-key', text: part }),
    ),
  )
  keys.addEventListener('click', record)
  return keys
}

/**
 * What a binding can be switched to: inverted, for inputs whose bindings can be, and its release or press form, while
 * releases are on and it has one
 * @param {InputUI} input - The input it's through
 * @param {Readonly<{ binding: string, releases: boolean }>} shown - The binding, and whether releases are on
 * @param {(flipped: string) => void} flip - Switches it to another form
 * @returns {HTMLButtonElement[]} The switches
 */
function switchesOf(input, { binding, releases }, flip) {
  const trimmed = binding.trim()
  /** @type {HTMLButtonElement[]} */
  const switches = []
  if (input.invert === true) {
    const inverted = trimmed.startsWith('-')
    switches.push(
      toggle({ className: 'settings__binding-release', label: 'Invert', name: 'binding-invert', on: inverted }, () => {
        flip(inverted ? trimmed.slice('-'.length) : `-${trimmed}`)
      }),
    )
  }
  const isRelease = splitRelease(binding.toLowerCase()).release
  if (releases && input.release !== undefined && (isRelease || input.release(binding))) {
    switches.push(
      toggle(
        { className: 'settings__binding-release', label: 'Release', name: 'binding-release', on: isRelease },
        () => {
          flip(flipRelease(binding))
        },
      ),
    )
  }
  return switches
}

/**
 * What a binding chip does: record it again, switch it to another form, or remove it
 * @typedef {Readonly<{ flip: (flipped: string) => void, record: () => void, remove: () => void }>} ChipActions
 */

/**
 * A binding, shown as its keys, with its switches and a button that removes it
 * @param {InputUI} input - The input it's through
 * @param {Readonly<{ binding: string, releases: boolean }>} shown - The binding, and whether releases are on
 * @param {ChipActions} actions - What it does
 * @returns {HTMLSpanElement} The chip
 */
function chipOf(input, shown, { flip, record, remove }) {
  const chip = make('span', { className: 'settings__binding', part: 'binding' })
  chip.append(
    keysOf(input, shown.binding, record),
    ...switchesOf(input, shown, flip),
    button({ className: 'settings__binding-remove', part: 'binding-remove', text: '×' }, remove),
  )
  return chip
}

/**
 * The box a binding being recorded is shown in
 * @returns {HTMLSpanElement} The box
 */
function recordingBox() {
  return make('span', {
    className: 'settings__binding settings__binding--recording',
    part: 'binding binding-recording',
  })
}

/**
 * The question shown when a binding is taken: replace the other command's, or cancel
 * @param {string} label - The other command's label
 * @param {Readonly<{ accept: () => void, cancel: () => void }>} answers - What each answer does
 * @returns {HTMLSpanElement} The question
 */
function conflictOf(label, { accept, cancel }) {
  const conflict = make('span', {
    className: 'settings__conflict',
    part: 'conflict',
    text: `Already bound to "${label}". `,
  })
  conflict.append(
    button({ className: '', part: 'conflict-accept', text: 'Replace' }, accept),
    button({ className: '', part: 'conflict-cancel', text: 'Cancel' }, cancel),
  )
  return conflict
}

/**
 * The buttons that start recording a new binding, one for each input that can be recorded now
 * @param {readonly InputUI[]} inputs - The inputs shown on the row
 * @param {(input: InputUI) => void} start - Starts recording through one
 * @returns {HTMLSpanElement} The buttons
 */
function addButtons(inputs, start) {
  const buttons = make('span', { className: 'settings__item-add', part: 'item-add' })
  for (const input of inputs) {
    if (input.record !== undefined && (input.available?.() ?? true)) {
      buttons.append(
        button({ className: '', part: `add-${input.label.toLowerCase()}`, text: `+ ${input.label}` }, () => {
          start(input)
        }),
      )
    }
  }
  return buttons
}

export { addButtons, button, chipOf, conflictOf, headerOf, onSwitch, recordingBox, settingsMarkup, toggle }
