/**
 * Fake gamepads for the tests, in place of the browser's, and animation frames run by hand.
 */

/** @import { Pad } from './pads.js' */

const BUTTONS = 17
const PULLED = 1
const LET_GO = 0

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
      value: down.includes(button) ? PULLED : LET_GO,
    })),
    index,
  }
}

/**
 * @typedef {object} FakePadsFields
 * @property {() => void} frame - Runs the animation frames asked for since the last
 * @property {() => void} restore - Puts the browser's gamepads and animation frames back
 * @property {(...down: readonly (readonly number[])[]) => void} set - Connects one pad per list, with those buttons
 *   down
 * @property {(pads: readonly Pad[]) => void} setPads - Connects these pads, sticks and triggers as given
 */

/**
 * The fake pads, controlled by hand
 * @typedef {Readonly<FakePadsFields>} FakePads
 */

/**
 * Replaces the browser's gamepads and animation frames with ones the test controls
 * @returns {FakePads} How to control them, and put the real ones back
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
    frame: () => {
      const run = frames
      frames = []
      for (const onFrame of run) {
        onFrame(performance.now())
      }
    },
    restore: () => {
      if (own === undefined) {
        Reflect.deleteProperty(navigator, 'getGamepads')
      } else {
        Object.defineProperty(navigator, 'getGamepads', own)
      }
      globalThis.requestAnimationFrame = raf
      globalThis.cancelAnimationFrame = cancel
    },
    set: (...down) => {
      pads = down.map((buttons, index) => padWith(buttons, index))
    },
    setPads: (next) => {
      pads = next
    },
  }
}

export { fakePads }
