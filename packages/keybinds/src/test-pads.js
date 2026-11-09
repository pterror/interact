/**
 * Fake gamepads for the tests, in place of the browser's, and animation frames run by hand.
 */

/**
 * @typedef {Readonly<{ index: number, axes: readonly number[],
 *   buttons: readonly Readonly<{ pressed: boolean, value: number }>[] }>} Pad
 */

const BUTTONS = 17

/**
 * A pad with some buttons down, its sticks at rest
 * @param {readonly number[]} down - The buttons down, by index
 * @param {number} index - The pad's index
 * @returns {Pad} The pad
 */
function padWith(down, index) {
  return {
    axes: [],
    buttons: Array.from({ length: BUTTONS }, (_unused, button) => ({
      pressed: down.includes(button),
      value: down.includes(button) ? 1 : 0,
    })),
    index,
  }
}

/**
 * Replaces the browser's gamepads and animation frames with ones the test controls
 * @returns {Readonly<{ frame: () => void, frames: () => number, restore: () => void,
 *   set: (...down: readonly (readonly number[])[]) => void, setPads: (pads: readonly Pad[]) => void }>} Running the
 *   frames asked for since the last; how many are waiting; putting the browser's back; connecting one pad per list,
 *   with those buttons down; and connecting these pads
 */
function fakePads() {
  /** @type {readonly Pad[]} */
  let pads = []
  /** @type {FrameRequestCallback[]} */
  let frames = []
  const own = Object.getOwnPropertyDescriptor(navigator, 'getGamepads')
  const raf = globalThis.requestAnimationFrame
  const cancel = globalThis.cancelAnimationFrame
  Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => pads, writable: true })
  /**
   * Asks for a frame, which the test runs by hand
   * @param {FrameRequestCallback} onFrame - What runs then
   * @returns {number} The frame's id
   */
  function requestFrame(onFrame) {
    frames.push(onFrame)
    return frames.length
  }
  globalThis.requestAnimationFrame = requestFrame
  globalThis.cancelAnimationFrame = () => {
    frames = []
  }
  return {
    frame() {
      const run = frames
      frames = []
      for (const onFrame of run) {
        onFrame(performance.now())
      }
    },
    frames: () => frames.length,
    restore() {
      if (own === undefined) {
        Reflect.deleteProperty(navigator, 'getGamepads')
      } else {
        Object.defineProperty(navigator, 'getGamepads', own)
      }
      globalThis.requestAnimationFrame = raf
      globalThis.cancelAnimationFrame = cancel
    },
    set(...down) {
      pads = down.map((buttons, index) => padWith(buttons, index))
    },
    setPads(next) {
      pads = next
    },
  }
}

export { fakePads }
