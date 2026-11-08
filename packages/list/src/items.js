/**
 * Every drawn item, across every render this facet is given to: the innermost item an event target is in, when
 * lists are drawn inside each other's items.
 */

/**
 * @template K
 * @typedef {Readonly<{
 *   apply: (key: K, element: Element) => void,
 *   drop: (key: K, element: Element) => void,
 *   watch: () => () => void,
 *   itemOf: (target: EventTarget | null) => Readonly<{ key: K, element: Element }> | undefined,
 * }>} Items
 */

/**
 * Notes items as render draws them
 * @template K
 * @returns {Items<K>} The facet, and the innermost item an event target is in
 */
function items() {
  /** @type {WeakMap<Node, K>} */
  const keys = new WeakMap()
  return {
    apply(key, element) {
      keys.set(element, key)
    },
    drop(_key, element) {
      keys.delete(element)
    },
    itemOf(target) {
      let node = target instanceof Node ? target : undefined
      while (node !== undefined) {
        const key = keys.get(node)
        if (key !== undefined && node instanceof Element) {
          return { element: node, key }
        }
        node = node.parentNode ?? undefined
      }
      return undefined
    },
    watch: () => () => undefined,
  }
}

export { items }
