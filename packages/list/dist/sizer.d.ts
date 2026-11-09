/**
 * Sizes the element that holds every item, so the scroll range covers them all, drawn or not.
 */
export type Watched<T> = Readonly<{
    get: () => T;
    watch: (listener: () => void) => () => void;
}>;
export type SizerOptions = Readonly<{
    element: Element;
    layout: Readonly<{
        extent: (count: number) => Readonly<{
            height: number;
        }>;
        watch: (listener: () => void) => () => void;
    }>;
    count: Watched<number>;
}>;
/**
 * @template T
 * @typedef {Readonly<{ get: () => T, watch: (listener: () => void) => () => void }>} Watched
 */
/**
 * @typedef {Readonly<{
 *   element: Element,
 *   layout: Readonly<{ extent: (count: number) => Readonly<{ height: number }>,
 *     watch: (listener: () => void) => () => void }>,
 *   count: Watched<number>,
 * }>} SizerOptions
 */
/**
 * Keeps an element as tall as the layout says every item is
 * @param {SizerOptions} options - The element, the layout and the count
 * @returns {() => void} Stops
 */
declare function sizer({ count, element, layout }: SizerOptions): () => void;
export { sizer };
