/**
 * Where a drop would land in a row or column of items: the dragged item takes slot n as soon as its leading edge, in
 * the direction it travels, enters the item that holds slot n. Travelling forward the leading edge is its end, and it
 * enters an item when it passes that item's start as laid out with the dragged item before it; travelling back it is
 * its start, entering an item when it passes that item's end as laid out with the dragged item after it. The direction
 * turns only once the pointer comes back further than `turn` from the furthest point it reached; until then the slot
 * is the one that furthest point gave, so smaller moves back change nothing.
 *
 * Items are measured where they are laid out, so items drawn elsewhere by their `translate` (to make room, or
 * following the pointer) don't move the gaps. A grabbed item drawn away from its place (still settling) is taken to
 * be where it was drawn.
 */
export type LeadingGapsOptions<K> = Readonly<{
    element: Element;
    itemOf: (target: EventTarget | null) => Readonly<{
        key: K;
        element: Element;
    }> | undefined;
    axis: 'x' | 'y';
    turn?: number;
}>;
export type Gap<K> = Readonly<{
    target: K;
    after: boolean;
}>;
export type Pressed<K> = Readonly<{
    key: K;
    from: Readonly<{
        x: number;
        y: number;
    }>;
}>;
export type Travel = Readonly<{
    direction: -1 | 0 | 1;
    furthest: number;
}>;
/**
 * Finds the gap a dragged item's leading edge is in
 * @template K
 * @param {LeadingGapsOptions<K>} options - The element the items are drawn in, as its children in order; the item an
 *   element is; which way they run, across (`x`) or down (`y`); and how far back, in pixels, the pointer comes before
 *   the direction turns (left out: 6)
 * @returns {(point: Readonly<{ x: number, y: number }>, drag: Pressed<K>) => Gap<K> | undefined} The gap for a drag
 *   with the pointer at a point in the viewport: the dragged item itself while it holds its own slot, none if it
 *   isn't drawn
 */
declare function leadingGaps<K>({ axis, element, itemOf, turn }: LeadingGapsOptions<K>): (point: Readonly<{
    x: number;
    y: number;
}>, drag: Pressed<K>) => Gap<K> | undefined;
export { leadingGaps };
