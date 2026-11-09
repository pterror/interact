/**
 * The gamepads connected, as they read each frame. Gamepads have no events for their buttons or sticks, so one loop
 * reads them every animation frame, but only while a pad is connected and something watches.
 */

/**
 * A pad as read in one frame: the part of the browser's `Gamepad` read here
 * @typedef {Readonly<{ index: number, axes: readonly number[],
 *   buttons: readonly Readonly<{ pressed: boolean, value: number }>[] }>} Pad
 */

/**
 * The pads connected now
 * @returns {readonly Pad[]} Each, as the browser reads it now
 */
function read() {
  if (typeof navigator === 'undefined' || typeof navigator.getGamepads !== 'function') {
    return []
  }
  /** @type {Pad[]} */
  const connected = []
  for (const pad of navigator.getGamepads()) {
    if (pad !== null) {
      connected.push({
        axes: [...pad.axes],
        buttons: pad.buttons.map((button) => ({ pressed: button.pressed, value: button.value })),
        index: pad.index,
      })
    }
  }
  return connected
}

/**
 * The pads, read every frame while watched
 * @param {EventTarget} [view] - The window whose pads connect (default the global one)
 * @returns {Readonly<{ get: () => readonly Pad[], watch: (listener: () => void) => () => void }>} The pads now; and
 *   hearing each frame's reading
 */
function pads(view = globalThis) {
  /** @type {Set<() => void>} */
  const listeners = new Set()
  /** @type {readonly Pad[]} */
  let current = []
  /** @type {number | undefined} */
  let frame = undefined

  const poll = () => {
    frame = undefined
    current = read()
    if (current.length > 0) {
      frame = requestAnimationFrame(poll)
    }
    for (const listener of listeners) {
      listener()
    }
  }

  const start = () => {
    frame ??= requestAnimationFrame(poll)
  }

  return {
    get: () => (frame === undefined ? read() : current),
    watch(listener) {
      if (listeners.size === 0) {
        view.addEventListener('gamepadconnected', start)
      }
      listeners.add(listener)
      if (read().length > 0) {
        start()
      }
      return () => {
        listeners.delete(listener)
        if (listeners.size === 0) {
          view.removeEventListener('gamepadconnected', start)
          if (frame !== undefined) {
            cancelAnimationFrame(frame)
          }
          frame = undefined
        }
      }
    },
  }
}

export { pads }
