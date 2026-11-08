/**
 * A list of keys held in memory, and the keys held from it. A held key is always one of the list's keys, or none: an
 * edit that removes it moves it inside that edit, before anything hears of the edit.
 */

/**
 * Where a held key goes when its item is removed: the next key kept (the previous at the end), the previous key kept
 * (the next at the start), or none
 * @typedef {'next' | 'none' | 'previous'} WhenRemoved
 */

/**
 * Hears a held key change: the key it left and the key it arrived at, those that aren't none
 * @template K
 * @typedef {(keys: readonly K[]) => void} HeldListener
 */

/**
 * A key held from a list. Setting a key the list doesn't have leaves it as it was: such a key can only come from an
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
 * A list of keys in memory
 * @template K
 * @typedef {Readonly<{
 *   keys: () => readonly K[],
 *   set: (keys: readonly K[]) => void,
 *   watch: (listener: () => void) => () => void,
 *   hold: (initial: K | undefined, whenRemoved: WhenRemoved) => Held<K>,
 * }>} ArrayList
 */

/**
 * The first key from `from`, going by `by`, that the edit kept
 * @template K
 * @param {readonly K[]} old - The keys before the edit
 * @param {Readonly<{ from: number, by: 1 | -1 }>} walk - Where to start and which way to go
 * @param {ReadonlySet<K>} kept - The keys after the edit
 * @returns {K | undefined} The key, or none
 */
function survivor(old, { by, from }, kept) {
  for (let index = from; index >= 0 && index < old.length; index += by) {
    const key = old[index]
    if (key !== undefined && kept.has(key)) {
      return key
    }
  }
  return undefined
}

/**
 * Where a removed held key goes
 * @template K
 * @param {readonly K[]} old - The keys before the edit
 * @param {number} index - Where the key was
 * @param {ReadonlySet<K>} kept - The keys after the edit
 * @param {WhenRemoved} whenRemoved - Which way it goes
 * @returns {K | undefined} The key it becomes, or none
 */
function replacement(old, index, kept, whenRemoved) {
  if (whenRemoved === 'none') {
    return undefined
  }
  /** @type {1 | -1} */
  const ahead = whenRemoved === 'next' ? 1 : -1
  return (
    survivor(old, { by: ahead, from: index + ahead }, kept) ??
    survivor(old, { by: ahead === 1 ? -1 : 1, from: index }, kept)
  )
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

  /** @returns {WhenRemoved} Where it goes when its item is removed */
  get whenRemoved() {
    return this.#whenRemoved
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
 * A list of keys in memory. Keys are compared with `===`, and are never undefined
 * @template K
 * @param {readonly K[]} initial - Its keys, in order, each once
 * @returns {ArrayList<K>} The list
 */
function arrayList(initial) {
  let current = [...initial]
  let present = new Set(current)
  /** @type {Set<() => void>} */
  const watchers = new Set()
  /** @type {Set<HeldKey<K>>} */
  const holds = new Set()

  return {
    hold(start, whenRemoved) {
      /** @type {K | undefined} */
      const kept = start !== undefined && present.has(start) ? start : undefined
      /** @type {HeldKey<K>} */
      const held = new HeldKey(kept, whenRemoved)
      holds.add(held)
      return {
        get: () => held.key,
        has: (key) => held.key === key,
        set(key) {
          if (key === undefined || present.has(key)) {
            held.change(key)?.()
          }
        },
        watch: (listener) => held.watch(listener),
      }
    },
    keys: () => current,
    set(keys) {
      const old = current
      current = [...keys]
      present = new Set(current)
      const kept = present
      const tell = [...holds].flatMap((held) => {
        const { key } = held
        if (key === undefined || kept.has(key)) {
          return []
        }
        const told = held.change(replacement(old, old.indexOf(key), kept, held.whenRemoved))
        return told === undefined ? [] : [told]
      })
      for (const watcher of watchers) {
        watcher()
      }
      for (const told of tell) {
        told()
      }
    },
    watch(listener) {
      watchers.add(listener)
      return () => {
        watchers.delete(listener)
      }
    },
  }
}

export { arrayList }
