/**
 * Focuses an element when a Watched boolean becomes true. It focuses once everything else that heard the change has
 * (in a microtask), so an element shown by the same change is shown by then, and only if the boolean is still true.
 */

/**
 * Whether to have focus, and hearing that change
 * @typedef {Readonly<{ get: () => boolean, watch: (listener: () => void) => () => void }>} When
 */

/**
 * @typedef {Readonly<{ element: HTMLElement, when: When }>} FocusWhenOptions
 */

/**
 * Focuses an element each time `when` becomes true
 * @param {FocusWhenOptions} options - The element, and when it takes focus
 * @returns {() => void} Stops
 */
function focusWhen({ element, when }) {
  let was = when.get()
  return when.watch(() => {
    const now = when.get()
    if (now && !was) {
      queueMicrotask(() => {
        if (when.get()) {
          element.focus()
        }
      })
    }
    was = now
  })
}

export { focusWhen }
