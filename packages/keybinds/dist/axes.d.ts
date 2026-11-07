/**
 * Axes: continuous input read every frame, from mouse movement ("mouse:x"), sticks and triggers ("pad:rx", "pad:lt")
 * or a pair of keys ("keys:a/d"). A leading "-" inverts a source. Showing and recording them is keybinds/axes-ui.
 * Listened to for one keybinds(), the keys held and the mouse's movement are kept so each axis can be read when the
 * app asks; sticks and triggers are read then too.
 */
import type { AxisDef } from './command.js';
import type { AxisInput } from './input.js';
import type { KeySyntax, ParsedKey } from './keys.js';
export type DeviceAxis = Readonly<{
    invert: boolean;
    kind: 'mouse' | 'pad';
    source: string;
}>;
export type KeyAxis = Readonly<{
    invert: boolean;
    kind: 'keys';
    neg: ParsedKey;
    pos: ParsedKey;
}>;
export type ParsedAxis = DeviceAxis | KeyAxis;
export type Movement = Readonly<{
    horizontal: number;
    vertical: number;
}>;
export type AxisEntry = Readonly<{
    def: AxisDef;
    sources: readonly ParsedAxis[];
}>;
/**
 * Parses an axis binding: "mouse:x", "pad:rx", "keys:a/d", with a leading "-" to invert
 * @param {string} binding - The binding
 * @param {readonly KeySyntax[]} [syntax] - For key pairs, as for keys()
 * @returns {ParsedAxis} The source
 * @throws {Error} If the binding names no source
 */
declare function parseAxis(binding: string, syntax?: readonly KeySyntax[]): ParsedAxis;
/**
 * An axis source's normalized form, without its inversion
 * @param {ParsedAxis} parsed - The source
 * @returns {string} Its lookup
 */
declare function axisToLookup(parsed: ParsedAxis): string;
/**
 * Axes, read with `axis(id)` on what keybinds() returns
 * @param {readonly KeySyntax[]} syntax - For key pairs, as for keys()
 * @returns {AxisInput} Axes, as an input
 */
declare function axes(...syntax: readonly KeySyntax[]): AxisInput;
export { axes, axisToLookup, parseAxis };
