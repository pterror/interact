/**
 * One value, set and heard.
 */

/**
 * Holds a value. `has` is whether it is a given value; listeners hear the values it left and arrived at, those that
 * aren't undefined
 * @template T
 * @param {T} initial - Its value
 * @returns {Readonly<{
 *   get: () => T,
 *   set: (value: T) => void,
 *   has: (value: T) => boolean,
 *   watch: (listener: (values: readonly NonNullable<T>[]) => void) => () => void,
 * }>} The cell
 */
function cell(initial) {
  let value = initial
  /** @type {Set<(values: readonly NonNullable<T>[]) => void>} */
  const listeners = new Set()
  return {
    get: () => value,
    has: (other) => other === value,
    set(next) {
      if (next === value) {
        return
      }
      /** @type {NonNullable<T>[]} */
      const values = []
      for (const each of [value, next]) {
        if (each !== undefined && each !== null) {
          values.push(each)
        }
      }
      value = next
      for (const listener of listeners) {
        listener(values)
      }
    },
    watch(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

export { cell }
