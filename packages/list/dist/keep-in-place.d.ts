/**
 * Keeps what is on screen in place, by key, whatever moves it: rows above it measured, or items added or removed
 * above it. It holds one drawn item at its distance from the top of the view (the item the app prefers, the active
 * one, while it is in view; else the first item from the top of the view), and after any change to the layout or the
 * ranks scrolls so that item is there again. It picks again when the view scrolls by other means, or when the preferred
 * item has come into view (revealed, say) and isn't the one held. It scrolls once
 * the change has been heard by everything else, so what sizes the scroll range already includes it. It hands the key it
 * holds on (`hold`), for the app to keep drawn, so the key has a rank after an edit however far it moved.
 */
export type KeepInPlaceOptions<K> = Readonly<{
    visible: Readonly<{
        get: () => Readonly<{
            start: number;
            end: number;
        }>;
        watch: (listener: () => void) => () => void;
    }>;
    scrollBy: (pixels: number) => void;
    layout: Readonly<{
        place: (rank: number) => Readonly<{
            y: number;
        }>;
        watch: (listener: () => void) => () => void;
    }>;
    drawn: Readonly<{
        keys: () => readonly K[];
        rank: (key: K) => number | undefined;
        watchRanks: (listener: () => void) => () => void;
    }>;
    prefer: () => K | undefined;
    hold: (key: K | undefined) => void;
}>;
/**
 * @template K
 * @typedef {Readonly<{
 *   visible: Readonly<{ get: () => Readonly<{ start: number, end: number }>,
 *     watch: (listener: () => void) => () => void }>,
 *   scrollBy: (pixels: number) => void,
 *   layout: Readonly<{ place: (rank: number) => Readonly<{ y: number }>, watch: (listener: () => void) => () => void }>,
 *   drawn: Readonly<{ keys: () => readonly K[], rank: (key: K) => number | undefined,
 *     watchRanks: (listener: () => void) => () => void }>,
 *   prefer: () => K | undefined,
 *   hold: (key: K | undefined) => void,
 * }>} KeepInPlaceOptions
 */
/**
 * Holds what is on screen in place
 * @template K
 * @param {KeepInPlaceOptions<K>} options - What is in view, scrolling, the layout, the keys drawn and their ranks, and
 *   the key to hold while it is in view, and where the key held goes
 * @returns {() => void} Stops
 */
declare function keepInPlace<K>({ drawn, hold, layout, prefer, scrollBy, visible }: KeepInPlaceOptions<K>): () => void;
export { keepInPlace };
