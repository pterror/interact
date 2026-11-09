/**
 * Recording a mouse binding from the next click or scroll, or with `release` a button pressed and let go
 * ("middle:up", bound with the modifiers held as it went down). Scrolling has no release.
 */

import { eventModifierParts } from './modifiers.js'
import { mouseName } from './mouse-parse.js'

/**
 * @typedef {Readonly<{
 *   done: (binding: string) => void,
 *   target?: EventTarget,
 *   release?: boolean,
 *   ignore?: (event: Event) => boolean,
 * }>} RecordMouseOptions
 */

/**
 * A mouse or wheel event as a binding ("$mod+click", "scrollup")
 * @param {MouseEvent} event - The mousedown or wheel event
 * @returns {string | undefined} The binding, without a suffix; nothing for a button no binding names, or a wheel
 *   event that doesn't scroll
 */
function mouseBinding(event) {
  const name = mouseName(event)
  return name === undefined ? undefined : [...eventModifierParts(event), name].join('+')
}

/**
 * Records a mouse binding from the next click or scroll
 * @param {RecordMouseOptions} options - What gets the binding; where to listen (default the window); whether to
 *   record a release; and which events to leave alone (the recording's own controls)
 * @returns {() => void} Stopping
 */
function recordMouse({ done, ignore = () => false, release = false, target = globalThis }) {
  /** @type {Readonly<{ binding: string, button: number }> | undefined} */
  let held = undefined

  /**
   * @param {Event} event - A mousedown, mouseup or wheel event
   * @returns {void}
   */
  const onMouse = (event) => {
    const scroll = event instanceof WheelEvent
    if (!(scroll || event instanceof MouseEvent) || ignore(event)) {
      return
    }
    const binding = event.type === 'mouseup' ? undefined : mouseBinding(event)
    if (event.type === 'mouseup' && held?.button === event.button) {
      event.preventDefault()
      event.stopPropagation()
      done(`${held.binding}:up`)
      held = undefined
    } else if (binding !== undefined && !(scroll && release)) {
      event.preventDefault()
      event.stopPropagation()
      if (release) {
        held = { binding, button: event.button }
      } else {
        done(binding)
      }
    }
  }

  for (const type of ['mousedown', 'mouseup', 'wheel']) {
    target.addEventListener(type, onMouse, true)
  }
  return () => {
    for (const type of ['mousedown', 'mouseup', 'wheel']) {
      target.removeEventListener(type, onMouse, true)
    }
  }
}

export { mouseBinding, recordMouse }
