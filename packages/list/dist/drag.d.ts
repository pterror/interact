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
export type DragOptions<K> = Readonly<{
    element: Element;
    itemOf: (target: EventTarget | null) => Readonly<{
        key: K;
    }> | undefined;
    gap: (point: Readonly<{
        x: number;
        y: number;
    }>) => Readonly<{
        target: K;
        after: boolean;
    }> | undefined;
    reorder: (key: K, target: K, after: boolean) => void;
    showing: (drag: Dragging<K> | undefined) => void;
}>;
/**
 * A drag under way: what is dragged, and where it would land
 * @template K
 * @typedef {Readonly<{ key: K, target: K, after: boolean }>} Dragging
 */
/**
 * @template K
 * @typedef {Readonly<{
 *   element: Element,
 *   itemOf: (target: EventTarget | null) => Readonly<{ key: K }> | undefined,
 *   gap: (point: Readonly<{ x: number, y: number }>) => Readonly<{ target: K, after: boolean }> | undefined,
 *   reorder: (key: K, target: K, after: boolean) => void,
 *   showing: (drag: Dragging<K> | undefined) => void,
 * }>} DragOptions
 */
/**
 * Lets items be dragged
 * @template K
 * @param {DragOptions<K>} options - Where items are, the item an element is in, the gap at a point, moving an item,
 *   and showing the drag (none when it ends)
 * @returns {() => void} Stops
 */
declare function drag<K>({ element, gap, itemOf, reorder, showing }: DragOptions<K>): () => void;
export { drag };
