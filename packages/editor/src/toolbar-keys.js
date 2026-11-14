/**
 * Moving among a toolbar's buttons, as the WAI-ARIA Authoring Practices' toolbar has it: the toolbar is one stop in the
 * Tab order (a roving tabindex: 0 on one button, -1 on the rest), the button last focused, else the first; its moves go
 * from that button to another and focus it, and the arrow keys' moves wrap from one end to the other. A button whose
 * tool doesn't apply is moved to like any other (`aria-disabled`, still focusable). A piece composed onto any buttons
 * drawn for tools (`toolbar`'s, `selectionBar`'s), followed as they are drawn again. It reads no key: the app binds
 * the moves (with keybinds) on the toolbar's element, the arrow keys along `orientation` to `by`, Home and End to
 * `edge`.
 */

import { arrayStep } from '@pterror/interact-list/array-step'
import { move } from '@pterror/interact-list/move'
import { wrapStep } from '@pterror/interact-list/wrap-step'

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
 * Moves among a toolbar's buttons: `by(n)` focuses the button `n` on from the one in the Tab order (back, if
 * negative), wrapping at the ends; `edge(n)` the button `n` from an end (1: the first, -1: the last). Each resolves
 * once focus has moved
 * @typedef {Readonly<{ by: (n: number) => Promise<void>, edge: (n: number) => Promise<void>, stop: () => void }>}
 *   ToolbarKeys
 */

/**
 * Moves focus among a toolbar's buttons
 * @param {ToolbarKeysOptions} options - The toolbar's element (it gets `aria-orientation`), its buttons, and which way
 *   it runs (`horizontal` by default), which says which arrow keys the app binds to `by`
 * @returns {ToolbarKeys} The moves, and stopping, which leaves every button in the Tab order
 */
function toolbarKeys({ buttons, element, orientation = 'horizontal' }) {
  /** @type {HTMLElement | undefined} */
  let current = undefined
  const all = () => buttons.get().map((drawn) => drawn.button)
  /** @returns {HTMLElement | undefined} The button in the Tab order */
  const stopOf = () => {
    const list = all()
    return current !== undefined && list.includes(current) ? current : list[0]
  }
  const settle = () => {
    const stop = stopOf()
    for (const button of all()) {
      button.tabIndex = button === stop ? 0 : -1
    }
  }
  const moves = move({
    from: stopOf,
    // Wrapping is a proposal (docs/design.md); the Practices leave it to the toolbar
    step: wrapStep(arrayStep(all)),
    to: (button) => {
      if (button !== undefined) {
        current = button
        settle()
        button.focus()
      }
    },
  })
  /** @param {FocusEvent} event - Where focus went */
  const focused = (event) => {
    const button = all().find((each) => each === event.target)
    if (button !== undefined) {
      current = button
      settle()
    }
  }
  element.setAttribute('aria-orientation', orientation)
  element.addEventListener('focusin', focused)
  const unwatch = buttons.watch(settle)
  settle()
  return {
    by: moves.by,
    edge: moves.edge,
    stop() {
      unwatch()
      element.removeEventListener('focusin', focused)
      for (const button of all()) {
        button.tabIndex = 0
      }
    },
  }
}

export { toolbarKeys }
