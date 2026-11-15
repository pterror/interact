/**
 * The question a settings panel asks when a binding is another id's, a `data-keybinds=conflict` span (`role=alert`):
 * whose it is, and buttons to replace that one (`data-keybinds=replace`) or cancel (`data-keybinds=cancel`).
 */

import { withStrings } from './strings.js'

/** @import { StringsOption } from './strings.js' */

/**
 * @typedef {Readonly<{ labelOf: (id: string) => string, accept: () => void, cancel: () => void,
 *   strings?: StringsOption }>}
 *   SettingsQuestionOptions
 */

/**
 * A button
 * @param {string} name - Its `data-keybinds`
 * @param {string} text - Its text
 * @param {() => void} click - What it does
 * @returns {HTMLButtonElement} The button
 */
function button(name, text, click) {
  const made = document.createElement('button')
  made.type = 'button'
  made.dataset['keybinds'] = name
  made.textContent = text
  made.addEventListener('click', click)
  return made
}

/**
 * Makes the question
 * @param {SettingsQuestionOptions} options - An id's label; answering (conflictQuestion()'s); and the words to show
 *   in place of English
 * @returns {(question: Readonly<{ taken: string }>) => HTMLElement} The question, for the id that has the binding
 */
function settingsQuestion({ accept, cancel, labelOf, strings }) {
  const words = withStrings(strings)
  return ({ taken }) => {
    const element = document.createElement('span')
    element.dataset['keybinds'] = 'conflict'
    element.setAttribute('role', 'alert')
    element.append(
      `${words.alreadyBound(labelOf(taken))} `,
      button('replace', words.replace, accept),
      button('cancel', words.cancel, cancel),
    )
    return element
  }
}

export { settingsQuestion }
