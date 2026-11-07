/**
 * The browser's "standard" gamepad layout, and the pads connected now. Gamepads have no events for their buttons or
 * sticks, so whatever reads them reads every pad each frame.
 */

/**
 * A pad as read in one frame: what keybinds uses of the browser's `Gamepad`
 * @typedef {Readonly<{ axes: readonly number[], buttons: readonly Readonly<{ pressed: boolean, value: number }>[],
 *   index: number }>} Pad
 */

/** The standard layout's buttons, by index. Face buttons are named by position: an Xbox pad's A is "a", and so is a
 * PlayStation pad's cross */
const GAMEPAD_BUTTONS = [
  'a',
  'b',
  'x',
  'y',
  'lb',
  'rb',
  'lt',
  'rt',
  'back',
  'start',
  'ls',
  'rs',
  'up',
  'down',
  'left',
  'right',
  'home',
]

/**
 * Other names for buttons: by direction, PlayStation's, and the controls' own names
 * @type {ReadonlyMap<string, string>}
 */
const GAMEPAD_ALIASES = new Map([
  ['dpaddown', 'down'],
  ['dpadleft', 'left'],
  ['dpadright', 'right'],
  ['dpadup', 'up'],
  ['east', 'b'],
  ['guide', 'home'],
  ['l1', 'lb'],
  ['l2', 'lt'],
  ['l3', 'ls'],
  ['menu', 'start'],
  ['north', 'y'],
  ['r1', 'rb'],
  ['r2', 'rt'],
  ['r3', 'rs'],
  ['select', 'back'],
  ['south', 'a'],
  ['view', 'back'],
  ['west', 'x'],
])

/**
 * Whether the browser can read gamepads at all
 * @returns {boolean} Whether it can
 */
function hasPads() {
  return typeof navigator !== 'undefined' && typeof navigator.getGamepads === 'function'
}

/**
 * The pads connected now
 * @returns {Pad[]} Each, as the browser reads it this frame
 */
function connectedPads() {
  if (!hasPads()) {
    return []
  }
  /** @type {Pad[]} */
  const pads = []
  for (const pad of navigator.getGamepads()) {
    if (pad !== null) {
      pads.push(pad)
    }
  }
  return pads
}

/**
 * Which of a pad's standard buttons are down
 * @param {Pad} pad - The pad
 * @returns {boolean[]} Whether each is down, by index in GAMEPAD_BUTTONS
 */
function pressedButtons(pad) {
  return GAMEPAD_BUTTONS.map((_name, index) => pad.buttons[index]?.pressed === true)
}

/** The standard layout's sticks by their index in `Gamepad.axes`, then its triggers */
const PAD_AXES = ['lx', 'ly', 'rx', 'ry', 'lt', 'rt']

const TRIGGERS = new Set(['lt', 'rt'])

/** How far a stick can drift from the middle at rest; less reads as nothing */
const DEADZONE = 0.15

/**
 * One pad's stick or trigger as the browser reads it: a trigger's pull from 0 to 1, a stick from -1 to 1
 * @param {Pad} pad - The pad
 * @param {string} source - One of PAD_AXES
 * @returns {number} Where it is
 */
function rawAxis(pad, source) {
  if (TRIGGERS.has(source)) {
    return pad.buttons[GAMEPAD_BUTTONS.indexOf(source)]?.value ?? 0
  }
  return pad.axes[PAD_AXES.indexOf(source)] ?? 0
}

/**
 * Where one pad's stick or trigger is, a stick's drift around the middle taken out
 * @param {Pad} pad - The pad
 * @param {string} source - One of PAD_AXES
 * @returns {number} Where it is
 */
function padAxisOf(pad, source) {
  const value = rawAxis(pad, source)
  if (TRIGGERS.has(source)) {
    return value
  }
  if (Math.abs(value) <= DEADZONE) {
    return 0
  }
  return (Math.sign(value) * (Math.abs(value) - DEADZONE)) / (1 - DEADZONE)
}

/**
 * Where a stick or trigger is, summed over every connected pad
 * @param {string} source - One of PAD_AXES
 * @returns {number} Where it is
 */
function padAxis(source) {
  return connectedPads().reduce((sum, pad) => sum + padAxisOf(pad, source), 0)
}

/**
 * One pad's sticks and triggers as the browser reads them, in the order of PAD_AXES
 * @param {Pad} pad - The pad
 * @returns {number[]} Where each is
 */
function padAxesOf(pad) {
  return PAD_AXES.map((source) => rawAxis(pad, source))
}

export { GAMEPAD_ALIASES, GAMEPAD_BUTTONS, PAD_AXES, connectedPads, hasPads, padAxesOf, padAxis, pressedButtons }
