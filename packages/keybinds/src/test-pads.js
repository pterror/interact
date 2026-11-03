/**
 * A fake gamepad for the tests, and animation frames run by hand.
 */

/** A fake pad, and animation frames run by hand */
const fakePads = () => {
  /** @type {any[]} */
  let pads = []
  /** @type {FrameRequestCallback[]} */
  let frames = []
  const nav = /** @type {any} */ (navigator)
  const saved = { cancel: globalThis.cancelAnimationFrame, get: nav.getGamepads, raf: globalThis.requestAnimationFrame }
  Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => pads, writable: true })
  globalThis.requestAnimationFrame = (cb) => {
    frames.push(cb)
    return frames.length
  }
  globalThis.cancelAnimationFrame = () => {
    frames = []
  }
  /** @param {number[]} down */
  const pad = (down, index = 0) => ({
    buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: down.includes(i) })),
    index,
  })
  return {
    frame: () => {
      const run = frames
      frames = []
      for (const f of run) f(0)
    },
    restore: () => {
      Object.defineProperty(navigator, 'getGamepads', { value: saved.get, configurable: true, writable: true })
      globalThis.requestAnimationFrame = saved.raf
      globalThis.cancelAnimationFrame = saved.cancel
    },
    /** @param {...number[]} down - pressed buttons, one list per pad */
    set: (...down) => {
      pads = down.map((d, i) => pad(d, i))
    },
  }
}

export { fakePads }
