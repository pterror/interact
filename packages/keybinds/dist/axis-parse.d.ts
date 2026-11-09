/**
 * Axis bindings as strings: mouse movement ("mouse:x", "mouse:y"), a stick or trigger ("pad:rx", "pad:lt"), or a pair
 * of keys, the first toward -1 and the second toward 1 ("keys:a/d"). A leading "-" inverts one.
 */
export type Modifiers = Readonly<{
    ctrl: boolean;
    alt: boolean;
    shift: boolean;
    meta: boolean;
}>;
export type KeySyntax = Readonly<{
    alias?: (name: string) => string | undefined;
    accepts?: (key: string, mods: Modifiers) => boolean;
    shifted?: (key: string) => string | undefined;
}>;
export type ParsedAxis = Readonly<{
    invert: boolean;
    lookup: string;
} & ({
    kind: 'mouse' | 'pad';
    axis: string;
} | {
    kind: 'keys';
    negative: string;
    positive: string;
})>;
/**
 * Parses an axis binding
 * @param {string} binding - The binding: "-pad:ry"
 * @param {readonly KeySyntax[]} [syntax] - The key syntax on, for a pair of keys
 * @returns {ParsedAxis} It normalized
 * @throws {Error} If it names no axis, or a key pair isn't two keys
 */
declare function axisParse(binding: string, syntax?: readonly KeySyntax[]): ParsedAxis;
export { axisParse };
