/**
 * A stick or trigger of the standard gamepad layout as an axis, summed over every pad connected: a stick from -1 to 1
 * with its drift around the middle taken out, a trigger's pull from 0 to 1.
 */

/**
 * @typedef {Readonly<{ position: number, delta: number }>} AxisValue
 */

/**
 * @typedef {Readonly<{ axes: readonly number[], buttons: readonly Readonly<{ value: number }>[] }>} Pad
 */

/** Sticks by their index in `Gamepad.axes` */
const STICKS = ['lx', 'ly', 'rx', 'ry']

/** Triggers by their index in `Gamepad.buttons` */
const TRIGGERS = new Map([
  ['lt', 6],
  ['rt', 7],
])

/** How far a stick drifts from the middle at rest; less reads as nothing */
const DEADZONE = 0.15

/**
 * Where one pad's stick or trigger is
 * @param {Pad} pad - The pad
 * @param {string} axis - "lx", "ly", "rx", "ry", "lt" or "rt"
 * @returns {number} Where it is
 */
function positionOf(pad, axis) {
  const trigger = TRIGGERS.get(axis)
  if (trigger !== undefined) {
    return pad.buttons[trigger]?.value ?? 0
  }
  const value = pad.axes[STICKS.indexOf(axis)] ?? 0
  return Math.abs(value) <= DEADZONE ? 0 : (Math.sign(value) * (Math.abs(value) - DEADZONE)) / (1 - DEADZONE)
}

/**
 * The axis
 * @param {Readonly<{ get: () => readonly Pad[] }>} pads - The pads connected
 * @param {string} axis - "lx", "ly", "rx", "ry", "lt" or "rt"
 * @returns {() => AxisValue} Its position now; a stick has no delta
 */
function padAxis(pads, axis) {
  return () => ({ delta: 0, position: pads.get().reduce((sum, pad) => sum + positionOf(pad, axis), 0) })
}

export { padAxis }
