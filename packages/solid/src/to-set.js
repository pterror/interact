/**
 * A Solid setter as a Set. The value is always stored as it is: a function is a value, not an update of the old one.
 */

/** @import { Setter } from 'solid-js' */

/**
 * A signal's setter as a Set
 * @template T
 * @param {Setter<T>} setter - The setter
 * @returns {(value: T) => void} Setting the value
 */
function toSet(setter) {
  return (value) => {
    setter(() => value)
  }
}

export { toSet }
