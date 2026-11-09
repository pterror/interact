/**
 * One element per drawn key, in the order drawn. Where an element goes is the mount's; what it shows beyond what
 * `create` made is the facets'. Each new element is mounted, then every facet is applied to it in one synchronous
 * pass; a facet that reports keys changed is applied again to theirs. `drop` hears once that an element `create` made
 * is done with, after the facets have: taken out, or render stopping.
 */
export type Drawn<K> = Readonly<{
    keys: () => readonly K[];
    watch: (listener: () => void) => () => void;
}>;
export type Mount<K> = Readonly<{
    put: (key: K, element: Element, before: Element | undefined) => void;
    remove: (element: Element) => void;
}>;
export type Facet<K> = Readonly<{
    apply: (key: K, element: Element) => void;
    watch: (listener: (keys?: readonly K[]) => void) => () => void;
    drop?: (key: K, element: Element) => void;
}>;
export type RenderOptions<K> = Readonly<{
    drawn: Drawn<K>;
    create: (key: K) => Element;
    drop?: (key: K, element: Element) => void;
    mount: Mount<K>;
    facets: readonly Facet<K>[];
}>;
export type Item<K> = Readonly<{
    key: K;
    element: Element;
}>;
export type Rendered<K> = Readonly<{
    itemOf: (target: EventTarget | null) => Item<K> | undefined;
    stop: () => void;
}>;
/**
 * The keys to draw, in order, each once, and hearing them change
 * @template K
 * @typedef {Readonly<{ keys: () => readonly K[], watch: (listener: () => void) => () => void }>} Drawn
 */
/**
 * Where elements go: putting a key's element before another (none: at the end), taking one out
 * @template K
 * @typedef {Readonly<{ put: (key: K, element: Element, before: Element | undefined) => void,
 *   remove: (element: Element) => void }>} Mount
 */
/**
 * Something an element shows for its key. `watch` hears the keys whose state changed, or none for any; `drop` hears
 * that an element is no longer drawn: about to be taken out, or render stopping
 * @template K
 * @typedef {Readonly<{ apply: (key: K, element: Element) => void,
 *   watch: (listener: (keys?: readonly K[]) => void) => () => void,
 *   drop?: (key: K, element: Element) => void }>} Facet
 */
/**
 * @template K
 * @typedef {Readonly<{ drawn: Drawn<K>, create: (key: K) => Element, drop?: (key: K, element: Element) => void,
 *   mount: Mount<K>, facets: readonly Facet<K>[] }>} RenderOptions
 */
/**
 * A drawn item: its key and its element
 * @template K
 * @typedef {Readonly<{ key: K, element: Element }>} Item
 */
/**
 * What render gives: the drawn item an event target is in, and stopping
 * @template K
 * @typedef {Readonly<{ itemOf: (target: EventTarget | null) => Item<K> | undefined, stop: () => void }>} Rendered
 */
/**
 * Draws keys as elements, and keeps them drawn
 * @template K
 * @param {RenderOptions<K>} options - What to draw, how to make an element and hear it is done with, where it goes,
 *   and what it shows
 * @returns {Rendered<K>} The items drawn, and stopping
 */
declare function render<K>({ create, drawn, drop, facets, mount }: RenderOptions<K>): Rendered<K>;
export { render };
