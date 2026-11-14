/**
 * Keys held from a list that isn't held in memory (read in pages, or from a server), moved by the removals its source
 * reports. A held key is always one of the list's keys, or none: `remove` moves it inside the edit, and the app calls it
 * before the list's other listeners hear of the edit. As `arrayList` holds only keys it has, a key removed can't be
 * held until the source reports it back (`add`: a removal undone, an item put back under its key); every other key is
 * taken to be in the list, since nothing else here knows it.
 */

/**
 * Where a held key goes when its item is removed: the next key kept (the previous at the end), the previous key kept
 * (the next at the start), or none
 * @typedef {'next' | 'none' | 'previous'} WhenRemoved
 */

/**
 * A removed key and its neighbours before the edit (none: an end); a neighbour removed in the same edit is passed over
 * @template K
 * @typedef {Readonly<{ key: K, next: K | undefined, previous: K | undefined }>} Removal
 */

/**
 * Hears a held key change: the key it left and the key it arrived at, those that aren't none
 * @template K
 * @typedef {(keys: readonly K[]) => void} HeldListener
 */

/**
 * A held key. Setting a key removed, and not since added back, leaves it as it was: such a key can only come from an
 * answer made before its item was removed
 * @template K
 * @typedef {Readonly<{
 *   get: () => K | undefined,
 *   set: (key: K | undefined) => void,
 *   has: (key: K) => boolean,
 *   watch: (listener: HeldListener<K>) => () => void,
 * }>} Held
 */

/**
 * @template K
 * @typedef {Readonly<{
 *   hold: (initial: K | undefined, whenRemoved: WhenRemoved) => Held<K>,
 *   remove: (removals: readonly Removal<K>[]) => void,
 *   add: (keys: readonly K[]) => void,
 * }>} HeldKeys
 */

/**
 * The first key from `start`, going by `side`, that the edit kept
 * @template K
 * @param {ReadonlyMap<K, Removal<K>>} removed - This edit's removals, by key
 * @param {K | undefined} start - Where to start
 * @param {'next' | 'previous'} side - Which way to go
 * @returns {K | undefined} The key, or none
 */
function kept(removed, start, side) {
  let key = start
  for (let steps = 0; key !== undefined && removed.has(key); steps += 1) {
    if (steps === removed.size) {
      return undefined
    }
    key = removed.get(key)?.[side]
  }
  return key
}

/**
 * One held key's state
 * @template K
 */
class HeldKey {
  /** @type {K | undefined} */
  #key
  /** @readonly */
  #whenRemoved
  /**
   * @readonly
   * @type {Set<HeldListener<K>>}
   */
  #listeners = new Set()

  /**
   * @param {K | undefined} key - Its key
   * @param {WhenRemoved} whenRemoved - Where it goes when its item is removed
   */
  constructor(key, whenRemoved) {
    this.#key = key
    this.#whenRemoved = whenRemoved
  }

  /** @returns {K | undefined} Its key */
  get key() {
    return this.#key
  }

  /**
   * Where it goes when this edit removes its key
   * @param {ReadonlyMap<K, Removal<K>>} removed - The edit's removals, by key
   * @returns {K | undefined} The key it goes to, or none
   */
  replacement(removed) {
    const removal = this.#key === undefined ? undefined : removed.get(this.#key)
    if (removal === undefined) {
      return this.#key
    }
    if (this.#whenRemoved === 'none') {
      return undefined
    }
    return this.#whenRemoved === 'next'
      ? (kept(removed, removal.next, 'next') ?? kept(removed, removal.previous, 'previous'))
      : (kept(removed, removal.previous, 'previous') ?? kept(removed, removal.next, 'next'))
  }

  /**
   * Changes its key, without telling anyone yet
   * @param {K | undefined} next - The key
   * @returns {(() => void) | undefined} Tells its listeners, if it changed
   */
  change(next) {
    const previous = this.#key
    if (previous === next) {
      return undefined
    }
    this.#key = next
    const keys = [previous, next].filter((key) => key !== undefined)
    const listeners = [...this.#listeners]
    return () => {
      for (const listener of listeners) {
        listener(keys)
      }
    }
  }

  /**
   * @param {HeldListener<K>} listener - Hears it change
   * @returns {() => void} Stops
   */
  watch(listener) {
    this.#listeners.add(listener)
    return () => {
      this.#listeners.delete(listener)
    }
  }
}

/**
 * Keys held from a list whose removals are reported. Keys are compared with `===`, and are never undefined
 * @template K
 * @returns {HeldKeys<K>} Holding a key; taking in an edit's removals; and taking in keys the list has again, which
 *   it forgets having removed
 */
function heldKeys() {
  /** @type {Set<K>} */
  const gone = new Set()
  /** @type {Set<HeldKey<K>>} */
  const holds = new Set()

  return {
    add(keys) {
      for (const key of keys) {
        gone.delete(key)
      }
    },
    hold(initial, whenRemoved) {
      /** @type {HeldKey<K>} */
      const held = new HeldKey(initial !== undefined && gone.has(initial) ? undefined : initial, whenRemoved)
      holds.add(held)
      return {
        get: () => held.key,
        has: (key) => held.key === key,
        set(key) {
          if (key === undefined || !gone.has(key)) {
            held.change(key)?.()
          }
        },
        watch: (listener) => held.watch(listener),
      }
    },
    remove(removals) {
      /** @type {Map<K, Removal<K>>} */
      const removed = new Map(removals.map((removal) => [removal.key, removal]))
      for (const { key } of removals) {
        gone.add(key)
      }
      const tell = [...holds].flatMap((held) => {
        const told = held.change(held.replacement(removed))
        return told === undefined ? [] : [told]
      })
      for (const told of tell) {
        told()
      }
    },
  }
}

export { heldKeys }
