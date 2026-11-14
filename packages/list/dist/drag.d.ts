/**
 * Dragging an item to another place with the pointer. A press becomes a drag once the pointer moves a few pixels;
 * where it would land is asked again whenever the pointer moves, anything scrolls under it or the drawn keys change;
 * the click that ends a drag is swallowed, so it doesn't also pick. The dragged key is held while the drag lasts, so
 * a list that draws its held keys keeps it drawn, and the drag is cancelled if the list removes it (the held key
 * moves off it). A drop ends once the reorder answers, whether it applied the change, refused it or failed. A press
 * lasts only while its button is held: a release anywhere ends it (dropping a drag), and a cancel, the pointer's
 * capture being lost or a move with the button up let it go (cancelling a drag).
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
export type Reorder<K> = (key: K, target: K, after: boolean) => PromiseLike<boolean> | boolean;
export type Press<K> = {
    pressed: Pressed<K>;
    pointer: number;
    moved: boolean;
    at: Dragging<K> | undefined;
    point: Point;
};
export type DragOptions<K> = Readonly<{
    element: Element;
    drawn: Readonly<{
        watch: (listener: () => void) => () => void;
    }>;
    held: Readonly<{
        get: () => K | undefined;
        set: (key: K | undefined) => void;
        watch: (listener: () => void) => () => void;
    }>;
    itemOf: (target: EventTarget | null) => Readonly<{
        key: K;
    }> | undefined;
    gap: (point: Point, drag: Pressed<K>) => Readonly<{
        target: K;
        after: boolean;
    }> | undefined;
    reorder: Reorder<K>;
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
 * `cancelled`, then `ended`, each of the last three once. `ended` comes once the reorder has answered, or once every
 * listener has heard the change that cancelled the drag, so what is drawn then is the list as it is, reordered or not
 * @template K
 * @typedef {Readonly<{ key: K, from: Point, point: Point, phase: 'moving' | 'dropped' | 'cancelled' | 'ended' }>}
 *   Motion
 */
/**
 * Moving an item next to another. It answers `true` once the list is as the move left it and every listener to the
 * list has heard, `false` if it won't move it; at once or later. A failure is taken as `false`
 * @template K
 * @typedef {(key: K, target: K, after: boolean) => PromiseLike<boolean> | boolean} Reorder
 */
/**
 * A press, and the drag it may become
 * @template K
 * @typedef {{ pressed: Pressed<K>, pointer: number, moved: boolean, at: Dragging<K> | undefined, point: Point }} Press
 */
/**
 * @template K
 * @typedef {Readonly<{
 *   element: Element,
 *   drawn: Readonly<{ watch: (listener: () => void) => () => void }>,
 *   held: Readonly<{ get: () => K | undefined, set: (key: K | undefined) => void,
 *     watch: (listener: () => void) => () => void }>,
 *   itemOf: (target: EventTarget | null) => Readonly<{ key: K }> | undefined,
 *   gap: (point: Point, drag: Pressed<K>) => Readonly<{ target: K, after: boolean }> | undefined,
 *   reorder: Reorder<K>,
 *   showing: (drag: Dragging<K> | undefined, motion: Motion<K>) => void,
 * }>} DragOptions
 */
/**
 * Lets items be dragged
 * @template K
 * @param {DragOptions<K>} options - Where items are; hearing the keys drawn change; a key the list holds (set to the
 *   dragged key, and none when the drag ends), to hold the dragged key with; the item an element is in; the gap at a
 *   point during a drag (a gap at the dragged item itself lands nowhere); moving an item; and showing where the drag
 *   would land (none: nowhere, or no longer moving) with where the pointer is and how the drag stands
 * @returns {() => void} Stops; a drag under way is cancelled and ended, and a drop waiting for its reorder ended
 */
declare function drag<K>({ drawn, element, gap, held, itemOf, reorder, showing }: DragOptions<K>): () => void;
export { drag };
