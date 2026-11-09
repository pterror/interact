/**
 * Gamepad bindings as strings: one button of the browser's "standard" layout, by its name ("a", "rt", "start") or an
 * alias ("south", "r2", "dpadUp"). Face buttons are named by position: an Xbox pad's A and a PlayStation pad's cross
 * are both "a". Buttons take no modifiers.
 */
export type Modifiers = Readonly<{
    ctrl: boolean;
    alt: boolean;
    shift: boolean;
    meta: boolean;
}>;
export type ParsedPad = Readonly<{
    lookup: string;
    bare: string;
    mods: Modifiers;
}>;
/**
 * @typedef {Readonly<{ ctrl: boolean, alt: boolean, shift: boolean, meta: boolean }>} Modifiers
 */
/**
 * @typedef {Readonly<{ lookup: string, bare: string, mods: Modifiers }>} ParsedPad
 */
/**
 * The standard layout's buttons, by index
 * @type {readonly string[]}
 */
declare const padButtonNames: readonly string[];
/**
 * Other names for buttons: by direction, PlayStation's, and the controls' own
 * @type {ReadonlyMap<string, string>}
 */
declare const padAliases: ReadonlyMap<string, string>;
/**
 * Parses one gamepad binding, without a suffix or other steps
 * @param {string} binding - The binding: "south"
 * @returns {ParsedPad} Its button's standard name, as its lookup
 * @throws {Error} If no button has that name
 */
declare function padParse(binding: string): ParsedPad;
export { padAliases, padButtonNames, padParse };
