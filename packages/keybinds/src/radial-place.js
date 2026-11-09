/**
 * Where a radial menu's slots go, as a Place: up to eight, evenly around a circle, rank 0 at the top and on clockwise,
 * so each direction keeps its slot. Each slot is a square centred on its point of the circle, in the coordinates of
 * the square box that just holds every slot (`extent` wide), with the circle at its centre.
 */

/**
 * @typedef {Readonly<{ radius?: number, size?: number }>} RadialPlaceOptions
 */

const SLOTS = 8
/** **(P)** */
const RADIUS = 100
/** **(P)** */
const SIZE = 64

/**
 * The slots' places
 * @param {RadialPlaceOptions} [options] - The circle's radius, to each slot's centre, in px (default 100); and each
 *   slot's width and height, in px (default 64)
 * @returns {Readonly<{ place: (rank: number) => Readonly<{ x: number, y: number, width: number, height: number }>,
 *   watch: (listener: () => void) => () => void, extent: number }>} The Place (it never changes), and the width and
 *   height of the box that holds the slots
 */
function radialPlace({ radius = RADIUS, size = SIZE } = {}) {
  const middle = radius + size / 2
  return {
    extent: middle * 2,
    place(rank) {
      const angle = (Math.PI * 2 * rank) / SLOTS - Math.PI / 2
      return {
        height: size,
        width: size,
        x: middle + radius * Math.cos(angle) - size / 2,
        y: middle + radius * Math.sin(angle) - size / 2,
      }
    },
    watch: () => () => undefined,
  }
}

export { radialPlace }
