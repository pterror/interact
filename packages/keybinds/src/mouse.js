/**
 * Mouse input: buttons ("$mod+Click", "MiddleClick", "Back:up") and scrolling ("ScrollUp"). Showing and recording
 * them is keybinds/mouse-ui. Listened to for one keybinds(), buttons go down and up, held buttons are released when
 * the page never sees them let go, side buttons are kept from navigating while bound, and scrolling runs in steps: a
 * command runs once per step of scrolling (a wheel notch, or a trackpad's small deltas adding up to one), the page
 * holds still between steps, and a pause starts a new gesture.
 */

/**
 * @import { ParsedBinding } from './binding.js'
 * @import { Modifiers } from './binding-mods.js'
 * @import { Command } from './command.js'
 * @import { CommandInput, Dispatch, InputHandle, Lookups } from './input.js'
 */

import { NO_MODS, eventMods, holdsAll, modsToPrefix, parseMods } from './binding-mods.js'
import { splitBinding } from './binding.js'
import { overlayOpen } from './modal.js'

/**
 * How scroll bindings step: a command runs once per `step` pixels, and a pause of `idle` ms starts a new gesture
 * @typedef {Readonly<{ idle?: number, step?: number }>} WheelOptions
 */

/**
 * A scroll gesture on one binding: how far it has scrolled since the last step, when it last moved, and whether its
 * commands are taking it (if one returned false, the page scrolls instead)
 * @typedef {{ amount: number, last: number, ours: boolean }} Gesture
 */

/**
 * A mouse binding parsed: its modifiers, and its button as lookups name it ("click", "middle", "scrollup")
 * @typedef {Readonly<{ button: string, mods: Modifiers }>} ParsedMouse
 */

/**
 * Every name a binding can give a button, to the name lookups use
 * @type {ReadonlyMap<string, string>}
 */
const BUTTONS = new Map([
  ['back', 'back'],
  ['backclick', 'back'],
  ['click', 'click'],
  ['forward', 'forward'],
  ['forwardclick', 'forward'],
  ['left', 'click'],
  ['leftclick', 'click'],
  ['middle', 'middle'],
  ['middleclick', 'middle'],
  ['right', 'right'],
  ['rightclick', 'right'],
  ['scrolldown', 'scrolldown'],
  ['scrollleft', 'scrollleft'],
  ['scrollright', 'scrollright'],
  ['scrollup', 'scrollup'],
])

/** Pointer buttons as lookups name them, by `MouseEvent.button` */
const POINTER_BUTTONS = ['click', 'middle', 'right', 'back', 'forward']

/** Pointer buttons in the order of their bits in `MouseEvent.buttons`, lowest first */
const BUTTON_BITS = ['click', 'right', 'middle', 'back', 'forward']

/** Back and forward, which browsers bind to history navigation */
const SIDE_BUTTONS = new Set(['back', 'forward'])

const DEFAULT_STEP = 50
const DEFAULT_IDLE = 200
const LINE_HEIGHT = 16
const PAGE_HEIGHT = 800

const VALID = 'Click, RightClick, MiddleClick, BackClick, ForwardClick, ScrollUp, ScrollDown, ScrollLeft, ScrollRight'

/**
 * A pointer button's name as bindings write it, by `MouseEvent.button`
 * @param {number} button - The button
 * @returns {string | undefined} Its name, or undefined for a button no binding names
 */
function pointerButtonName(button) {
  return POINTER_BUTTONS[button]
}

/**
 * Whether `MouseEvent.buttons` says a button is down
 * @param {number} buttons - The event's `buttons`
 * @param {string} name - The button, as lookups name it
 * @returns {boolean} Whether it is down
 */
function isDown(buttons, name) {
  const position = BUTTON_BITS.indexOf(name)
  return BUTTON_BITS.includes(name) && Math.trunc(buttons / 2 ** position) % 2 === 1
}

/**
 * A mouse event's lookups, for any suffix and modifiers
 * @param {string} name - Its button, as lookups name it
 * @returns {Lookups} Its lookups: exact, and without modifiers
 */
function lookupsOf(name) {
  return (suffix, mods) => [[`${modsToPrefix(mods)}${name}${suffix}`], [`${name}${suffix}`]]
}

/**
 * Which way a wheel event scrolls, as a binding names it: vertically if it does, otherwise horizontally
 * @param {WheelEvent} event - The event
 * @returns {string | undefined} "scrollup", "scrolldown", "scrollleft" or "scrollright"; undefined if it doesn't
 */
function wheelDirection(event) {
  if (event.deltaY !== 0) {
    return event.deltaY < 0 ? 'scrollup' : 'scrolldown'
  }
  if (event.deltaX !== 0) {
    return event.deltaX < 0 ? 'scrollleft' : 'scrollright'
  }
  return undefined
}

/**
 * How far a wheel event scrolls along its main axis, in pixels
 * @param {WheelEvent} event - The event
 * @returns {number} The distance
 */
function wheelDistance(event) {
  const distance = Math.abs(event.deltaY === 0 ? event.deltaX : event.deltaY)
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
    return distance * LINE_HEIGHT
  }
  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    return distance * (event.view?.innerHeight ?? PAGE_HEIGHT)
  }
  return distance
}

/**
 * A mouse binding's one button, as lookups name it, checked to be one
 * @param {string} binding - The binding, for errors
 * @param {readonly string[]} remaining - Its parts that aren't modifiers
 * @returns {string} The button
 * @throws {Error} If there is no button, more than one, or an unknown one
 */
function onlyButton(binding, remaining) {
  const [raw, ...more] = remaining
  if (raw === undefined) {
    throw new Error(`Mouse binding has no button (only modifiers): "${binding}"`)
  }
  if (more.length > 0) {
    throw new Error(`Mouse binding has multiple buttons: "${binding}"`)
  }
  const button = BUTTONS.get(raw)
  if (button === undefined) {
    throw new Error(`Unknown mouse button "${raw}" in binding "${binding}". Valid: ${VALID}`)
  }
  return button
}

/**
 * Parses a mouse binding like "$mod+Click" or "MiddleClick", without its suffix
 * @param {string} binding - The binding
 * @param {string} [suffix] - Its suffix (":up", ":hold"), if any; scrolling takes none
 * @returns {ParsedMouse} Its modifiers and button
 * @throws {Error} If the binding is invalid
 */
function parseMouse(binding, suffix = '') {
  const parts = binding
    .toLowerCase()
    .split('+')
    .map((part) => part.trim())
    .filter((part) => part !== '')
  if (parts.length === 0) {
    throw new Error(`Empty mouse binding: "${binding}"`)
  }
  const { mods, remaining } = parseMods(parts)
  const button = onlyButton(binding, remaining)
  if (suffix !== '' && button.startsWith('scroll')) {
    throw new Error(`Scroll has no "${suffix}": "${binding}${suffix}"`)
  }
  return { button, mods }
}

/**
 * A parsed mouse binding as a lookup ("ctrl+click", "middle")
 * @param {ParsedMouse} parsed - The binding
 * @returns {string} Its lookup
 */
function mouseToLookup(parsed) {
  return `${modsToPrefix(parsed.mods)}${parsed.button}`
}

/**
 * Whether one of a command's mouse bindings is a press of this event's button with its modifiers
 * @param {Command} command - The command
 * @param {string} button - The event's button, as lookups name it
 * @param {Modifiers} held - The modifiers held
 * @returns {(binding: string) => boolean} Whether a binding is
 */
function pressOf(command, button, held) {
  return (binding) => {
    const { steps, suffix } = splitBinding(binding)
    if (suffix !== '' || steps.length !== 1) {
      return false
    }
    const parsed = parseMouse(binding)
    if (command.anyModifiers === true) {
      return parsed.button === button && holdsAll(parsed.mods, held)
    }
    return mouseToLookup(parsed) === mouseToLookup({ button, mods: held })
  }
}

/**
 * Whether a mouse press is one of a command's press bindings (same button, same modifiers), for code that handles
 * the press itself, like a drag that should start on a rebindable button
 * @param {Command} command - The command
 * @param {MouseEvent} event - The press
 * @returns {boolean} Whether it is
 */
function mouseMatches(command, event) {
  const button = pointerButtonName(event.button)
  if (button === undefined) {
    return false
  }
  return (command.mouse ?? []).some(pressOf(command, button, eventMods(event)))
}

/** The mouse, listened to for one keybinds() */
class MouseListener {
  /**
   * @readonly
   * @type {Dispatch}
   */
  #dispatch
  /**
   * Side buttons whose press or release a command took; their auxclick is cancelled too
   * @readonly
   * @type {Set<string>}
   */
  #swallowAux = new Set()
  /**
   * Scroll gestures, one per binding
   * @readonly
   * @type {Map<string, Gesture>}
   */
  #gestures = new Map()
  /**
   * Pixels per scroll step
   * @readonly
   * @type {number}
   */
  #step
  /**
   * The pause that ends a scroll gesture, in ms
   * @readonly
   * @type {number}
   */
  #idle

  /**
   * Starts listening
   * @param {Dispatch} dispatch - Where presses are reported, and commands found and run
   * @param {WheelOptions} wheel - How scrolling steps
   */
  constructor(dispatch, { idle = DEFAULT_IDLE, step = DEFAULT_STEP }) {
    this.#dispatch = dispatch
    this.#step = step
    this.#idle = idle
    const { capture, target } = dispatch
    for (const type of ['mousedown', 'mouseup', 'auxclick', 'mousemove']) {
      target.addEventListener(type, this, { capture })
    }
    target.addEventListener('wheel', this, { capture, passive: false })
  }

  /**
   * Hears the mouse
   * @param {Event} event - A mouse or wheel event
   * @returns {void}
   */
  handleEvent(event) {
    if (event instanceof WheelEvent) {
      this.#scrolled(event)
    } else if (event instanceof MouseEvent) {
      this.#mouse(event)
    }
  }

  /**
   * A mouse event other than scrolling
   * @param {MouseEvent} event - The event
   * @returns {void}
   */
  #mouse(event) {
    if (event.type === 'auxclick') {
      this.#auxClick(event)
      return
    }
    this.#reconcile(event)
    if (event.type === 'mousedown') {
      this.#down(event)
    } else if (event.type === 'mouseup') {
      this.#up(event)
    }
  }

  /**
   * A button can be let go where the page doesn't see it (over another window after focus moved), but every mouse
   * event says which buttons are down. Any held button that isn't gets its release now, rather than guessing at blur
   * whether it will come back
   * @param {MouseEvent} event - Any mouse event
   * @returns {void}
   */
  #reconcile(event) {
    for (const id of this.#dispatch.presses.keys()) {
      const goingUp = event.type === 'mouseup' && pointerButtonName(event.button) === id
      if (!isDown(event.buttons, id) && !goingUp) {
        this.#dispatch.up(id, new MouseEvent('mouseup', { button: POINTER_BUTTONS.indexOf(id), cancelable: true }))
      }
    }
  }

  /**
   * A button went down
   * @param {MouseEvent} event - The mousedown
   * @returns {void}
   */
  #down(event) {
    const name = pointerButtonName(event.button)
    if (name === undefined || overlayOpen(event, this.#dispatch.target)) {
      return
    }
    this.#swallowAux.delete(name)
    const press = this.#dispatch.down(name, event, { lookups: lookupsOf(name), mods: eventMods(event) })
    if (press.fired.size > 0 && SIDE_BUTTONS.has(name)) {
      this.#swallowAux.add(name)
    }
  }

  /**
   * A button came up. Browsers navigate on a side button's mouseup and auxclick, so both are cancelled while a
   * command takes the button
   * @param {MouseEvent} event - The mouseup
   * @returns {void}
   */
  #up(event) {
    const name = pointerButtonName(event.button)
    if (name === undefined) {
      return
    }
    const ended = this.#dispatch.up(name, event, { blocked: overlayOpen(event, this.#dispatch.target) })
    if (ended !== undefined && SIDE_BUTTONS.has(name) && (ended.consumed || ended.press.fired.size > 0)) {
      event.preventDefault()
      this.#swallowAux.add(name)
    }
  }

  /**
   * An auxclick, cancelled if a command took its side button
   * @param {MouseEvent} event - The auxclick
   * @returns {void}
   */
  #auxClick(event) {
    const name = pointerButtonName(event.button)
    if (name !== undefined && this.#swallowAux.delete(name)) {
      event.preventDefault()
    }
  }

  /**
   * The commands a scroll would run, the ones that apply now
   * @param {WheelEvent} event - The scroll
   * @returns {Readonly<{ active: readonly Command[], lookup: string }> | undefined} Them, and the gesture's binding
   */
  #bound(event) {
    const direction = wheelDirection(event)
    if (direction === undefined || overlayOpen(event, this.#dispatch.target)) {
      return undefined
    }
    const mods = eventMods(event)
    const lookup = `${modsToPrefix(mods)}${direction}`
    const active = (this.#dispatch.candidates([lookup], [direction], mods) ?? []).filter((command) =>
      this.#dispatch.isActive(command),
    )
    return active.length === 0 ? undefined : { active, lookup }
  }

  /**
   * The gesture a scroll belongs to: the one going on, or a new one after a pause
   * @param {string} lookup - The scroll's binding
   * @returns {Gesture} The gesture, moved now
   */
  #gesture(lookup) {
    const now = performance.now()
    const going = this.#gestures.get(lookup)
    const gesture = going === undefined || now - going.last > this.#idle ? { amount: 0, last: now, ours: true } : going
    gesture.last = now
    this.#gestures.set(lookup, gesture)
    return gesture
  }

  /**
   * The wheel moved: a step runs the first command that takes it, one step per event so a fast flick doesn't queue
   * up a burst. Between steps the gesture is still the commands', so the page mustn't scroll or zoom meanwhile
   * @param {WheelEvent} event - The scroll
   * @returns {void}
   */
  #scrolled(event) {
    const bound = this.#bound(event)
    const gesture = bound === undefined ? undefined : this.#gesture(bound.lookup)
    if (bound === undefined || gesture?.ours !== true) {
      return
    }
    event.preventDefault()
    // How far the gesture has scrolled since its last step, a step taken off once it has scrolled that far
    const scrolled = gesture.amount + wheelDistance(event)
    if (scrolled < this.#step) {
      gesture.amount = scrolled
      return
    }
    gesture.amount = Math.min(scrolled - this.#step, this.#step)
    gesture.ours = bound.active.some((command) => this.#dispatch.execute(command, event))
  }

  /** @returns {void} */
  stop() {
    const { capture, target } = this.#dispatch
    for (const type of ['mousedown', 'mouseup', 'auxclick', 'mousemove', 'wheel']) {
      target.removeEventListener(type, this, { capture })
    }
    this.#gestures.clear()
    this.#swallowAux.clear()
  }
}

/**
 * The mouse
 * @param {Readonly<{ wheel?: WheelOptions }>} [options] - Scroll bindings: a command runs once per `step` pixels
 *   scrolled (default 50, about one mouse-wheel notch; a trackpad's small deltas add up to it), and a pause of `idle`
 *   ms (default 200) starts a new gesture
 * @returns {CommandInput} The mouse, as an input
 */
function mouse(options = {}) {
  const wheel = options.wheel ?? {}
  return {
    field: 'mouse',
    /**
     * Starts listening
     * @param {Dispatch} dispatch - Where presses are reported
     * @returns {InputHandle} A function that stops
     */
    listen(dispatch) {
      const listener = new MouseListener(dispatch, wheel)
      return () => {
        listener.stop()
      }
    },
    matches: (command, event) => event instanceof MouseEvent && mouseMatches(command, event),
    /**
     * Parses one step of a binding
     * @param {string} step - The step
     * @param {string} suffix - Its suffix, if any
     * @returns {ParsedBinding} The step normalized
     */
    parse(step, suffix) {
      const parsed = parseMouse(step, suffix)
      return { lookup: mouseToLookup(parsed), loose: mouseToLookup({ ...parsed, mods: NO_MODS }), mods: parsed.mods }
    },
  }
}

export { mouse, mouseMatches, parseMouse, pointerButtonName, wheelDirection }
