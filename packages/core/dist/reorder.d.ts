/**
 * A listbox whose options can be reordered, by dragging with a pointer or by Alt+ArrowUp and Alt+ArrowDown on the
 * active option, as in the WAI-ARIA listbox with rearrangeable options
 * (https://www.w3.org/WAI/ARIA/apg/patterns/listbox/examples/listbox-rearrangeable/). It is the list with its step and
 * view wrapped: what it handles first is the drag and the move keys, and everything else is the list's.
 *
 * The order is the collection's, by the contract's rule: a move shows at once, is emitted as `move` with an id, and
 * stays pending, applied over the keys the host answers with, until the host has it (`confirmed`, then the next
 * answer holds it) or refuses it (`refused`, which undoes it). Every move is made against the order shown, pending
 * moves included. ARIA has no word for a dragged item or a drop place (`aria-grabbed` and `aria-dropeffect` are
 * deprecated), so they are `data` states, and a move is announced.
 *
 * A drag starts once the pointer has moved `dragDistance` (in the target's units) from where it was pressed, and
 * lands by which option the pointer is over: after it when that option is later than the dragged one, before it when
 * earlier.
 */
import type { Announce, Confirmed, i53, Key, Pointer, PropsInput, View, Widget } from './contract.js';
import type { ListEffect, ListInput, ListProps, ListState } from './list.js';
export type ReorderProps = ListProps & Readonly<{
    keyshortcuts: string;
    dragDistance: number;
}>;
export type Drag = Readonly<{
    mode: 'idle';
}> | Readonly<{
    mode: 'pressed';
    item: Key;
    pointerId: number;
    x: number;
    y: number;
}> | Readonly<{
    mode: 'dragging';
    item: Key;
    pointerId: number;
    over: Key | null;
    after: boolean;
}>;
export type Move = Readonly<{
    id: i53;
    item: Key;
    target: Key;
    after: boolean;
    confirmed: boolean;
    through: i53 | null;
}>;
export type ReorderState = ListState & Readonly<{
    drag: Drag;
    swallow: boolean;
    base: readonly Key[];
    moves: readonly Move[];
    keyshortcuts: string;
    dragDistance: number;
}>;
export type ReorderInput = Exclude<ListInput, PropsInput<ListProps>> | PropsInput<ReorderProps> | Pointer | Confirmed;
export type ReorderEffect = ListEffect | Announce | Readonly<{
    type: 'move';
    id: i53;
    source: string;
    item: Key;
    target: Key;
    after: boolean;
}>;
/**
 * The list's view, with the drag shown and the pointer heard
 * @param {ReorderState} state - The list
 * @returns {View} Its parts
 */
declare function view(state: ReorderState): View;
/** @type {Widget<ReorderProps, ReorderState, ReorderInput, ReorderEffect>} */
declare const reorderList: Widget<ReorderProps, ReorderState, ReorderInput, ReorderEffect>;
export { reorderList, view as reorderListView };
