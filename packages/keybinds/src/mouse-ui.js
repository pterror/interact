/**
 * Showing and recording mouse bindings, for the settings panel, cheatsheet, palette and menus. Recording takes what's
 * done next: a click or a scroll, or with `release` a button's press and its release. Scrolling has no release.
 */

/**
 * @import { InputUI, RecordOptions } from './input.js'
 * @import { WheelOptions } from './mouse.js'
 */

import { formatWithRelease } from './binding-format.js'
import { eventModParts, formatModPart } from './binding-mods.js'
import { RELEASE_SUFFIX, splitRelease } from './binding.js'
import { mouse, pointerButtonName, wheelDirection } from './mouse.js'

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

const TYPES = ['mousedown', 'mouseup', 'wheel']

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
 * Keeps an event from reaching anything else: it is the recording's
 * @param {Event} event - The event
 * @returns {void}
 */
function take(event) {
  event.preventDefault()
  event.stopPropagation()
}

/** One recording of a mouse binding */
class MouseRecorder {
  /**
   * @readonly
   * @type {RecordOptions}
   */
  #options
  /**
   * @readonly
   * @type {(binding: string) => void}
   */
  #done
  /**
   * @readonly
   * @type {Window}
   */
  #target
  /**
   * The press being held until its mouseup, for a release
   * @type {Readonly<{ binding: string, button: number }> | undefined}
   */
  #held

  /**
   * Starts listening for the next click or scroll
   * @param {RecordOptions} options - How recording goes
   * @param {(binding: string) => void} done - Gets the binding
   */
  constructor(options, done) {
    this.#options = options
    this.#done = done
    this.#target = options.target ?? globalThis.window
    for (const type of TYPES) {
      this.#target.addEventListener(type, this, true)
    }
  }

  /**
   * Hears the mouse
   * @param {Event} event - A mousedown, mouseup or wheel
   * @returns {void}
   */
  handleEvent(event) {
    if (event instanceof WheelEvent) {
      this.#wheel(event)
    } else if (event instanceof MouseEvent && !this.#options.ignore(event)) {
      if (event.type === 'mouseup') {
        this.#up(event)
      } else {
        this.#down(event)
      }
    }
  }

  /**
   * A button went down: recorded at once, or held until it comes up
   * @param {MouseEvent} event - The mousedown
   * @returns {void}
   */
  #down(event) {
    const binding = eventToMouseBindingString(event)
    if (binding === undefined) {
      return
    }
    take(event)
    if (this.#options.release) {
      this.#held = { binding, button: event.button }
    } else {
      this.#done(binding)
    }
  }

  /**
   * A button came up: the held press's release is recorded
   * @param {MouseEvent} event - The mouseup
   * @returns {void}
   */
  #up(event) {
    const held = this.#held
    if (held === undefined || held.button !== event.button) {
      return
    }
    take(event)
    this.#held = undefined
    this.#done(`${held.binding}${RELEASE_SUFFIX}`)
  }

  /**
   * The wheel moved: recorded, unless a release is being recorded
   * @param {WheelEvent} event - The scroll
   * @returns {void}
   */
  #wheel(event) {
    const binding = this.#options.release ? undefined : eventToMouseBindingString(event)
    if (binding === undefined) {
      return
    }
    take(event)
    this.#done(binding)
  }

  /** @returns {void} */
  stop() {
    for (const type of TYPES) {
      this.#target.removeEventListener(type, this, true)
    }
  }
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
      const recorder = new MouseRecorder(recordOptions, done)
      return () => {
        recorder.stop()
      }
    },
    release: (binding) => !SCROLL.test(splitRelease(binding.toLowerCase()).body),
    ui: true,
  }
}

export { eventToMouseBindingString, formatMouseParts, mouseUI }
