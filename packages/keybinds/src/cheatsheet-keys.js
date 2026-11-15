/**
 * The ids a cheatsheet shows, as render draws them: while it is open, each id not hidden that has a binding, grouped by
 * category (in the order categories first come, `other` for none), in the schema's order within each; nothing while
 * it is closed.
 */

import { withStrings } from './strings.js'

/** @import { StringsOption } from './strings.js' */

/**
 * @typedef {Readonly<{ category?: string, hidden?: boolean, keys?: readonly string[], mouse?: readonly string[],
 *   pad?: readonly string[], axes?: readonly string[] }>} Entry
 */

/**
 * @template T
 * @typedef {Readonly<{ get: () => T, watch: (listener: () => void) => () => void }>} Watched
 */

/**
 * @typedef {Readonly<{ bindings: Watched<Readonly<Record<string, Entry>>>, open: Watched<boolean>, strings?: StringsOption }>}
 *   CheatsheetKeysOptions
 */

/** @type {readonly string[]} */
const NONE = []

/** @type {readonly ('axes' | 'keys' | 'mouse' | 'pad')[]} */
const FIELDS = ['keys', 'mouse', 'pad', 'axes']

/**
 * An entry's category
 * @param {Entry | undefined} entry - The entry
 * @param {string} other - The category of an entry with none
 * @returns {string} Its category
 */
function categoryOf(entry, other) {
  const category = entry?.category ?? ''
  return category === '' ? other : category
}

/**
 * The ids to show
 * @param {CheatsheetKeysOptions} options - The bindings in effect, by id; whether the cheatsheet is open; and the
 *   words to show in place of English
 * @returns {Readonly<{ keys: () => readonly string[], watch: (listener: () => void) => () => void,
 *   groupOf: (id: string) => string }>} The Drawn, and an id's category
 */
function cheatsheetKeys({ bindings, open, strings }) {
  const { other } = withStrings(strings)
  /** @type {Readonly<{ from: Readonly<Record<string, Entry>>, keys: readonly string[] }> | undefined} */
  let made = undefined
  return {
    groupOf: (id) => categoryOf(bindings.get()[id], other),
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
            const category = categoryOf(entry, other)
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
