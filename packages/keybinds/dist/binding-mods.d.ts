/**
 * Modifier keys, as bindings write them and as events report them: Ctrl, Alt, Shift and Meta, and `$mod` for the
 * platform's own (Meta on a Mac, Ctrl elsewhere).
 */
export type Modifiers = Readonly<{
    alt: boolean;
    ctrl: boolean;
    meta: boolean;
    shift: boolean;
}>;
export type Modifier = keyof Modifiers;
/**
 * Which modifiers are held, or which a binding needs
 * @typedef {Readonly<{ alt: boolean, ctrl: boolean, meta: boolean, shift: boolean }>} Modifiers
 */
/** @typedef {keyof Modifiers} Modifier */
/** Whether this is a Mac, where `$mod` is Meta (⌘) rather than Ctrl */
declare const isMac: boolean;
/** @type {Modifiers} */
declare const NO_MODS: Modifiers;
/**
 * The modifiers in a binding's parts, and the parts that aren't modifiers
 * @param {readonly string[]} parts - A binding split at "+", lowercase
 * @returns {Readonly<{ mods: Modifiers, remaining: string[] }>} The modifiers it needs, and the rest in order
 */
declare function parseMods(parts: readonly string[]): Readonly<{
    mods: Modifiers;
    remaining: string[];
}>;
/**
 * How a modifier in a binding is shown
 * @param {string} part - One part of a binding, lowercase
 * @returns {string | undefined} Its symbol or name, or undefined if it isn't a modifier
 */
declare function formatModPart(part: string): string | undefined;
/**
 * The modifiers held during an event, as a binding writes them: `$mod` for the platform's own
 * @param {KeyboardEvent | MouseEvent} event - A key or mouse event
 * @param {boolean} [shift] - Whether to include Shift (default: whether it was held)
 * @returns {string[]} The modifier parts, in binding order
 */
declare function eventModParts(event: KeyboardEvent | MouseEvent, shift?: boolean): string[];
/**
 * Modifiers as the canonical start of a lookup ("ctrl+alt+")
 * @param {Modifiers} mods - The modifiers
 * @returns {string} Each held one followed by "+", in a fixed order
 */
declare function modsToPrefix(mods: Modifiers): string;
/**
 * The modifiers held during an event
 * @param {KeyboardEvent | MouseEvent} event - A key or mouse event
 * @returns {Modifiers} What was held
 */
declare function eventMods(event: KeyboardEvent | MouseEvent): Modifiers;
/**
 * Whether every modifier in `required` is among `held`
 * @param {Modifiers} required - What a binding needs
 * @param {Modifiers} held - What is held
 * @returns {boolean} Whether all of it is held
 */
declare function holdsAll(required: Modifiers, held: Modifiers): boolean;
export { NO_MODS, eventModParts, eventMods, formatModPart, holdsAll, isMac, modsToPrefix, parseMods };
