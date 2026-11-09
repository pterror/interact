/**
 * Each input as the settings panel rebinds it: the field its bindings are in, its name, what recording asks for,
 * its recorder, a binding's normal form (for conflicts) and how a binding looks. A gamepad's can be recorded only
 * while one is connected.
 */

import { axisParse } from './axis-parse.js'
import { bindingLookup } from './binding-lookup.js'
import { formatAxis } from './format-axis.js'
import { formatKey } from './format-key.js'
import { formatMouse } from './format-mouse.js'
import { formatPad } from './format-pad.js'
import { formatSteps } from './format-steps.js'
import { keyParse } from './key-parse.js'
import { mouseParse } from './mouse-parse.js'
import { padParse } from './pad-parse.js'
import { recordAxis } from './record-axis.js'
import { recordKey } from './record-key.js'
import { recordMouse } from './record-mouse.js'
import { recordPad } from './record-pad.js'

/**
 * @typedef {Readonly<{ ctrl: boolean, alt: boolean, shift: boolean, meta: boolean }>} Modifiers
 */

/**
 * @typedef {Readonly<{
 *   alias?: (name: string) => string | undefined,
 *   accepts?: (key: string, mods: Modifiers) => boolean,
 *   shifted?: (key: string) => string | undefined,
 *   lookups?: (key: string, mods: Modifiers, held: Modifiers) => readonly string[],
 *   fallback?: (key: string, held: Modifiers) => readonly string[],
 * }>} KeySyntax
 */

/**
 * @template T
 * @typedef {Readonly<{ get: () => T, watch: (listener: () => void) => () => void }>} Watched
 */

/**
 * @typedef {Readonly<{ index: number, axes: readonly number[],
 *   buttons: readonly Readonly<{ pressed: boolean, value: number }>[] }>} Pad
 */

/**
 * What a recorder is started with: what gets the binding, whether to record a release, and which events to leave alone
 * @typedef {Readonly<{ done: (binding: string) => void, release: boolean, ignore: (event: Event) => boolean }>}
 *   RecordOptions
 */

/**
 * One input as the settings panel rebinds it: the field it reads; its name; what recording asks for (a release, if
 * asked); recording a binding; a binding's normal form (it throws for one that is invalid); a binding's display
 * parts; whether it can be recorded now (default: it can); and hearing that, or how bindings look, change
 * @typedef {Readonly<{
 *   field: 'axes' | 'keys' | 'mouse' | 'pad',
 *   label: string,
 *   prompt: (release: boolean) => string,
 *   record: (options: RecordOptions) => () => void,
 *   lookup: (binding: string) => string,
 *   parts: (binding: string) => readonly string[],
 *   available?: () => boolean,
 *   watch?: (listener: () => void) => () => void,
 * }>} Input
 */

/**
 * @typedef {Readonly<{ syntax?: readonly KeySyntax[], layout?: Watched<ReadonlyMap<string, string> | undefined> }>}
 *   KeysOptions
 */

/** @type {(listener: () => void) => () => void} */
const NEVER = () => () => undefined

/**
 * Key bindings
 * @param {KeysOptions} [options] - The key syntax on; and the person's keyboard layout (layout())
 * @returns {Input} The input
 */
function rebindKeys({ layout, syntax = [] } = {}) {
  return {
    field: 'keys',
    label: 'Key',
    lookup: bindingLookup((step) => keyParse(step, syntax)),
    parts: (binding) => formatSteps(binding, (step) => formatKey(step, layout?.get())),
    prompt: (release) => (release ? 'Press and release a key...' : 'Press a key...'),
    record: ({ done, ignore, release }) => recordKey({ done, ignore, release, syntax }),
    watch: layout?.watch ?? NEVER,
  }
}

/**
 * Mouse bindings
 * @returns {Input} The input
 */
function rebindMouse() {
  return {
    field: 'mouse',
    label: 'Mouse',
    lookup: bindingLookup(mouseParse),
    parts: (binding) => formatSteps(binding, formatMouse),
    prompt: (release) => (release ? 'Press and release a button...' : 'Click or scroll...'),
    record: ({ done, ignore, release }) => recordMouse({ done, ignore, release }),
  }
}

/**
 * Gamepad bindings, recordable while a pad is connected
 * @param {Readonly<{ pads: Watched<readonly Pad[]> }>} options - The pads (pads())
 * @returns {Input} The input
 */
function rebindPad({ pads }) {
  return {
    available: () => pads.get().length > 0,
    field: 'pad',
    label: 'Gamepad',
    lookup: bindingLookup((step) => padParse(step)),
    parts: (binding) => formatSteps(binding, formatPad),
    prompt: (release) => (release ? 'Press and release a gamepad button...' : 'Press a gamepad button...'),
    record: ({ done, release }) => recordPad({ done, pads, release }),
    watch(listener) {
      let connected = pads.get().length > 0
      return pads.watch(() => {
        const now = pads.get().length > 0
        if (now !== connected) {
          connected = now
          listener()
        }
      })
    },
  }
}

/**
 * Axis bindings: the mouse, a stick or trigger, or two keys
 * @param {KeysOptions & Readonly<{ pads?: Watched<readonly Pad[]> }>} [options] - As for rebindKeys(); and the pads,
 *   to record a stick or trigger
 * @returns {Input} The input
 */
function rebindAxes({ layout, pads, syntax = [] } = {}) {
  return {
    field: 'axes',
    label: 'Axis',
    lookup: (binding) => axisParse(binding, syntax).lookup,
    parts: (binding) => formatAxis(binding, layout?.get()),
    prompt: () => 'Move the mouse, tilt a stick, or press two keys...',
    record: ({ done }) => recordAxis({ done, syntax, ...(pads === undefined ? {} : { pads }) }),
    watch: layout?.watch ?? NEVER,
  }
}

export { rebindAxes, rebindKeys, rebindMouse, rebindPad }
