/**
 * Mouse bindings as strings: modifiers and one button or scroll direction ("$mod+Click", "MiddleClick", "ScrollUp").
 * Each button has several names; a binding's lookup uses one ("click", "middle", "back", "scrollup"), and so does a
 * mouse event's.
 */
export type Modifiers = Readonly<{
    ctrl: boolean;
    alt: boolean;
    shift: boolean;
    meta: boolean;
}>;
export type ParsedMouse = Readonly<{
    lookup: string;
    bare: string;
    mods: Modifiers;
}>;
/**
 * @typedef {Readonly<{ ctrl: boolean, alt: boolean, shift: boolean, meta: boolean }>} Modifiers
 */
/**
 * A mouse binding parsed: its lookup, its lookup without modifiers (its button), and the modifiers it needs
 * @typedef {Readonly<{ lookup: string, bare: string, mods: Modifiers }>} ParsedMouse
 */
/**
 * Every name a binding can give a button, to the name lookups use
 * @type {ReadonlyMap<string, string>}
 */
declare const mouseButtons: ReadonlyMap<string, string>;
/**
 * Parses one mouse binding, without other steps
 * @param {string} binding - The binding, without its suffix: "$mod+Click"
 * @param {string} [suffix] - Its suffix (":up", ":hold"), if any; scrolling takes none
 * @returns {ParsedMouse} It normalized
 * @throws {Error} If it has no button, several, an unknown one, or is a scroll with a suffix
 */
declare function mouseParse(binding: string, suffix?: string): ParsedMouse;
/**
 * The name lookups give a mouse event's button, or a wheel event's direction: vertical if it scrolls so, otherwise
 * horizontal
 * @param {MouseEvent} event - The event
 * @returns {string | undefined} "click", ..., "scrollup", ...; nothing for a button no binding names, or a wheel event
 *   that doesn't scroll
 */
declare function mouseName(event: MouseEvent): string | undefined;
export { mouseButtons, mouseName, mouseParse };
