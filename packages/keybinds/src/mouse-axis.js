/**
 * Mouse movement along one direction as an axis: each read gives how far the mouse moved since the last read, in px.
 */

/**
 * @typedef {Readonly<{ position: number, delta: number }>} AxisValue
 */

/**
 * Listens to the mouse moving
 * @param {Readonly<{ target: EventTarget, axis: 'x' | 'y', capture?: boolean }>} options - Where to listen; which
 *   direction; and whether in the capture phase
 * @returns {Readonly<{ read: () => AxisValue, stop: () => void }>} Reading the movement since the last read (its
 *   delta; it has no position), and stopping
 */
function mouseAxis({ axis, capture = false, target }) {
  let moved = 0
  /**
   * @param {Event} event - A mousemove
   * @returns {void}
   */
  const onMove = (event) => {
    if (event instanceof MouseEvent) {
      moved += axis === 'x' ? event.movementX : event.movementY
    }
  }
  target.addEventListener('mousemove', onMove, { capture, passive: true })
  return {
    read() {
      const delta = moved
      moved = 0
      return { delta, position: 0 }
    },
    stop() {
      target.removeEventListener('mousemove', onMove, { capture })
    },
  }
}

export { mouseAxis }
