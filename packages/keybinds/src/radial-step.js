/**
 * Moving through a radial menu's slots, which are filled from the top on clockwise: round the filled slots, as a Step
 * (Tab and Shift+Tab), and toward a direction (an arrow), to the filled slot nearest it.
 */

const SLOTS = 8

/**
 * Steps over the slots
 * @template K
 * @param {() => readonly K[]} keys - The slots' keys now, from the top on clockwise
 * @returns {Readonly<{ step: (from: K | undefined, by: number) => Promise<K | undefined>,
 *   toward: (slot: number) => K | undefined }>} The Step: `step(none, 1)` is the first slot, `step(none, -1)` the
 *   last, `step(k, n)` the slot `n` on round from `k`; and the filled slot nearest a slot (0 is the top, 2 the right,
 *   4 the bottom, 6 the left), clockwise first at each distance
 */
function radialStep(keys) {
  return {
    step(from, by) {
      const all = keys()
      const at = from === undefined ? -1 : all.indexOf(from)
      const start = at === -1 ? (by < 0 ? 0 : -1) : at
      return Promise.resolve(
        all.length === 0 ? undefined : all[(((start + by) % all.length) + all.length) % all.length],
      )
    },
    toward(slot) {
      const all = keys()
      for (let distance = 0; distance < SLOTS; distance += 1) {
        const found = all[(slot + distance) % SLOTS] ?? all[(slot - distance + SLOTS) % SLOTS]
        if (found !== undefined) {
          return found
        }
      }
      return undefined
    },
  }
}

export { radialStep }
