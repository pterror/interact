/**
 * An axis that reads zero while it doesn't apply: while its binding's `when` is false, or while an overlay holds focus.
 * It is still read then, so movement made meanwhile isn't kept for later.
 */

/**
 * @typedef {Readonly<{ position: number, delta: number }>} AxisValue
 */

/** @type {AxisValue} */
const ZERO = { delta: 0, position: 0 }

/**
 * The axis, while it applies
 * @param {() => AxisValue} value - The axis
 * @param {() => boolean} when - Whether it applies now
 * @returns {() => AxisValue} It, or zero
 */
function axisWhen(value, when) {
  return () => {
    const now = value()
    return when() ? now : ZERO
  }
}

export { axisWhen }
