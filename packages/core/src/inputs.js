/** @import { EffectType } from './state.js' */

import { defineEffect } from './state.js'

/**
 * A key pressed: its name as `KeyboardEvent.key` gives it, and whether Shift, the toggle modifier (Control, or Command
 * on a Mac) and Alt were held.
 * @typedef {Readonly<{ key: string, shift: boolean, toggle: boolean, alt: boolean }>} KeyInput
 */

/**
 * A key pressed, as an input.
 * @type {EffectType<KeyInput>}
 */
const keyInput = defineEffect()

export { keyInput }
