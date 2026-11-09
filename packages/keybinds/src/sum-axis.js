/**
 * Several axes as one: their positions added and kept from -1 to 1, their deltas added.
 */

/**
 * @typedef {Readonly<{ position: number, delta: number }>} AxisValue
 */

/**
 * The axes as one
 * @param {readonly (() => AxisValue)[]} values - The axes
 * @returns {() => AxisValue} Their sum now
 */
function sumAxis(values) {
  return () => {
    let delta = 0
    let position = 0
    for (const value of values) {
      const now = value()
      delta += now.delta
      position += now.position
    }
    return { delta, position: Math.max(-1, Math.min(1, position)) }
  }
}

export { sumAxis }
