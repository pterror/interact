/**
 * Handlers bound by lookup, found for a press by every one of its lookups, best first: a handler bound to the first
 * lookup that doesn't apply leaves the press to those bound to later ones (Space with `when: not typing` falls
 * through to `printed`).
 */

/**
 * @typedef {Readonly<{ run: (event: Event) => boolean | void, when?: () => boolean, typing?: boolean }>} Handler
 */

/**
 * A press's lookups, best first
 * @typedef {Readonly<{ exact: readonly string[] }>} Query
 */

/**
 * A table of handlers by lookup
 * @template {Handler} H
 * @param {readonly (readonly [string, H])[]} entries - Each lookup with a handler bound to it, in the order bound
 * @returns {(query: Query) => readonly H[]} Every handler bound to the query's lookups, each once, best first
 */
function bindingTable(entries) {
  /** @type {Map<string, H[]>} */
  const table = new Map()
  for (const [lookup, handler] of entries) {
    const list = table.get(lookup)
    if (list === undefined) {
      table.set(lookup, [handler])
    } else {
      list.push(handler)
    }
  }
  return (query) => [...new Set(query.exact.flatMap((lookup) => table.get(lookup) ?? []))]
}

export { bindingTable }
