/**
 * Giving focus back when an element closes: what had focus as it opened gets it again, if focus is then inside the
 * element or nowhere (hiding the element took it), and not if the person has moved it elsewhere.
 */

/**
 * @typedef {Readonly<{
 *   element: Element,
 *   open: Readonly<{ get: () => boolean, watch: (listener: () => void) => () => void }>,
 * }>} FocusReturnOptions
 */

/**
 * Gives focus back as the element closes
 * @param {FocusReturnOptions} options - The element, and whether it is open
 * @returns {() => void} Stopping
 */
function focusReturn({ element, open }) {
  /** @type {Element | undefined} */
  let before = undefined
  let was = open.get()
  return open.watch(() => {
    const now = open.get()
    const document = element.ownerDocument
    if (now && !was) {
      before = document.activeElement ?? undefined
    } else if (!now && was) {
      const focused = document.activeElement
      const lost = focused === null || focused === document.body || element.contains(focused)
      if (lost && before instanceof HTMLElement && before !== focused) {
        before.focus()
      }
      before = undefined
    }
    was = now
  })
}

export { focusReturn }
