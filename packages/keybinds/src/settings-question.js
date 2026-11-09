/**
 * The question a settings panel asks when a binding is another id's, a `data-keybinds=conflict` span (`role=alert`):
 * whose it is, and buttons to replace that one (`data-keybinds=replace`) or cancel (`data-keybinds=cancel`).
 */

/**
 * @typedef {Readonly<{ labelOf: (id: string) => string, accept: () => void, cancel: () => void }>}
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
 * @param {SettingsQuestionOptions} options - An id's label; and answering (conflictQuestion()'s)
 * @returns {(question: Readonly<{ taken: string }>) => HTMLElement} The question, for the id that has the binding
 */
function settingsQuestion({ accept, cancel, labelOf }) {
  return ({ taken }) => {
    const element = document.createElement('span')
    element.dataset['keybinds'] = 'conflict'
    element.setAttribute('role', 'alert')
    element.append(
      `Already bound to "${labelOf(taken)}". `,
      button('replace', 'Replace', accept),
      button('cancel', 'Cancel', cancel),
    )
    return element
  }
}

export { settingsQuestion }
