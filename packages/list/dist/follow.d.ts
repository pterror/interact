/**
 * The dragged item drawn following the pointer, by its `translate`: where it was drawn when the drag began (part-way
 * through a slide, if it was), moved as far as the pointer since, however the items under it have moved (scrolled,
 * or others added or taken out). Once the drag ends, dropped or cancelled, it slides from where it was let go to where
 * it is laid out then (the list as drag ends it: reordered, or not, so a cancelled drag slides back to where it
 * started), marked `data-settling` while it does. It sets the `translate` of the dragged item's element only, and no
 * other style.
 */
export type Dragging<K> = Readonly<{
    key: K;
    target: K;
    after: boolean;
}>;
export type Motion<K> = Readonly<{
    key: K;
    from: Readonly<{
        x: number;
        y: number;
    }>;
    point: Readonly<{
        x: number;
        y: number;
    }>;
    phase: 'moving' | 'dropped' | 'cancelled' | 'ended';
}>;
export type FollowOptions = Readonly<{
    axis?: 'x' | 'y';
    duration: number;
}>;
export type Follow<K> = Readonly<{
    apply: (key: K, element: Element) => void;
    watch: (listener: (keys?: readonly K[]) => void) => () => void;
    drop: (key: K, element: Element) => void;
    showing: (at: Dragging<K> | undefined, motion: Motion<K>) => void;
    has: (key: K) => boolean;
}>;
/**
 * Draws the dragged item where the pointer takes it
 * @template K
 * @param {FollowOptions} options - The one axis it moves along (left out: both), and how long, in ms, it slides into
 *   place when the drag ends (0: it jumps)
 * @returns {Follow<K>} The facet, showing it a drag, and whether it draws a key: from the drag's first move until
 *   its slide into place is over
 */
declare function follow<K>({ axis, duration }: FollowOptions): Follow<K>;
export { follow };
