/**
 * Showing and recording mouse bindings, for the settings panel, cheatsheet, palette and menus.
 */

/**
 * @import { InputUI } from './input.js'
 * @import { WheelOptions } from './mouse-listener.js'
 */

import { formatWithRelease } from './binding-format.js'
import { eventModParts, formatModPart } from './binding-mods.js'
import { RELEASE_SUFFIX, splitRelease } from './binding.js'
import { pointerButtonName } from './mouse-listener.js'
import { MouseRecorder } from './mouse-recorder.js'
import { wheelDirection } from './mouse-wheel.js'
import { mouse } from './mouse.js'

/**
 * How each button name a binding can use is shown
 * @type {ReadonlyMap<string, string>}
 */
const SHOWN = new Map([
  ['back', 'Back'],
  ['backclick', 'Back'],
  ['click', 'Click'],
  ['forward', 'Forward'],
  ['forwardclick', 'Forward'],
  ['left', 'Click'],
  ['leftclick', 'Click'],
  ['middle', 'Middle'],
  ['middleclick', 'Middle'],
  ['right', 'Right'],
  ['rightclick', 'Right'],
  ['scrolldown', 'Scroll ↓'],
  ['scrollleft', 'Scroll ←'],
  ['scrollright', 'Scroll →'],
  ['scrollup', 'Scroll ↑'],
])

const SCROLL = /(?:^|\+)scroll(?:up|down|left|right)$/u

/**
 * One part of a mouse binding as shown
 * @param {string} part - The part
 * @returns {string} Its symbol or name
 */
function formatMousePart(part) {
  const name = part.trim().toLowerCase()
  return formatModPart(name) ?? SHOWN.get(name) ?? part
}

/**
 * A mouse binding as display parts ("$mod+click" is ["⌘", "Click"] on a Mac)
 * @param {string} binding - The binding
 * @returns {string[]} The parts as shown
 */
function formatMouseParts(binding) {
  return formatWithRelease(binding, formatMousePart)
}

/**
 * A mouse or wheel event as a binding ("$mod+click", "$mod+scrollup", "middle:up" for a mouseup)
 * @param {MouseEvent} event - The event
 * @returns {string | undefined} The binding, or undefined for a button no binding names, or a wheel event that
 *   doesn't scroll
 */
function eventToMouseBindingString(event) {
  const scroll = event instanceof WheelEvent
  const name = scroll ? wheelDirection(event) : pointerButtonName(event.button)
  if (name === undefined) {
    return undefined
  }
  const suffix = !scroll && event.type === 'mouseup' ? RELEASE_SUFFIX : ''
  return `${[...eventModParts(event), name].join('+')}${suffix}`
}

/**
 * The mouse, shown and recorded as well as listened to
 * @param {Readonly<{ wheel?: WheelOptions }>} [options] - As for mouse()
 * @returns {InputUI} The mouse, as an input that can be shown and recorded
 */
function mouseUI(options = {}) {
  return {
    ...mouse(options),
    format: formatMouseParts,
    label: 'Mouse',
    prompt: (release) => (release ? 'Press and release a button...' : 'Click or scroll...'),
    record: (recordOptions, done) => {
      const recorder = new MouseRecorder(recordOptions, { done, toBinding: eventToMouseBindingString })
      return () => {
        recorder.stop()
      }
    },
    release: (binding) => !SCROLL.test(splitRelease(binding.toLowerCase()).body),
  }
}

export { eventToMouseBindingString, formatMouseParts, mouseUI }
