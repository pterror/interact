/**
 * The answers a server gives about a tree drawn by its top level: for a span of top-level ranks, each top-level node
 * with its subtree, cut short at every level. It holds the latest answers, gives the top-level keys to `windowing`,
 * and each node's children to the list drawn inside it. Ranks exist only at the top level.
 */

/**
 * @template K, N
 * @typedef {Readonly<{
 *   fetch: (from: number, to: number) => Promise<readonly N[]>,
 *   locate: (key: K) => Promise<number | undefined>,
 *   changes: Readonly<{ watch: (listener: () => void) => () => void }>,
 * }>} TreeCacheOptions
 */

/**
 * @template K, N
 * @typedef {Readonly<{
 *   keysAt: (from: number, to: number) => Promise<readonly K[]>,
 *   watch: (listener: () => void) => () => void,
 *   locate: (key: K) => Promise<number | undefined>,
 *   children: (key: K) => Readonly<{ keys: () => readonly K[], watch: (listener: () => void) => () => void }>,
 *   node: (key: K) => N | undefined,
 *   watchNodes: (listener: (keys?: readonly K[]) => void) => () => void,
 * }>} TreeCache
 */

/** How many top-level nodes found by key are kept besides the latest span */
const KEPT = 8

/**
 * Whether two nodes say the same about themselves, their children aside
 * @param {object} one - A node
 * @param {object} other - The node it was
 * @returns {boolean} Whether every field but `children` is the same
 */
function sameContent(one, other) {
  const now = new Map(Object.entries(one))
  const was = new Map(Object.entries(other))
  const fields = new Set([...now.keys(), ...was.keys()])
  fields.delete('children')
  return [...fields].every((field) => Object.is(now.get(field), was.get(field)))
}

/**
 * Whether two lists of keys are the same
 * @template K
 * @param {readonly K[]} one - A list
 * @param {readonly K[]} other - Another
 * @returns {boolean} Whether they hold the same keys in the same order
 */
function same(one, other) {
  return one.length === other.length && one.every((key, index) => other[index] === key)
}

/**
 * Holds a server's answers about a tree
 * @template K
 * @template {Readonly<{ key: K, children?: readonly N[] }>} N
 * @param {TreeCacheOptions<K, N>} options - The server's top-level nodes for a span of ranks, a top-level key's rank,
 *   and hearing the tree change
 * @returns {TreeCache<K, N>} The top-level keys at ranks, a top-level key's rank (with its node fetched), each node's
 *   children, each node, and hearing the keys whose node now says something else about itself
 */
function treeCache({ changes, fetch, locate }) {
  /** @type {readonly N[]} */
  let span = []
  /** @type {{ from: number, to: number } | undefined} */
  let spanAsked = undefined
  /** @type {Map<K, { rank: number, node: N }>} */
  const kept = new Map()
  /** @type {Map<K, N>} */
  let nodes = new Map()
  /** @type {Map<K, readonly K[]>} */
  const childKeys = new Map()
  /** @type {Map<K, Set<() => void>>} */
  const childListeners = new Map()
  /** @type {Set<() => void>} */
  const topListeners = new Set()
  /** @type {Set<(keys?: readonly K[]) => void>} */
  const nodeListeners = new Set()
  let asked = 0

  /**
   * Notes a node and everything under it
   * @param {N} node - The node
   * @param {Map<K, N>} into - Where
   * @returns {void}
   */
  const index = (node, into) => {
    into.set(node.key, node)
    for (const child of node.children ?? []) {
      index(child, into)
    }
  }

  const rebuild = () => {
    /** @type {Map<K, N>} */
    const next = new Map()
    for (const node of span) {
      index(node, next)
    }
    for (const { node } of kept.values()) {
      index(node, next)
    }
    const previous = nodes
    nodes = next
    /** @type {K[]} */
    const changedKeys = []
    for (const [key, node] of next) {
      const was = previous.get(key)
      if (was !== undefined && was !== node && !sameContent(node, was)) {
        changedKeys.push(key)
      }
    }
    if (changedKeys.length > 0) {
      for (const listener of nodeListeners) {
        listener(changedKeys)
      }
    }
    /** @type {(() => void)[]} */
    const tell = []
    for (const [key, listeners] of childListeners) {
      const now = (next.get(key)?.children ?? []).map((child) => child.key)
      const before = childKeys.get(key) ?? []
      if (!same(before, now)) {
        childKeys.set(key, now)
        tell.push(...listeners)
      }
    }
    for (const listener of tell) {
      listener()
    }
  }

  /**
   * Fetches one top-level node by its rank
   * @param {K} key - Its key
   * @param {number} rank - Its rank
   * @returns {Promise<void>} When it is held
   */
  const fetchKept = async (key, rank) => {
    const [node] = await fetch(rank, rank + 1)
    if (node?.key === key) {
      kept.delete(key)
      kept.set(key, { node, rank })
      for (const old of kept.keys()) {
        if (kept.size <= KEPT) {
          break
        }
        kept.delete(old)
      }
      rebuild()
    }
  }

  changes.watch(() => {
    for (const [key, { rank }] of kept) {
      void fetchKept(key, rank)
    }
    for (const listener of topListeners) {
      listener()
    }
  })

  return {
    children(key) {
      return {
        keys() {
          if (!childKeys.has(key)) {
            childKeys.set(
              key,
              (nodes.get(key)?.children ?? []).map((child) => child.key),
            )
          }
          return childKeys.get(key) ?? []
        },
        watch(listener) {
          let listeners = childListeners.get(key)
          if (listeners === undefined) {
            listeners = new Set()
            childListeners.set(key, listeners)
          }
          listeners.add(listener)
          return () => {
            listeners.delete(listener)
            if (listeners.size === 0) {
              childListeners.delete(key)
              childKeys.delete(key)
            }
          }
        },
      }
    },
    async keysAt(from, to) {
      asked += 1
      const question = asked
      spanAsked = { from, to }
      const answer = await fetch(from, to)
      if (question === asked && spanAsked.from === from && spanAsked.to === to) {
        span = answer
        rebuild()
      }
      return answer.map((node) => node.key)
    },
    async locate(key) {
      const rank = await locate(key)
      if (rank !== undefined && !nodes.has(key)) {
        await fetchKept(key, rank)
      }
      return rank
    },
    node: (key) => nodes.get(key),
    watch(listener) {
      topListeners.add(listener)
      return () => {
        topListeners.delete(listener)
      }
    },
    watchNodes(listener) {
      nodeListeners.add(listener)
      return () => {
        nodeListeners.delete(listener)
      }
    },
  }
}

export { treeCache }
