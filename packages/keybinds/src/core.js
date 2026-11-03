/**
 * The keybinds() function: commands as data, context as state. Every kind of input (keys, mouse, gamepad, axes) is its own
 * module, handed to keybinds() by whoever uses it; this knows only commands, context and presses.
 */

/**
 * @import { AnyModifiers } from './any-modifiers.js'
 * @import { AxisDef, AxisValue, Command, Context } from './command.js'
 * @import { Input, Press } from './input.js'
 * @import { Sequences } from './sequences.js'
 */

import { BindingIndex, checkInputs } from './binding-index.js'
import { InputListener, STILL } from './input-listener.js'
import { Runner } from './runner.js'

/**
 * @typedef {object} PhaseRunFields
 * @property {Press} press - The press
 * @property {Event} event - The event that started or ended it
 * @property {(suffix: string) => readonly Command[] | undefined} bound - Commands bound to this press with a suffix
 * @property {(candidates: readonly Command[]) => boolean} fire - Runs the first candidate that may run and takes the
 *   event, noting it on the press
 * @property {(command: Command) => boolean} allowed - Whether a command may run now: it applies, the input isn't
 *   blocked, and it isn't being typed into (unless the command captures input)
 * @property {(command: Command) => boolean} execute - Runs a command whatever `allowed` says; true if it took the event
 * @property {() => boolean} held - Whether the press is still going
 */

/**
 * What a phase (releases(), holds()) gets at a press's start or end
 * @typedef {Readonly<PhaseRunFields>} PhaseRun
 */

/**
 * Something that happens at a press's start or end beyond the press itself, owning the binding suffixes that say
 * so: releases() (":up"), holds() (":hold", ":tap"). `up` returns whether a command took the end
 * @typedef {Readonly<{ down?: (run: PhaseRun) => void, suffixes: readonly string[],
 *   up?: (run: PhaseRun) => boolean }>} Phase
 */

/**
 * @typedef {object} KeybindsFields
 * @property {readonly Input[]} [inputs] - What to listen to: [keys(), mouse()]. A command bound through an input that
 *   isn't here is an error
 * @property {Phase} [releases] - From releases(): bindings to an input coming up ("k:up")
 * @property {Phase} [holds] - From holds(): bindings to holding an input ("k:hold") and to a short press ("k:tap")
 * @property {Sequences} [sequences] - From sequences(): bindings of several steps ("g i")
 * @property {AnyModifiers} [anyModifiers] - From anyModifiers(): commands whose bindings match whatever other
 *   modifiers are held
 * @property {EventTarget} [target] - Where to listen (default: the window)
 * @property {(command: Command, ctx: Context) => void} [onExecute] - Called after a command takes an event
 * @property {boolean} [capture] - Listen in the capture phase, so a bound key reaches its command before anything
 *   under the target (an editor, say) handles it. A command that doesn't apply, or returns false, leaves the event be
 * @property {readonly AxisDef[]} [axes] - Continuous inputs, read with `axis(id)` on what keybinds() returns
 */

/**
 * What keybinds() is given besides the commands. Syntax whose module isn't here is an error naming it, never a
 * binding that silently doesn't fire
 * @typedef {Readonly<KeybindsFields>} KeybindsOptions
 */

/**
 * What keybinds() returns: a function that stops listening, with `held(id)` (whether a command is held right now:
 * its press fired and that key or button hasn't come up) and `axis(id)` (an axis's value; reading it takes the mouse
 * movement since its last read)
 * @typedef {(() => void) & Readonly<{ axis: (id: string) => AxisValue, held: (id: string) => boolean }>} Keybinds
 */

/**
 * Listens for commands' bindings through the inputs given
 * @param {readonly Command[]} commands - The commands
 * @param {() => Context} [getContext] - The app's state now, which `when` conditions and commands see
 * @param {KeybindsOptions} [options] - The inputs, syntax modules and axes
 * @returns {Keybinds} A function that stops listening, with `held(id)` and `axis(id)`
 * @throws {Error} If a binding is invalid, uses syntax that isn't on, or has no input to read it
 * @example
 * const stop = keybinds([
 *   { id: 'delete', label: 'Delete selected', keys: ['Backspace', 'Delete'],
 *     when: (ctx) => ctx.hasSelection === true, execute: () => deleteSelected() },
 * ], () => ({ hasSelection: selectedId() !== undefined }), { inputs: [keys(), mouse()] })
 */
function keybinds(commands, getContext = () => ({}), options = {}) {
  checkInputs(commands, options)
  const runner = new Runner(getContext, options)
  const listeners = (options.inputs ?? []).map((input) => new InputListener(runner, commands, input))
  /** @type {Readonly<{ axis: (id: string) => AxisValue, held: (id: string) => boolean }>} */
  const reads = {
    axis: (id) => listeners.find((listener) => listener.readsAxes)?.axis(id) ?? STILL,
    held: (id) => listeners.some((listener) => listener.held(id)),
  }
  return Object.assign(() => {
    for (const listener of listeners) {
      listener.stop()
    }
  }, reads)
}

/**
 * Checks every command up front, to catch typos early
 * @param {readonly Command[]} commands - The commands
 * @param {KeybindsOptions} options - As for keybinds(): the inputs, and the syntax modules used
 * @returns {true} When every command is fine
 * @throws {Error} If a command has no id, or a binding is invalid
 */
function validateCommands(commands, options) {
  for (const command of commands) {
    if (!command.id) {
      throw new Error('Command missing id')
    }
  }
  checkInputs(commands, options)
  for (const input of options.inputs ?? []) {
    BindingIndex.check(commands, input, options)
  }
  return true
}

export { keybinds, validateCommands }
