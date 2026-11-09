/**
 * What an element shows for its key, shown again whenever the source of it says the key's content changed: the same
 * item, kept, with new content.
 */
export type ContentOptions<K> = Readonly<{
    show: (key: K, element: Element) => void;
    changes: Readonly<{
        watch: (listener: (keys?: readonly K[]) => void) => () => void;
    }>;
}>;
/**
 * @template K
 * @typedef {Readonly<{
 *   show: (key: K, element: Element) => void,
 *   changes: Readonly<{ watch: (listener: (keys?: readonly K[]) => void) => () => void }>,
 * }>} ContentOptions
 */
/**
 * Shows each element's content, and again when it changes
 * @template K
 * @param {ContentOptions<K>} options - Showing a key's content in its element, and hearing the keys whose content
 *   changed (none: any)
 * @returns {Readonly<{ apply: (key: K, element: Element) => void,
 *   watch: (listener: (keys?: readonly K[]) => void) => () => void }>} The facet
 */
declare function content<K>({ changes, show }: ContentOptions<K>): Readonly<{
    apply: (key: K, element: Element) => void;
    watch: (listener: (keys?: readonly K[]) => void) => () => void;
}>;
export { content };
