/**
 * Closing something by the usual gestures: a press outside every element it is made of, or an Escape nothing else
 * took (one whose default nothing prevented, as keybinds prevents a key a command takes). An inner level that binds
 * Escape itself closes alone, and the press of a control among the elements (the button that toggles it) is left to
 * that control.
 */

/**
 * Setting whether it is open
 * @typedef {(open: boolean) => void} SetOpen
 */

/**
 * @typedef {Readonly<{ elements: readonly Element[], to: SetOpen }>} DismissOptions
 */

/**
 * Sets `false` on a press outside the elements, or an Escape left untaken
 * @param {DismissOptions} options - What it is made of, and setting whether it is open
 * @returns {() => void} Stops
 */
function dismiss({ elements, to }) {
  const document = elements[0]?.ownerDocument
  if (document === undefined) {
    return () => undefined
  }
  /**
   * @param {Event} event - A pointerdown
   * @returns {void}
   */
  const pressed = (event) => {
    const path = event.composedPath()
    if (!elements.some((element) => path.includes(element))) {
      to(false)
    }
  }
  /**
   * @param {Event} event - A keydown, after everything under the document heard it
   * @returns {void}
   */
  const keyed = (event) => {
    if (event instanceof KeyboardEvent && event.key === 'Escape' && !event.defaultPrevented) {
      to(false)
    }
  }
  document.addEventListener('pointerdown', pressed, { capture: true })
  document.addEventListener('keydown', keyed)
  return () => {
    document.removeEventListener('pointerdown', pressed, { capture: true })
    document.removeEventListener('keydown', keyed)
  }
}

export { dismiss }
