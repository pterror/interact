/**
 * Recording a gamepad binding from the next button pressed, or with `release` pressed and let go ("a:up"). Buttons
 * already down when recording starts don't count until let go. It reads the pads given, the loop that reads them
 * for listening too.
 */

import { padButtonNames } from './pad-parse.js'

/**
 * @typedef {Readonly<{ index: number, buttons: readonly Readonly<{ pressed: boolean }>[] }>} Pad
 */

/**
 * @typedef {Readonly<{
 *   pads: Readonly<{ get: () => readonly Pad[], watch: (listener: () => void) => () => void }>,
 *   done: (binding: string) => void,
 *   release?: boolean,
 * }>} RecordPadOptions
 */

/**
 * Records a gamepad binding from the next button pressed
 * @param {RecordPadOptions} options - The pads; what gets the binding; and whether to record a release
 * @returns {() => void} Stopping
 */
function recordPad({ done, pads, release = false }) {
  /** @type {Map<number, readonly boolean[]>} */
  const before = new Map()
  /** @type {string | undefined} */
  let held = undefined
  let stopped = false

  /**
   * What a pad's buttons record since it was last read
   * @param {Pad} pad - The pad
   * @returns {string | undefined} The binding, once there is one
   */
  const recorded = (pad) => {
    const now = padButtonNames.map((_name, index) => pad.buttons[index]?.pressed === true)
    const was = before.get(pad.index)
    before.set(pad.index, now)
    for (const [index, down] of was === undefined ? [] : now.entries()) {
      const name = padButtonNames[index] ?? ''
      const id = `${pad.index}:${index}`
      if (down && was?.[index] !== true && !release) {
        return name
      }
      if (down && was?.[index] !== true) {
        held = id
      } else if (!down && was?.[index] === true && held === id) {
        return `${name}:up`
      }
    }
    return undefined
  }

  const stop = pads.watch(() => {
    for (const pad of pads.get()) {
      const binding = stopped ? undefined : recorded(pad)
      if (binding !== undefined) {
        stopped = true
        done(binding)
      }
    }
  })
  return () => {
    stopped = true
    stop()
  }
}

export { recordPad }
