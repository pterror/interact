/**
 * Commands as data: what each is called, what triggers it, when it applies, and what it does. Axes are the
 * continuous kind, read every frame instead of run per event. A schema is the same data without handlers.
 */

/**
 * What `when` conditions and commands see: the app's state, as its context function gives it
 * @typedef {Readonly<Record<string, unknown>>} Context
 */

/**
 * The command fields that hold bindings, one per kind of trigger input
 * @typedef {'gamepad' | 'keys' | 'mouse'} BindingField
 */

/**
 * @typedef {object} CommandFields
 * @property {string} id - Unique identifier
 * @property {string} label - Display name
 * @property {string | undefined} [description] - Extended description
 * @property {string | undefined} [category] - Its group in the cheatsheet
 * @property {readonly string[] | undefined} [keys] - Keyboard triggers
 * @property {readonly string[] | undefined} [mouse] - Mouse triggers
 * @property {readonly string[] | undefined} [gamepad] - Gamepad button triggers ("a", "rt", "start:up")
 * @property {((ctx: Context) => boolean) | undefined} [when] - Whether it applies now
 * @property {(ctx: Context, event?: Event) => unknown} execute - What it does; returning false passes the event on
 * @property {boolean | undefined} [hidden] - Left out of the cheatsheet and the radial menu
 * @property {boolean | undefined} [captureInput] - Fires even while text is typed into a field
 * @property {boolean | undefined} [anyModifiers] - Bindings match whatever other modifiers are held (their own
 *   are still required), as a game's movement keys should; a binding that matches exactly still comes first
 */

/**
 * A command: an action, its triggers, and when it applies
 * @typedef {Readonly<CommandFields>} Command
 */

/**
 * A command and whether it applies now
 * @typedef {Readonly<{ active: boolean, command: Command }>} ActiveCommand
 */

/**
 * @typedef {object} AxisFields
 * @property {string} id - Unique identifier
 * @property {string} label - Display name
 * @property {string | undefined} [category] - Group in the settings panel
 * @property {string | undefined} [description] - Extended description
 * @property {readonly string[]} axes - Its sources: "mouse:x" / "mouse:y" (movement), "pad:lx" / "pad:ly" /
 *   "pad:rx" / "pad:ry" (sticks), "pad:lt" / "pad:rt" (triggers), "keys:a/d" (the first key toward -1, the second
 *   toward 1). A leading "-" inverts one
 * @property {((ctx: Context) => boolean) | undefined} [when] - Reads as zero otherwise
 * @property {boolean | undefined} [hidden] - Left out of the settings panel
 */

/**
 * A continuous input read every frame (looking around, steering), instead of a command run per event
 * @typedef {Readonly<AxisFields>} AxisDef
 */

/**
 * An axis's value. `position` is where sticks, triggers and keys are, -1 to 1; `delta` is mouse movement in pixels
 * since the axis was last read. A position is scaled by a speed and the frame's time, a delta by a sensitivity, so
 * they stay apart.
 * @typedef {Readonly<{ delta: number, position: number }>} AxisValue
 */

/**
 * @typedef {object} BindingSchemaFields
 * @property {string} label - Display name
 * @property {string | undefined} [description] - Extended description
 * @property {string | undefined} [category] - Its group in the settings panel
 * @property {readonly string[] | undefined} [keys] - Default keyboard triggers
 * @property {readonly string[] | undefined} [mouse] - Default mouse triggers
 * @property {readonly string[] | undefined} [gamepad] - Default gamepad button triggers
 * @property {readonly string[] | undefined} [axes] - Default sources, for an axis
 * @property {boolean | undefined} [hidden] - Left out of the settings panel
 */

/**
 * A command's or axis's bindings without its handler: what a person can rebind
 * @typedef {Readonly<BindingSchemaFields>} BindingSchema
 */

/**
 * Every rebindable command and axis, by id
 * @typedef {Readonly<Record<string, BindingSchema>>} Schema
 */

/**
 * A person's rebindings, by id: only the fields they changed
 * @typedef {Readonly<Record<string, Readonly<{ axes?: readonly string[], gamepad?: readonly string[],
 *   keys?: readonly string[], mouse?: readonly string[] }>>>} BindingOverrides
 */

/**
 * Whether a command or axis applies in a context
 * @param {Readonly<{ when?: ((ctx: Context) => boolean) | undefined }>} command - Anything with a `when`
 * @param {Context} context - The app's state
 * @returns {boolean} Whether it has no `when`, or its `when` holds
 */
function isActive(command, context) {
  return command.when === undefined || command.when(context)
}

/**
 * A command's bindings through one kind of input
 * @param {Command} command - The command
 * @param {BindingField} field - Which bindings
 * @returns {readonly string[]} Its bindings there, none if it has no such field
 */
function bindingsOf(command, field) {
  return command[field] ?? []
}

export { bindingsOf, isActive }
