/**
 * @import { TemplateResult } from '@interact/dom/template'
 */

import { html } from '@interact/dom'

/**
 * What an editable combobox's text field is (the WAI-ARIA APG combobox pattern): its part, its accessible name, how it
 * autocompletes, whether its list shows, the id of that list and of the option active in it, the text in it, and what
 * typing and keys in it do. `input` hears the new text and whether it was deleting; `key` hears a key and says whether
 * it used it. A key typed to compose text (an input method) is the input method's, so `key` never hears it.
 * @typedef {Readonly<{
 *   part: string,
 *   label: string,
 *   autocomplete: 'none' | 'list' | 'both',
 *   expanded: boolean,
 *   controls: string,
 *   active: string | undefined,
 *   value: string,
 *   input: (text: string, deleting: boolean) => void,
 *   key: (event: KeyboardEvent) => boolean,
 * }>} ComboboxField
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
    aria-autocomplete=${field.autocomplete}
    aria-expanded=${field.expanded ? 'true' : 'false'}
    aria-controls=${field.controls}
    aria-activedescendant=${field.active}
    .value=${field.value}
    @input=${(event) => {
      const input = event.currentTarget
      if (input instanceof HTMLInputElement) {
        field.input(input.value, deleted(event))
      }
    }}
    @keydown=${(event) => {
      if (event instanceof KeyboardEvent && !event.isComposing && field.key(event)) {
        event.preventDefault()
      }
    }}
  />`
}

export { comboboxInput }
