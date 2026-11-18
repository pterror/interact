/**
 * A listbox over a collection the host holds (on a server, say): the WAI-ARIA listbox
 * (https://www.w3.org/WAI/ARIA/apg/patterns/listbox/), single selection, selection not following focus. It draws a
 * window of `rows` options and holds one more key each side of it, so every drawn option's neighbours are known. Keys
 * come from the host by `ask` about its `source`; only the answer to the latest ask is used, and `changed` asks again.
 * The window follows the active option, and, once an option's size is `measured`, the list's `scroll` offset.
 * Characters typed are typeahead: the host finds the option they start (`ask` with `find`), and only the answer to the
 * latest find is used. Shown with nothing selected and nothing active, or focused so, the first option is active.
 * Given a visible label outside it (`label`), it is named by it. With `hover`, the option under the pointer becomes
 * active.
 *
 * Selection is the value, by the contract's rule: with `selected` in its props (not `null`), a choice shows at once and is pending
 * until the props confirm it or the app refuses it. The list emits `active` whenever the active option it draws
 * changes, so a parent can name it (`aria-activedescendant`) without reading the list's state.
 */
import type { Answer, Ask, Change, Changed, Click, Focused, Found, i32, i53, Key, KeyDown, Measured, Pointer, PreventDefault, PropsInput, Refused, Result, Scroll, SourceName, Time, View, Wake, Widget } from './contract.js';
import type { Pending } from './pending.js';
export type ListProps = Readonly<{
    label: string;
    rows: i32;
    source: SourceName;
    shown: boolean;
    focusable: boolean;
    hover: boolean;
    selected: Readonly<{
        value: Key | null;
    }> | null;
}>;
export type Asked = Readonly<{
    top: i32;
    rows: i32;
    revision: i53;
}> | Readonly<{
    locate: Key;
    rows: i32;
    revision: i53;
}>;
export type ListState = Readonly<{
    label: string;
    rows: i32;
    source: string;
    shown: boolean;
    focusable: boolean;
    hover: boolean;
    selection: Pending<Key | null>;
    revision: i53;
    count: i32 | null;
    top: i32;
    from: i32;
    keys: readonly Key[];
    asked: i53;
    askedFor: Asked | null;
    active: Key | null;
    activeRank: i32 | null;
    follow: 'key' | 'rank' | 'last';
    rowSize: number | null;
    prefix: string;
    until: number;
    sought: i53;
}>;
export type Active = Readonly<{
    type: 'active';
    item: Key | null;
}>;
export type ListInput = KeyDown | Click | Focused | Pointer | Scroll | Measured | PropsInput<ListProps> | Answer | Found | Changed | Refused | Time;
export type ListEffect = Ask | Change<Key | null> | PreventDefault | Wake | Active;
/**
 * The rank of a held key
 * @param {ListState} state - The list
 * @param {Key} key - The key
 * @returns {i32 | null} Its rank, or `null` if it isn't held
 */
declare function rankOf(state: ListState, key: Key): i32 | null;
/**
 * The keys drawn: the held keys whose ranks are in the window
 * @param {ListState} state - The list
 * @returns {readonly Key[]} The keys, in order
 */
declare function drawnKeys(state: ListState): readonly Key[];
/**
 * The active key made to agree with the keys held: a move to a rank takes the key now held there; an active key held
 * takes its rank; an active key no longer held gives way to the key at its rank
 * @param {ListState} state - The list
 * @returns {ListState} The list
 */
declare function withActive(state: ListState): ListState;
/**
 * The window's first rank, moved as little as shows a rank
 * @param {ListState} state - The list
 * @param {i32} rank - The rank to show
 * @returns {i32} The first rank
 */
declare function topFor(state: ListState, rank: i32): i32;
/**
 * Emits `active` when the active option drawn changed between two states
 * @template {ListState} S
 * @template E
 * @param {S} before - The list before
 * @param {Result<S, E>} result - The step's result
 * @returns {Result<S, E | Active>} The result, `active` added if it changed
 */
declare function tellActive<S extends ListState, E>(before: S, [after, effects]: Result<S, E>): Result<S, E | Active>;
/**
 * The view
 * @param {ListState} state - The list
 * @returns {View} Its parts
 */
declare function view(state: ListState): View;
/** @type {Widget<ListProps, ListState, ListInput, ListEffect>} */
declare const list: Widget<ListProps, ListState, ListInput, ListEffect>;
export { drawnKeys, list, view as listView, rankOf, tellActive, topFor, withActive };
