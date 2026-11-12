/**
 * The buttons for a list of tools, kept in step with the editor's state: `aria-pressed` while a tool's `on` holds,
 * `aria-disabled` while its `applies` doesn't. A press keeps the editor's selection and focus, and runs the tool's
 * command on the editor.
 */

/**
 * @typedef {import('@codemirror/view').EditorView} EditorView
 * @typedef {import('@codemirror/state').EditorState} EditorState
 */

/**
 * One thing a person can do to the text from a button
 * @typedef {Readonly<{
 *   id: string,
 *   label: string,
 *   icon?: () => Element,
 *   run: (view: EditorView) => boolean,
 *   on?: (state: EditorState) => boolean,
 *   applies?: (state: EditorState) => boolean,
 * }>} Tool
 */

/**
 * A button for a tool
 * @param {EditorView} view - The editor
 * @param {Tool} tool - The tool
 * @param {readonly string[] | undefined} keys - How its key is shown, if it has one
 * @returns {HTMLElement} The button
 */
function buttonFor(view, tool, keys) {
  const button = view.dom.ownerDocument.createElement('button')
  button.type = 'button'
  button.dataset['tool'] = tool.id
  button.title = keys === undefined || keys.length === 0 ? tool.label : `${tool.label} (${keys.join(' ')})`
  if (tool.icon === undefined) {
    button.textContent = tool.label
  } else {
    button.setAttribute('aria-label', tool.label)
    button.append(tool.icon())
  }
  button.addEventListener('mousedown', (event) => {
    event.preventDefault()
  })
  button.addEventListener('click', () => {
    if (tool.applies?.(view.state) === false) {
      return
    }
    tool.run(view)
    view.focus()
  })
  return button
}

/**
 * Sets a button's state from the editor's
 * @param {HTMLElement} button - The button
 * @param {Tool} tool - Its tool
 * @param {EditorState} state - The editor's state
 * @returns {void}
 */
function showState(button, tool, state) {
  if (tool.on === undefined) {
    button.removeAttribute('aria-pressed')
  } else {
    button.setAttribute('aria-pressed', String(tool.on(state)))
  }
  if (tool.applies === undefined || tool.applies(state)) {
    button.removeAttribute('aria-disabled')
  } else {
    button.setAttribute('aria-disabled', 'true')
  }
}

/**
 * Draws the buttons for tools into an element, replacing what it held
 * @param {Element} into - The element
 * @param {EditorView} view - The editor
 * @param {readonly Tool[]} tools - The tools
 * @param {(id: string) => readonly string[] | undefined} keyOf - How each tool's key is shown
 * @returns {readonly Readonly<{ button: HTMLElement, tool: Tool, keys: readonly string[] | undefined }>[]} The
 *   buttons
 */
function drawButtons(into, view, tools, keyOf) {
  /** @type {readonly Readonly<{ button: HTMLElement, tool: Tool, keys: readonly string[] | undefined }>[]} */
  const buttons = tools.map((tool) => {
    const keys = keyOf(tool.id)
    const button = buttonFor(view, tool, keys)
    showState(button, tool, view.state)
    return { button, keys, tool }
  })
  into.replaceChildren(...buttons.map(({ button }) => button))
  return buttons
}

export { drawButtons, showState }
