/**
 * The ids a settings panel shows, as render draws them: each id of the schema not hidden, bound or not, grouped by
 * category (in the order categories first come, `other` for none), in the schema's order within each.
 */

import { withStrings } from './strings.js'

/** @import { StringsOption } from './strings.js' */

/** @typedef {Readonly<{ category?: string, hidden?: boolean }>} Entry */

/**
 * The ids to show
 * @param {Readonly<Record<string, Entry>>} schema - The schema
 * @param {StringsOption} [strings] - The words to show in place of English
 * @returns {Readonly<{ keys: () => readonly string[], watch: (listener: () => void) => () => void,
 *   groupOf: (id: string) => string }>} The Drawn (it never changes), and an id's category
 */
function settingsKeys(schema, strings) {
  const other = withStrings(strings).other
  /** @type {(id: string) => string} */
  const groupOf = (id) => {
    const category = schema[id]?.category ?? ''
    return category === '' ? other : category
  }
  /** @type {Map<string, string[]>} */
  const groups = new Map()
  for (const [id, entry] of Object.entries(schema)) {
    if (entry.hidden !== true) {
      groups.set(groupOf(id), [...(groups.get(groupOf(id)) ?? []), id])
    }
  }
  const keys = [...groups.values()].flat()
  return { groupOf, keys: () => keys, watch: () => () => undefined }
}

export { settingsKeys }
