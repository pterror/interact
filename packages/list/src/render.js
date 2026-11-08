/**
 * One element per drawn key, in the order drawn. Where an element goes is the mount's; what it shows beyond what
 * `create` made is the facets'. Each new element is mounted, then every facet is applied to it in one synchronous
 * pass; a facet that reports keys changed is applied again to theirs.
 */

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
 * Something an element shows for its key. `watch` hears the keys whose state changed, or none for any
 * @template K
 * @typedef {Readonly<{ apply: (key: K, element: Element) => void,
 *   watch: (listener: (keys?: readonly K[]) => void) => () => void }>} Facet
 */

/**
 * @template K
 * @typedef {Readonly<{ drawn: Drawn<K>, create: (key: K) => Element, mount: Mount<K>, facets: readonly Facet<K>[] }>}
 *   RenderOptions
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
 * @param {RenderOptions<K>} options - What to draw, how to make an element, where it goes, and what it shows
 * @returns {Rendered<K>} The items drawn, and stopping
 */
function render({ create, drawn, facets, mount }) {
  /** @type {Map<K, Element>} */
  const elements = new Map()
  /** @type {WeakMap<Node, K>} */
  const keyOf = new WeakMap()

  const draw = () => {
    const keys = drawn.keys()
    const wanted = new Set(keys)
    for (const [key, element] of elements) {
      if (!wanted.has(key)) {
        elements.delete(key)
        mount.remove(element)
      }
    }
    /** @type {Item<K>[]} */
    const made = []
    /** @type {Element | undefined} */
    let before = undefined
    for (const key of keys.toReversed()) {
      let element = elements.get(key)
      if (element === undefined) {
        element = create(key)
        elements.set(key, element)
        keyOf.set(element, key)
        made.push({ element, key })
      }
      mount.put(key, element, before)
      before = element
    }
    for (const item of made) {
      for (const facet of facets) {
        facet.apply(item.key, item.element)
      }
    }
  }

  /**
   * Applies a facet again
   * @param {Facet<K>} facet - The facet
   * @param {readonly K[]} [keys] - The keys whose state changed; none for any
   * @returns {void}
   */
  const reapply = (facet, keys) => {
    if (keys === undefined) {
      for (const [key, element] of elements) {
        facet.apply(key, element)
      }
      return
    }
    for (const key of keys) {
      const element = elements.get(key)
      if (element !== undefined) {
        facet.apply(key, element)
      }
    }
  }

  draw()
  const stops = [
    drawn.watch(draw),
    ...facets.map((facet) =>
      facet.watch((keys) => {
        reapply(facet, keys)
      }),
    ),
  ]

  return {
    itemOf(target) {
      let node = target instanceof Node ? target : undefined
      while (node !== undefined) {
        const key = keyOf.get(node)
        if (key !== undefined && node instanceof Element) {
          return { element: node, key }
        }
        node = node.parentNode ?? undefined
      }
      return undefined
    },
    stop() {
      for (const stop of stops) {
        stop()
      }
    },
  }
}

export { render }
