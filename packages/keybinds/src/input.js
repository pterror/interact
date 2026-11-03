/**
 * What a kind of input (keys, mouse, gamepad, axes) is to keybinds(): it parses its own bindings and listens for
 * them, reporting presses starting and ending. keybinds() runs what's bound. Each input's UI half (keysUI(), ...)
 * also shows and records bindings, which only the components need.
 */

/**
 * @import { ParsedBinding } from './binding.js'
 * @import { Modifiers } from './binding-mods.js'
 * @import { AxisDef, AxisValue, BindingField, Command, Context } from './command.js'
 */

/**
 * The lookups of an input event with a suffix (":up") and the modifiers to match against: exact ones, and ones
 * without modifiers, for `anyModifiers` commands
 * @typedef {(suffix: string, mods: Modifiers) => readonly [readonly string[], readonly string[]]} Lookups
 */

/**
 * A held input. `mods` is the modifier state at press time, which release bindings match against; `fired` holds the
 * commands that ran for it; `at` is when it started; `lookups` finds its bindings.
 * @typedef {Readonly<{ at: number, fired: ReadonlySet<Command>, lookups: Lookups, mods: Modifiers }>} Press
 */

/**
 * A press starting, as an input reports it. `repeat`: the same press goes on; `blocked`: note it, but run nothing;
 * `inInput`: it happened where text is typed
 * @typedef {Readonly<{ blocked?: boolean, inInput?: boolean, lookups: Lookups, mods: Modifiers, repeat?: boolean }>}
 *   PressStart
 */

/**
 * Where a press ended, as an input reports it
 * @typedef {Readonly<{ blocked?: boolean, inInput?: boolean }>} PressWhere
 */

/**
 * A press that ended, and whether a command took its end
 * @typedef {Readonly<{ consumed: boolean, press: Press }>} PressEnd
 */

/**
 * @typedef {object} DispatchFields
 * @property {EventTarget} target - Where to listen
 * @property {boolean} capture - Whether to listen in the capture phase
 * @property {boolean} bound - Whether any command has a binding for this input
 * @property {readonly AxisDef[]} axes - The axes passed to keybinds()
 * @property {() => Context} context - The app's state now
 * @property {ReadonlyMap<string, Press>} presses - This input's held presses, by whatever id it chooses
 * @property {(id: string, event: Event, start: PressStart) => Press} down - A press started, or repeated
 * @property {(id: string, event: Event, where?: PressWhere) => PressEnd | undefined} up - A press ended; undefined
 *   if it wasn't going
 * @property {(lookups: readonly string[], loose: readonly string[], mods: Modifiers) => readonly Command[] |
 *   undefined} candidates - Commands bound to the first of `lookups` that has any, then `anyModifiers` ones, for
 *   inputs with no presses (scrolling)
 * @property {(command: Command) => boolean} isActive - Whether a command applies now
 * @property {(command: Command, event: Event) => boolean} execute - Runs a command; true if it took the event
 */

/**
 * What keybinds() gives each input to work with
 * @typedef {Readonly<DispatchFields>} Dispatch
 */

/**
 * What an input's listen() returns: a function that stops it, which can also read axes
 * @typedef {(() => void) & Readonly<{ axis?: (id: string) => AxisValue }>} InputHandle
 */

/**
 * @typedef {object} InputFields
 * @property {(step: string, suffix: string) => ParsedBinding} parse - Parses one step of a binding without its suffix
 *   (":up", ":hold"), which is given to reject where it can't apply. Throws if the binding is invalid
 * @property {(command: Command, event: Event) => boolean} [matches] - Whether an event is one of a command's press
 *   bindings
 * @property {(dispatch: Dispatch) => InputHandle} listen - Starts listening
 */

/**
 * An input whose bindings trigger commands: keys, mouse, gamepad buttons
 * @typedef {Readonly<InputFields & { axis?: false, field: BindingField }>} CommandInput
 */

/**
 * An input whose bindings are an axis's sources
 * @typedef {Readonly<InputFields & { axis: true, field: 'axes' }>} AxisInput
 */

/**
 * A kind of input, passed to keybinds() by whoever uses it
 * @typedef {AxisInput | CommandInput} Input
 */

/**
 * @typedef {object} InputUIFields
 * @property {string} label - What one binding is called ("Key", for "+ Key")
 * @property {(binding: string) => string[]} format - A binding's display parts
 * @property {(binding: string) => boolean} [release] - Whether a binding can be its release form (":up"); absent for
 *   inputs with no releases
 * @property {boolean} [invert] - Bindings can be inverted with a leading "-"
 * @property {() => boolean} [available] - Whether it can be recorded now (a pad is connected)
 * @property {(onChange: () => void) => () => void} [watch] - Follows `available`, or how bindings are shown, changing
 * @property {(options: Readonly<{ ignore: (event: Event) => boolean, release: boolean, target?: EventTarget }>,
 *   done: (binding: string) => void) => () => void} [record] - Records a binding from what's done next, listening on
 *   `target` (the window recording happens in; default the global one); returns a function that stops
 * @property {(release: boolean) => string} [prompt] - What to do to record one
 */

/**
 * An input that can also be shown and recorded, for the settings panel, cheatsheet, palette and menus
 * @typedef {Input & Readonly<InputUIFields>} InputUI
 */

/**
 * Whether an event's target is somewhere text is typed
 * @param {EventTarget | null} target - Where the event happened
 * @returns {boolean} Whether it's a text field or editable
 */
function inInput(target) {
  if (typeof Element === 'undefined' || !(target instanceof Element)) {
    return false
  }
  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    (target instanceof HTMLElement && target.isContentEditable)
  )
}

/**
 * The window a target is in, which has the focus and the events no element gets (blur, gamepadconnected); a target
 * outside any document is its own
 * @param {EventTarget} target - Where bindings listen
 * @returns {EventTarget} Its window
 */
function windowOf(target) {
  return target instanceof Node ? (target.ownerDocument?.defaultView ?? target) : target
}

/**
 * Whether an input can also be shown and recorded: it has its UI half's label and format
 * @param {Input} input - The input
 * @returns {input is InputUI} Whether it has
 */
function isInputUI(input) {
  return 'format' in input && typeof input.format === 'function' && 'label' in input && typeof input.label === 'string'
}

export { inInput, isInputUI, windowOf }
