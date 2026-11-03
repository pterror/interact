/**
 * Commands as data: what each is called, what triggers it, when it applies, and what it does. Axes are the
 * continuous kind, read every frame instead of run per event. A schema is the same data without handlers.
 */
export type Context = Readonly<Record<string, unknown>>;
export type BindingField = 'gamepad' | 'keys' | 'mouse';
export type CommandFields = {
    /**
     * - Unique identifier
     */
    id: string;
    /**
     * - Display name
     */
    label: string;
    /**
     * - Extended description for the palette
     */
    description?: string | undefined;
    /**
     * - Group for the palette
     */
    category?: string | undefined;
    /**
     * - Keyboard triggers
     */
    keys?: readonly string[] | undefined;
    /**
     * - Mouse triggers
     */
    mouse?: readonly string[] | undefined;
    /**
     * - Gamepad button triggers ("a", "rt", "start:up")
     */
    gamepad?: readonly string[] | undefined;
    /**
     * - Whether it applies now
     */
    when?: ((ctx: Context) => boolean) | undefined;
    /**
     * - What it does; returning false passes the event on
     */
    execute: (ctx: Context, event?: Event) => unknown;
    /**
     * - Left out of search
     */
    hidden?: boolean | undefined;
    /**
     * - Fires even while text is typed into a field
     */
    captureInput?: boolean | undefined;
    /**
     * - Bindings match whatever other modifiers are held (their own
     * are still required), as a game's movement keys should; a binding that matches exactly still comes first
     */
    anyModifiers?: boolean | undefined;
    /**
     * - Context menu tags
     */
    menu?: string | readonly string[] | undefined;
    /**
     * - Where it's listed among matches, before relevance: higher first (default 0)
     */
    rank?: number | undefined;
};
export type Command = Readonly<CommandFields>;
export type AxisFields = {
    /**
     * - Unique identifier
     */
    id: string;
    /**
     * - Display name
     */
    label: string;
    /**
     * - Group in the settings panel
     */
    category?: string | undefined;
    /**
     * - Extended description
     */
    description?: string | undefined;
    /**
     * - Its sources: "mouse:x" / "mouse:y" (movement), "pad:lx" / "pad:ly" /
     * "pad:rx" / "pad:ry" (sticks), "pad:lt" / "pad:rt" (triggers), "keys:a/d" (the first key toward -1, the second
     * toward 1). A leading "-" inverts one
     */
    axes: readonly string[];
    /**
     * - Reads as zero otherwise
     */
    when?: ((ctx: Context) => boolean) | undefined;
    /**
     * - Left out of the settings panel
     */
    hidden?: boolean | undefined;
};
export type AxisDef = Readonly<AxisFields>;
export type AxisValue = Readonly<{
    delta: number;
    position: number;
}>;
export type BindingSchemaFields = {
    /**
     * - Display name
     */
    label: string;
    /**
     * - Extended description for the palette
     */
    description?: string | undefined;
    /**
     * - Group for the palette
     */
    category?: string | undefined;
    /**
     * - Default keyboard triggers
     */
    keys?: readonly string[] | undefined;
    /**
     * - Default mouse triggers
     */
    mouse?: readonly string[] | undefined;
    /**
     * - Default gamepad button triggers
     */
    gamepad?: readonly string[] | undefined;
    /**
     * - Default sources, for an axis
     */
    axes?: readonly string[] | undefined;
    /**
     * - Left out of search and the settings panel
     */
    hidden?: boolean | undefined;
    /**
     * - Context menu tags
     */
    menu?: string | readonly string[] | undefined;
};
export type BindingSchema = Readonly<BindingSchemaFields>;
export type Schema = Readonly<Record<string, BindingSchema>>;
export type BindingOverrides = Readonly<Record<string, Readonly<{
    axes?: readonly string[];
    gamepad?: readonly string[];
    keys?: readonly string[];
    mouse?: readonly string[];
}>>>;
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
 * @property {string | undefined} [description] - Extended description for the palette
 * @property {string | undefined} [category] - Group for the palette
 * @property {readonly string[] | undefined} [keys] - Keyboard triggers
 * @property {readonly string[] | undefined} [mouse] - Mouse triggers
 * @property {readonly string[] | undefined} [gamepad] - Gamepad button triggers ("a", "rt", "start:up")
 * @property {((ctx: Context) => boolean) | undefined} [when] - Whether it applies now
 * @property {(ctx: Context, event?: Event) => unknown} execute - What it does; returning false passes the event on
 * @property {boolean | undefined} [hidden] - Left out of search
 * @property {boolean | undefined} [captureInput] - Fires even while text is typed into a field
 * @property {boolean | undefined} [anyModifiers] - Bindings match whatever other modifiers are held (their own
 *   are still required), as a game's movement keys should; a binding that matches exactly still comes first
 * @property {string | readonly string[] | undefined} [menu] - Context menu tags
 * @property {number | undefined} [rank] - Where it's listed among matches, before relevance: higher first (default 0)
 */
/**
 * A command: an action, its triggers, and when it applies
 * @typedef {Readonly<CommandFields>} Command
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
 * @property {string | undefined} [description] - Extended description for the palette
 * @property {string | undefined} [category] - Group for the palette
 * @property {readonly string[] | undefined} [keys] - Default keyboard triggers
 * @property {readonly string[] | undefined} [mouse] - Default mouse triggers
 * @property {readonly string[] | undefined} [gamepad] - Default gamepad button triggers
 * @property {readonly string[] | undefined} [axes] - Default sources, for an axis
 * @property {boolean | undefined} [hidden] - Left out of search and the settings panel
 * @property {string | readonly string[] | undefined} [menu] - Context menu tags
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
declare function isActive(command: Readonly<{
    when?: ((ctx: Context) => boolean) | undefined;
}>, context: Context): boolean;
/**
 * A command's bindings through one kind of input
 * @param {Command} command - The command
 * @param {BindingField} field - Which bindings
 * @returns {readonly string[]} Its bindings there, none if it has no such field
 */
declare function bindingsOf(command: Command, field: BindingField): readonly string[];
/**
 * Runs a command by id if it applies
 * @param {readonly Command[]} commands - Where to find it
 * @param {string} id - Which
 * @param {Context} [context] - The app's state (default: empty)
 * @returns {boolean} Whether it ran
 */
declare function executeCommand(commands: readonly Command[], id: string, context?: Context): boolean;
export { bindingsOf, executeCommand, isActive };
