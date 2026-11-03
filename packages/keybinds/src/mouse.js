/**
 * Mouse input: buttons ("$mod+Click", "MiddleClick", "Back:up") and scrolling ("ScrollUp"). Showing and recording
 * them is keybinds/mouse-ui.
 */

/**
 * @import { ParsedBinding } from './binding.js'
 * @import { Modifiers } from './binding-mods.js'
 * @import { Command } from './command.js'
 * @import { CommandInput, Dispatch, InputHandle } from './input.js'
 * @import { WheelOptions } from './mouse-listener.js'
 */

import { NO_MODS, eventMods, holdsAll, modsToPrefix, parseMods } from './binding-mods.js'
import { splitBinding } from './binding.js'
import { MouseListener, pointerButtonName } from './mouse-listener.js'

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

const NO_MORE = 0
const ONE_STEP = 1

const VALID = 'Click, RightClick, MiddleClick, BackClick, ForwardClick, ScrollUp, ScrollDown, ScrollLeft, ScrollRight'

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
  if (more.length > NO_MORE) {
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
  if (parts.length === NO_MORE) {
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
    if (suffix !== '' || steps.length !== ONE_STEP) {
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

export { mouse, mouseMatches, parseMouse }
