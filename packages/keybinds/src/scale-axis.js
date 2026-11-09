/**
 * An axis scaled: its position and delta times a factor; -1 inverts it ("-mouse:y").
 */

/**
 * @typedef {Readonly<{ position: number, delta: number }>} AxisValue
 */

/**
 * The axis scaled
 * @param {() => AxisValue} value - The axis
 * @param {number} factor - The factor
 * @returns {() => AxisValue} It, times the factor
 */
function scaleAxis(value, factor) {
  return () => {
    const now = value()
    return { delta: now.delta * factor, position: now.position * factor }
  }
}

export { scaleAxis }
