/**
 * Gamepad buttons as presses: each frame's reading of the pads against the last, a button going down a press known by
 * its pad and index ("0:7"), looked up by its standard name ("rt"), and its coming up ending it. Buttons already down
 * when a pad is first seen are where it starts, not presses; a pad that goes away lets go of what it held.
 */

import { padButtonNames } from './pad-parse.js'

/**
 * @typedef {Readonly<{ index: number, buttons: readonly Readonly<{ pressed: boolean }>[] }>} Pad
 */

/**
 * @typedef {Readonly<{ ctrl: boolean, alt: boolean, shift: boolean, meta: boolean }>} Modifiers
 */

/**
 * @typedef {Readonly<{ exact: readonly string[], bare: readonly string[], mods: Modifiers }>} Query
 */

/**
 * @typedef {Readonly<{ id: string, query: Query, event: Event, typing: boolean, repeat: boolean }>} Press
 */

/**
 * @typedef {Readonly<{ id: string, event: Event, typing: boolean, blocked: boolean }>} Release
 */

/**
 * @typedef {Readonly<{ down: (press: Press) => unknown, up: (release: Release) => void }>} Sink
 */

/**
 * @typedef {Readonly<{
 *   pads: Readonly<{ get: () => readonly Pad[], watch: (listener: () => void) => () => void }>,
 *   to: Sink,
 *   blocked?: () => boolean,
 * }>} PadButtonsOptions
 */

/** @type {Readonly<Modifiers>} */
const NONE = { alt: false, ctrl: false, meta: false, shift: false }

/**
 * Which of a pad's standard buttons are down
 * @param {Pad} pad - The pad
 * @returns {readonly boolean[]} Whether each is, by index
 */
function pressed(pad) {
  return padButtonNames.map((_name, index) => pad.buttons[index]?.pressed === true)
}

/**
 * Listens to gamepad buttons
 * @param {PadButtonsOptions} options - The pads; where presses go; and whether handlers are kept from running now
 *   (default never)
 * @returns {() => void} Stopping
 */
function padButtons({ blocked = () => false, pads, to }) {
  /** @type {Map<number, readonly boolean[]>} */
  const seen = new Map()

  /**
   * A button changed
   * @param {number} pad - The pad's index
   * @param {number} index - The button's index
   * @param {boolean} down - Whether it went down
   * @returns {void}
   */
  const changed = (pad, index, down) => {
    const name = padButtonNames[index] ?? ''
    const id = `${pad}:${index}`
    const event = new CustomEvent(down ? 'gamepadbuttondown' : 'gamepadbuttonup', {
      cancelable: true,
      detail: { button: name, gamepad: pad },
    })
    if (!down) {
      to.up({ blocked: blocked(), event, id, typing: false })
    } else if (!blocked()) {
      to.down({ event, id, query: { bare: [name], exact: [name], mods: NONE }, repeat: false, typing: false })
    }
  }

  /**
   * Reports each button that changed between two readings of a pad
   * @param {number} pad - The pad's index
   * @param {readonly boolean[]} before - Its buttons then
   * @param {readonly boolean[]} now - Its buttons now; one missing is up
   * @returns {void}
   */
  const compare = (pad, before, now) => {
    for (const [index, was] of before.entries()) {
      if ((now[index] === true) !== was) {
        changed(pad, index, !was)
      }
    }
  }

  const onFrame = () => {
    const connected = pads.get()
    for (const pad of connected) {
      const now = pressed(pad)
      compare(pad.index, seen.get(pad.index) ?? now, now)
      seen.set(pad.index, now)
    }
    for (const [index, buttons] of seen) {
      if (!connected.some((pad) => pad.index === index)) {
        seen.delete(index)
        compare(index, buttons, [])
      }
    }
  }

  const stop = pads.watch(onFrame)
  return () => {
    stop()
    seen.clear()
  }
}

export { padButtons }
