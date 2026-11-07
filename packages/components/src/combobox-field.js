/**
 * @import { TemplateResult } from '@interact/dom/template'
 */

import { html, inOwnView } from '@interact/dom'

/**
 * What an editable combobox's text field is (the WAI-ARIA APG combobox pattern): its part, its accessible name, text
 * shown while it is empty (if the app gives any), how it autocompletes, whether its list shows, the id of that list and
 * of the option active in it, and the text in it.
 * @typedef {Readonly<{
 *   part: string,
 *   label: string,
 *   placeholder?: string | undefined,
 *   autocomplete: 'none' | 'list' | 'both',
 *   expanded: boolean,
 *   controls: string,
 *   active: string | undefined,
 *   value: string,
 * }>} ComboboxField
 */

/**
 * What typing and keys in a field do: `input` hears the new text and whether it was deleting; `key` hears a key and
 * says whether it used it, so its default is prevented. A key typed to compose text (an input method) is the input
 * method's, so `key` never hears it.
 * @typedef {Readonly<{
 *   input: (text: string, deleting: boolean) => void,
 *   key: (event: KeyboardEvent) => boolean,
 * }>} FieldHandlers
 */

/**
 * Whether an input event deleted text.
 * @param {Event} event - The input event
 * @returns {boolean} Whether it did
 */
function deleted(event) {
  return event instanceof InputEvent && event.inputType.startsWith('delete')
}

/**
 * An editable combobox's text field: focus stays in it, and it names the active option as its active descendant.
 * @param {ComboboxField} field - What it is
 * @returns {TemplateResult} The field
 */
function comboboxInput(field) {
  return html`<input
    part=${field.part}
    type="text"
    role="combobox"
    autocomplete="off"
    spellcheck="false"
    aria-label=${field.label}
    placeholder=${field.placeholder}
    aria-autocomplete=${field.autocomplete}
    aria-expanded=${field.expanded ? 'true' : 'false'}
    aria-controls=${field.controls}
    aria-activedescendant=${field.active}
    .value=${field.value}
  />`
}

/**
 * Hears typing and keys in the fields of a view that match `selector`, in that view rather than one mounted inside it.
 * @param {HTMLElement} root - Where the view is
 * @param {string} selector - Which fields
 * @param {FieldHandlers} handlers - What typing and keys do
 * @returns {() => void} Stops hearing them
 */
function hearField(root, selector, handlers) {
  /**
   * The field an event happened in, if it is one.
   * @param {Event} event - The event
   * @returns {HTMLElement | undefined} The field
   */
  const fieldOf = (event) => {
    const { target } = event
    return target instanceof HTMLElement && target.matches(selector) && inOwnView(root, target) ? target : undefined
  }
  /**
   * @param {Event} event - The input event
   * @returns {void}
   */
  const input = (event) => {
    const field = fieldOf(event)
    if (field instanceof HTMLInputElement) {
      handlers.input(field.value, deleted(event))
    }
  }
  /**
   * @param {Event} event - The key
   * @returns {void}
   */
  const keydown = (event) => {
    if (event instanceof KeyboardEvent && !event.isComposing && fieldOf(event) !== undefined && handlers.key(event)) {
      event.preventDefault()
    }
  }
  root.addEventListener('input', input)
  root.addEventListener('keydown', keydown)
  return () => {
    root.removeEventListener('input', input)
    root.removeEventListener('keydown', keydown)
  }
}

export { comboboxInput, hearField }
