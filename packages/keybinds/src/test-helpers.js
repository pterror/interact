/**
 * What the tests share: a keybinds() that listens to every input with every piece of syntax, and events.
 */

/**
 * @import { Command, Context } from './command.js'
 * @import { Keybinds, KeybindsOptions } from './core.js'
 */

import { anyModifiers } from './any-modifiers.js'
import { axes } from './axes.js'
import { keybinds as listen } from './core.js'
import { gamepad } from './gamepad.js'
import { aliases } from './keys-aliases.js'
import { symbols } from './keys-symbols.js'
import { keys } from './keys.js'
import { mouse as mouseInput } from './mouse.js'
import { releases } from './releases.js'

/**
 * Options for the test keybinds(): keybinds()' own, and how scrolling steps
 * @typedef {KeybindsOptions & Readonly<{ wheel?: Readonly<{ idle?: number, step?: number }> }>} TestOptions
 */

/**
 * The keybinds() function listening to every input, with every feature
 * @param {readonly Command[]} commands - The commands
 * @param {() => Context} [context] - The app's state now
 * @param {TestOptions} [options] - Options to add, and how scrolling steps
 * @returns {Keybinds} What keybinds() returns
 */
function keybinds(commands, context, options = {}) {
  const { wheel, ...rest } = options
  return listen(commands, context, {
    anyModifiers: anyModifiers(),
    inputs: [
      keys(symbols(), aliases()),
      mouseInput(wheel === undefined ? {} : { wheel }),
      gamepad(),
      axes(symbols(), aliases()),
    ],
    releases: releases(),
    ...rest,
  })
}

/**
 * A mouse event that can be cancelled
 * @param {string} type - "mousedown", "mouseup", ...
 * @param {number} button - Which button
 * @param {MouseEventInit} [init] - More of the event
 * @returns {MouseEvent} The event
 */
function mouse(type, button, init = {}) {
  return new MouseEvent(type, { button, cancelable: true, ...init })
}

/**
 * A key event that bubbles and can be cancelled
 * @param {string} type - "keydown" or "keyup"
 * @param {KeyboardEventInit} init - Its key and code, and anything more
 * @returns {KeyboardEvent} The event
 */
function kbd(type, init) {
  return new KeyboardEvent(type, { bubbles: true, cancelable: true, ...init })
}

/**
 * A command action that notes the type of each event it runs on
 * @returns {Readonly<{ execute: Command['execute'], types: readonly string[] }>} The action, and what it noted
 */
function recording() {
  /** @type {string[]} */
  const types = []
  return {
    execute: (_context, event) => {
      types.push(event?.type ?? 'no event')
    },
    types,
  }
}

/**
 * Whether keybinds() takes some commands with some options: true, or it throws what it found
 * @param {readonly Command[]} commands - The commands
 * @param {KeybindsOptions} options - As for keybinds()
 * @returns {true} When it takes them
 */
function accepts(commands, options) {
  const stop = listen(commands, undefined, options)
  stop()
  return true
}

export { accepts, kbd, keybinds, mouse, recording }
