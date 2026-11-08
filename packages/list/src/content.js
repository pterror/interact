/**
 * What an element shows for its key, shown again whenever the source of it says the key's content changed: the same
 * item, kept, with new content.
 */

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
function content({ changes, show }) {
  return { apply: show, watch: (listener) => changes.watch(listener) }
}

export { content }
