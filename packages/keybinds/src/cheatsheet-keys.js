/**
 * The ids a cheatsheet shows, as render draws them: while it is open, each id not hidden that has a binding, grouped by
 * category (in the order categories first come, "Other" for none), in the schema's order within each; nothing while
 * it is closed.
 */

/**
 * @typedef {Readonly<{ category?: string, hidden?: boolean, keys?: readonly string[], mouse?: readonly string[],
 *   pad?: readonly string[], axes?: readonly string[] }>} Entry
 */

/**
 * @template T
 * @typedef {Readonly<{ get: () => T, watch: (listener: () => void) => () => void }>} Watched
 */

/**
 * @typedef {Readonly<{ bindings: Watched<Readonly<Record<string, Entry>>>, open: Watched<boolean> }>}
 *   CheatsheetKeysOptions
 */

const OTHER = 'Other'

/** @type {readonly string[]} */
const NONE = []

/** @type {readonly ('axes' | 'keys' | 'mouse' | 'pad')[]} */
const FIELDS = ['keys', 'mouse', 'pad', 'axes']

/**
 * An entry's category
 * @param {Entry | undefined} entry - The entry
 * @returns {string} Its category, or "Other"
 */
function categoryOf(entry) {
  const category = entry?.category ?? ''
  return category === '' ? OTHER : category
}

/**
 * The ids to show
 * @param {CheatsheetKeysOptions} options - The bindings in effect, by id; and whether the cheatsheet is open
 * @returns {Readonly<{ keys: () => readonly string[], watch: (listener: () => void) => () => void,
 *   groupOf: (id: string) => string }>} The Drawn, and an id's category
 */
function cheatsheetKeys({ bindings, open }) {
  /** @type {Readonly<{ from: Readonly<Record<string, Entry>>, keys: readonly string[] }> | undefined} */
  let made = undefined
  return {
    groupOf: (id) => categoryOf(bindings.get()[id]),
    keys() {
      if (!open.get()) {
        return NONE
      }
      const from = bindings.get()
      if (made?.from !== from) {
        /** @type {Map<string, string[]>} */
        const groups = new Map()
        for (const [id, entry] of Object.entries(from)) {
          if (entry.hidden !== true && FIELDS.some((field) => (entry[field]?.length ?? 0) > 0)) {
            const category = categoryOf(entry)
            groups.set(category, [...(groups.get(category) ?? []), id])
          }
        }
        made = { from, keys: [...groups.values()].flat() }
      }
      return made.keys
    },
    watch(listener) {
      const stops = [bindings.watch(listener), open.watch(listener)]
      return () => {
        for (const stop of stops) {
          stop()
        }
      }
    },
  }
}

export { cheatsheetKeys }
