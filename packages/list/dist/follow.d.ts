/**
 * The dragged item drawn following the pointer, by its `translate`, from where it was drawn when the drag began; and,
 * once the drag ends, sliding from where it was let go to where it is laid out then (after a drop's reorder). It sets
 * the `translate` of the dragged item's element only, and no other style.
 */
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
    show: (at: unknown, motion: Motion<K>) => void;
}>;
/**
 * A drag's pointer and how it stands, as drag shows it
 * @template K
 * @typedef {Readonly<{ key: K, from: Readonly<{ x: number, y: number }>, point: Readonly<{ x: number, y: number }>,
 *   phase: 'moving' | 'dropped' | 'cancelled' | 'ended' }>} Motion
 */
/**
 * @typedef {Readonly<{ axis?: 'x' | 'y', duration: number }>} FollowOptions
 */
/**
 * The facet, and showing it a drag (drag's `showing`)
 * @template K
 * @typedef {Readonly<{
 *   apply: (key: K, element: Element) => void,
 *   watch: (listener: (keys?: readonly K[]) => void) => () => void,
 *   drop: (key: K, element: Element) => void,
 *   show: (at: unknown, motion: Motion<K>) => void,
 * }>} Follow
 */
/**
 * Draws the dragged item where the pointer takes it
 * @template K
 * @param {FollowOptions} options - The one axis it moves along (left out: both), and how long, in ms, it slides into
 *   place when the drag ends (0: it jumps)
 * @returns {Follow<K>} The facet, and showing it a drag
 */
declare function follow<K>({ axis, duration }: FollowOptions): Follow<K>;
export { follow };
