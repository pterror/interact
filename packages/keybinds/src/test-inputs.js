/**
 * The inputs the tests share: one of each, with every piece of syntax, shown and recorded too.
 */

/**
 * @import { AnyModifiers } from './any-modifiers.js'
 * @import { Phase } from './core.js'
 * @import { InputUI } from './input.js'
 */

import { anyModifiers } from './any-modifiers.js'
import { axesUI } from './axes-ui.js'
import { gamepadUI } from './gamepad-ui.js'
import { aliases } from './keys-aliases.js'
import { symbols } from './keys-symbols.js'
import { keysUI } from './keys-ui.js'
import { mouseUI } from './mouse-ui.js'
import { releases } from './releases.js'

/**
 * One of each input, shown and recorded too, for findConflict() and the settings panel
 * @type {Readonly<{ axes: InputUI, gamepad: InputUI, keys: InputUI, mouse: InputUI }>}
 */
const INPUT = {
  axes: axesUI(symbols(), aliases()),
  gamepad: gamepadUI(),
  keys: keysUI(symbols(), aliases()),
  mouse: mouseUI(),
}

/**
 * Every input and feature: options for keybinds()
 * @type {Readonly<{ anyModifiers: AnyModifiers, inputs: InputUI[], releases: Phase }>}
 */
const ALL = { anyModifiers: anyModifiers(), inputs: Object.values(INPUT), releases: releases() }

export { ALL, INPUT }
