/**
 * Dragging an item to another place with the pointer. A press becomes a drag once the pointer moves a few pixels;
 * where it would land is asked again whenever the pointer moves or anything scrolls under it; the click that ends a
 * drag is swallowed, so it doesn't also pick.
 */
export type Dragging<K> = Readonly<{
    key: K;
    target: K;
    after: boolean;
}>;
export type Point = Readonly<{
    x: number;
    y: number;
}>;
export type Pressed<K> = Readonly<{
    key: K;
    from: Point;
}>;
export type Motion<K> = Readonly<{
    key: K;
    from: Point;
    point: Point;
    phase: 'moving' | 'dropped' | 'cancelled' | 'ended';
}>;
export type DragOptions<K> = Readonly<{
    element: Element;
    itemOf: (target: EventTarget | null) => Readonly<{
        key: K;
    }> | undefined;
    gap: (point: Point, drag: Pressed<K>) => Readonly<{
        target: K;
        after: boolean;
    }> | undefined;
    reorder: (key: K, target: K, after: boolean) => void;
    showing: (drag: Dragging<K> | undefined, motion: Motion<K>) => void;
}>;
/**
 * A drag under way: what is dragged, and where it would land
 * @template K
 * @typedef {Readonly<{ key: K, target: K, after: boolean }>} Dragging
 */
/**
 * A point in the viewport, in CSS pixels
 * @typedef {Readonly<{ x: number, y: number }>} Point
 */
/**
 * The drag a question is about: the key dragged and where the pointer was pressed. One drag asks with the same record
 * each time, and no other drag asks with it
 * @template K
 * @typedef {Readonly<{ key: K, from: Point }>} Pressed
 */
/**
 * Where the pointer is in a drag, and how the drag stands: `moving`, then `dropped` (before reorder is called) or
 * `cancelled`, then `ended` (after reorder is called), each of the last three once
 * @template K
 * @typedef {Readonly<{ key: K, from: Point, point: Point, phase: 'moving' | 'dropped' | 'cancelled' | 'ended' }>}
 *   Motion
 */
/**
 * @template K
 * @typedef {Readonly<{
 *   element: Element,
 *   itemOf: (target: EventTarget | null) => Readonly<{ key: K }> | undefined,
 *   gap: (point: Point, drag: Pressed<K>) => Readonly<{ target: K, after: boolean }> | undefined,
 *   reorder: (key: K, target: K, after: boolean) => void,
 *   showing: (drag: Dragging<K> | undefined, motion: Motion<K>) => void,
 * }>} DragOptions
 */
/**
 * Lets items be dragged
 * @template K
 * @param {DragOptions<K>} options - Where items are, the item an element is in, the gap at a point during a drag (a
 *   gap at the dragged item itself lands nowhere), moving an item, and showing where the drag would land (none:
 *   nowhere, or no longer moving) with where the pointer is and how the drag stands
 * @returns {() => void} Stops
 */
declare function drag<K>({ element, gap, itemOf, reorder, showing }: DragOptions<K>): () => void;
export { drag };
