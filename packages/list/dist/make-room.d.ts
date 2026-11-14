/**
 * Room made where a drag would land: the items between the dragged item's place and where it would land drawn moved
 * one place, by their `translate`, towards the place it leaves, sliding there. Dropped or cancelled, they stay drawn
 * where they are until the drag ends, then slide from there to where they are laid out: nowhere, if the reorder put
 * them where they were drawn; back, if it was refused or never came. It sets the `translate` of items other than the
 * dragged one, and no other style.
 *
 * One place is the distance from the dragged item's start to the next item's (to the previous item's end from its
 * own end, for the last), measured where they are laid out when the drag begins, and again when the dragged item's
 * rank changes under it.
 */
export type Dragging<K> = Readonly<{
    key: K;
    target: K;
    after: boolean;
}>;
export type Motion<K> = Readonly<{
    key: K;
    phase: 'moving' | 'dropped' | 'cancelled' | 'ended';
}>;
export type MakeRoomOptions<K> = Readonly<{
    axis: 'x' | 'y';
    rank: (key: K) => number | undefined;
    duration: number;
}>;
export type MakeRoom<K> = Readonly<{
    apply: (key: K, element: Element) => void;
    watch: (listener: (keys?: readonly K[]) => void) => () => void;
    drop: (key: K, element: Element) => void;
    show: (at: Dragging<K> | undefined, motion: Motion<K>) => void;
}>;
/**
 * Where a drag would land, as drag shows it
 * @template K
 * @typedef {Readonly<{ key: K, target: K, after: boolean }>} Dragging
 */
/**
 * A drag's key and how it stands, as drag shows it
 * @template K
 * @typedef {Readonly<{ key: K, phase: 'moving' | 'dropped' | 'cancelled' | 'ended' }>} Motion
 */
/**
 * @template K
 * @typedef {Readonly<{ axis: 'x' | 'y', rank: (key: K) => number | undefined, duration: number }>} MakeRoomOptions
 */
/**
 * The facet, and showing it a drag (drag's `showing`)
 * @template K
 * @typedef {Readonly<{
 *   apply: (key: K, element: Element) => void,
 *   watch: (listener: (keys?: readonly K[]) => void) => () => void,
 *   drop: (key: K, element: Element) => void,
 *   show: (at: Dragging<K> | undefined, motion: Motion<K>) => void,
 * }>} MakeRoom
 */
/**
 * Moves aside the items a drag would pass
 * @template K
 * @param {MakeRoomOptions<K>} options - Which way the items run, across (`x`) or down (`y`); each key's rank, at
 *   once; and how long, in ms, items slide (0: they jump)
 * @returns {MakeRoom<K>} The facet, and showing it a drag
 */
declare function makeRoom<K>({ axis, duration, rank }: MakeRoomOptions<K>): MakeRoom<K>;
export { makeRoom };
