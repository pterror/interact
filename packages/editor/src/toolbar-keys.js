/**
 * The keys of a toolbar, as the WAI-ARIA Authoring Practices' toolbar has them: the toolbar is one stop in the Tab
 * order (a roving tabindex: 0 on one button, -1 on the rest), the arrow keys along it move between its buttons and
 * wrap, Home and End go to its ends. The button in the Tab order is the one last focused, else the first. A piece
 * composed onto any buttons drawn for tools (`toolbar`'s, `selectionBar`'s), followed as they are drawn again.
 */

/**
 * @typedef {import('./tool-buttons.js').Drawn} Drawn
 */

/**
 * A value, and hearing it change
 * @template T
 * @typedef {Readonly<{ get: () => T, watch: (listener: () => void) => () => void }>} Watched
 */

/**
 * @typedef {Readonly<{
 *   element: HTMLElement,
 *   buttons: Watched<readonly Drawn[]>,
 *   orientation?: 'horizontal' | 'vertical',
 * }>} ToolbarKeysOptions
 */

/**
 * Moves focus among a toolbar's buttons by keys
 * @param {ToolbarKeysOptions} options - The toolbar's element (it gets `aria-orientation`), its buttons, and which way
 *   it runs (`horizontal` by default: Left and Right move)
 * @returns {() => void} Stops, leaving every button in the Tab order
 */
function toolbarKeys({ buttons, element, orientation = 'horizontal' }) {
  /** @type {HTMLElement | undefined} */
  let current
  const all = () => buttons.get().map((drawn) => drawn.button)
  const settle = () => {
    const list = all()
    const stop = current !== undefined && list.includes(current) ? current : list[0]
    for (const button of list) {
      button.tabIndex = button === stop ? 0 : -1
    }
  }
  const back = orientation === 'horizontal' ? 'ArrowLeft' : 'ArrowUp'
  const forward = orientation === 'horizontal' ? 'ArrowRight' : 'ArrowDown'
  /** @param {KeyboardEvent} event - The key */
  const onKey = (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) {
      return
    }
    const list = all()
    const at = event.target instanceof HTMLElement ? list.indexOf(event.target) : -1
    if (at === -1) {
      return
    }
    const n = list.length
    const to =
      event.key === forward
        ? (at + 1) % n
        : event.key === back
          ? (at - 1 + n) % n
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? n - 1
              : undefined
    const next = to === undefined ? undefined : list[to]
    if (next === undefined) {
      return
    }
    event.preventDefault()
    current = next
    settle()
    next.focus()
  }
  /** @param {FocusEvent} event - Where focus went */
  const onFocus = (event) => {
    const button = all().find((b) => b === event.target)
    if (button !== undefined) {
      current = button
      settle()
    }
  }
  element.setAttribute('aria-orientation', orientation)
  element.addEventListener('keydown', onKey)
  element.addEventListener('focusin', onFocus)
  const stop = buttons.watch(settle)
  settle()
  return () => {
    stop()
    element.removeEventListener('keydown', onKey)
    element.removeEventListener('focusin', onFocus)
    for (const button of all()) {
      button.tabIndex = 0
    }
  }
}

export { toolbarKeys }
