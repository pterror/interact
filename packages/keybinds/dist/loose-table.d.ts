/**
 * Handlers bound loosely: found by a press's lookups without modifiers, whatever other modifiers are held, as a
 * game's movement keys are. A binding's own modifiers are still required.
 */
export type Handler = Readonly<{
    run: (event: Event) => boolean | void;
    when?: () => boolean;
    typing?: boolean;
}>;
export type Modifiers = Readonly<{
    ctrl: boolean;
    alt: boolean;
    shift: boolean;
    meta: boolean;
}>;
export type Query = Readonly<{
    bare: readonly string[];
    mods: Modifiers;
}>;
/**
 * A table of handlers by lookup without modifiers
 * @template {Handler} H
 * @param {readonly (readonly [string, Modifiers, H])[]} entries - Each lookup without modifiers, the modifiers the
 *   binding needs, and its handler, in the order bound
 * @returns {(query: Query) => readonly H[]} Every handler bound to the query's lookups whose modifiers are held, each
 *   once, best first
 */
declare function looseTable<H extends Handler>(entries: readonly (readonly [string, Modifiers, H])[]): (query: Query) => readonly H[];
export { looseTable };
