/**
 * Recording an axis binding from whichever comes first: the mouse moved far enough along one direction ("mouse:x"), a
 * stick or trigger pushed well past where it rested ("pad:rx"), or two different keys pressed, toward -1 and then
 * toward 1 ("keys:j/l").
 */

import { keyBinding } from './record-key.js'

/**
 * @typedef {Readonly<{ ctrl: boolean, alt: boolean, shift: boolean, meta: boolean }>} Modifiers
 */

/**
 * @typedef {Readonly<{
 *   alias?: (name: string) => string | undefined,
 *   accepts?: (key: string, mods: Modifiers) => boolean,
 *   shifted?: (key: string) => string | undefined,
 * }>} KeySyntax
 */

/**
 * @typedef {Readonly<{ index: number, axes: readonly number[], buttons: readonly Readonly<{ value: number }>[] }>} Pad
 */

/**
 * @typedef {Readonly<{
 *   done: (binding: string) => void,
 *   target?: EventTarget,
 *   pads?: Readonly<{ get: () => readonly Pad[], watch: (listener: () => void) => () => void }>,
 *   syntax?: readonly KeySyntax[],
 * }>} RecordAxisOptions
 */

/** How far the mouse moves along one direction to be recorded, in px */
const MOUSE_DISTANCE = 80

/** How far a stick or trigger moves from where it rested to be recorded */
const PAD_DISTANCE = 0.6

/** Sticks, then triggers */
const PAD_AXES = ['lx', 'ly', 'rx', 'ry', 'lt', 'rt']

/**
 * A pad's sticks and triggers, in the order of PAD_AXES
 * @param {Pad} pad - The pad
 * @returns {readonly number[]} Where each is
 */
function positions(pad) {
  return [
    ...[0, 1, 2, 3].map((index) => pad.axes[index] ?? 0),
    ...[6, 7].map((index) => pad.buttons[index]?.value ?? 0),
  ]
}

/**
 * Records an axis binding from what is done next
 * @param {RecordAxisOptions} options - What gets the binding; where to listen (default the window); the pads, to
 *   record a stick or trigger; and the key syntax on
 * @returns {() => void} Stopping
 */
function recordAxis({ done, pads, syntax = [], target = globalThis }) {
  let horizontal = 0
  let vertical = 0
  /** @type {string | undefined} */
  let first = undefined
  /** @type {Map<number, readonly number[]>} */
  const rest = new Map()

  /**
   * @param {Event} event - A mousemove or keydown
   * @returns {void}
   */
  const onEvent = (event) => {
    if (event instanceof MouseEvent) {
      horizontal += Math.abs(event.movementX)
      vertical += Math.abs(event.movementY)
      if (Math.max(horizontal, vertical) > MOUSE_DISTANCE) {
        done(horizontal >= vertical ? 'mouse:x' : 'mouse:y')
      }
      return
    }
    const binding =
      event instanceof KeyboardEvent && event.key !== 'Escape' && !event.repeat ? keyBinding(event, syntax) : undefined
    if (binding === undefined) {
      return
    }
    event.preventDefault()
    event.stopPropagation()
    const key = binding.slice(binding.lastIndexOf('+') + 1)
    if (first === undefined) {
      first = key
    } else if (key !== first) {
      done(`keys:${first}/${key}`)
    }
  }

  const onPads = () => {
    for (const pad of pads?.get() ?? []) {
      const now = positions(pad)
      const was = rest.get(pad.index)
      rest.set(pad.index, was ?? now)
      const moved =
        was === undefined ? -1 : now.findIndex((value, at) => Math.abs(value - (was[at] ?? 0)) > PAD_DISTANCE)
      if (moved !== -1) {
        done(`pad:${PAD_AXES[moved] ?? ''}`)
        return
      }
    }
  }

  target.addEventListener('mousemove', onEvent, true)
  target.addEventListener('keydown', onEvent, true)
  const unwatch = pads?.watch(onPads)
  return () => {
    target.removeEventListener('mousemove', onEvent, true)
    target.removeEventListener('keydown', onEvent, true)
    unwatch?.()
  }
}

export { recordAxis }
