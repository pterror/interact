/**
 * A pair of keys as an axis: the first held pushes toward -1, the second toward 1, both or neither rest at 0. It reads
 * the keys keyListen() holds, by their lookups without modifiers, so it follows the layout as bindings do.
 */

/**
 * @typedef {Readonly<{ position: number, delta: number }>} AxisValue
 */

/**
 * The axis
 * @param {Readonly<{ has: (lookup: string) => boolean }>} held - The keys held, by lookup without modifiers
 * @param {string} negative - The key toward -1: "a"
 * @param {string} positive - The key toward 1: "d"
 * @returns {() => AxisValue} Its position now; a key pair has no delta
 */
function keyPairAxis(held, negative, positive) {
  return () => ({ delta: 0, position: (held.has(positive) ? 1 : 0) - (held.has(negative) ? 1 : 0) })
}

export { keyPairAxis }
