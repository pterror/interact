/**
 * Modifier keys, as bindings write them and as events report them: Ctrl, Alt, Shift and Meta, and `$mod` for the
 * platform's own (Meta on a Mac, Ctrl elsewhere).
 */
export type Modifiers = Readonly<{
    ctrl: boolean;
    alt: boolean;
    shift: boolean;
    meta: boolean;
}>;
export type Modifier = keyof Modifiers;
export type ModifierState = Readonly<{
    ctrlKey: boolean;
    altKey: boolean;
    shiftKey: boolean;
    metaKey: boolean;
}>;
/**
 * Which modifiers are held, or which a binding needs
 * @typedef {Readonly<{ ctrl: boolean, alt: boolean, shift: boolean, meta: boolean }>} Modifiers
 */
/** @typedef {keyof Modifiers} Modifier */
/**
 * What an event reports of the modifiers held
 * @typedef {Readonly<{ ctrlKey: boolean, altKey: boolean, shiftKey: boolean, metaKey: boolean }>} ModifierState
 */
/** Whether this is a Mac, where `$mod` is Meta (⌘) rather than Ctrl */
declare const isMac: boolean;
/** @type {Modifiers} */
declare const noModifiers: Modifiers;
/**
 * The modifiers among a binding's parts, and the parts that aren't modifiers
 * @param {readonly string[]} parts - A binding split at "+", lowercase
 * @returns {Readonly<{ mods: Modifiers, rest: readonly string[] }>} The modifiers it needs, and the rest in order
 */
declare function parseModifiers(parts: readonly string[]): Readonly<{
    mods: Modifiers;
    rest: readonly string[];
}>;
/**
 * The modifiers held during an event
 * @param {ModifierState} event - A key or mouse event
 * @returns {Modifiers} What was held
 */
declare function eventModifiers(event: ModifierState): Modifiers;
/**
 * Modifiers as the start of a lookup ("ctrl+alt+"), in one order whatever order they were written in
 * @param {Modifiers} mods - The modifiers
 * @returns {string} Each held one followed by "+"
 */
declare function modifierPrefix(mods: Modifiers): string;
/**
 * The modifiers held during an event as a binding writes them, `$mod` for the platform's own, for recording one
 * @param {ModifierState} event - A key or mouse event
 * @param {boolean} [shift] - Whether to include Shift (default: whether it was held)
 * @returns {readonly string[]} The modifier parts, in binding order
 */
declare function eventModifierParts(event: ModifierState, shift?: boolean): readonly string[];
/**
 * How a modifier in a binding is shown on this platform
 * @param {string} part - One part of a binding, lowercase
 * @returns {string | undefined} Its symbol or name, or nothing if it isn't a modifier
 */
declare function formatModifier(part: string): string | undefined;
export { eventModifierParts, eventModifiers, formatModifier, isMac, modifierPrefix, noModifiers, parseModifiers };
