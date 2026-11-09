/**
 * Handlers bound loosely: found by a press's lookups without modifiers, whatever other modifiers are held, as a
 * game's movement keys are. A binding's own modifiers are still required.
 */

/**
 * @typedef {Readonly<{ run: (event: Event) => boolean | void, when?: () => boolean, typing?: boolean }>} Handler
 */

/**
 * Which modifiers are held, or which a binding needs
 * @typedef {Readonly<{ ctrl: boolean, alt: boolean, shift: boolean, meta: boolean }>} Modifiers
 */

/**
 * A press's lookups without modifiers, best first, and the modifiers held
 * @typedef {Readonly<{ bare: readonly string[], mods: Modifiers }>} Query
 */

/**
 * Whether every modifier a binding needs is held
 * @param {Modifiers} needs - What the binding needs
 * @param {Modifiers} held - What is held
 * @returns {boolean} Whether all of it is
 */
function holdsAll(needs, held) {
  return (
    (!needs.ctrl || held.ctrl) && (!needs.alt || held.alt) && (!needs.shift || held.shift) && (!needs.meta || held.meta)
  )
}

/**
 * A table of handlers by lookup without modifiers
 * @template {Handler} H
 * @param {readonly (readonly [string, Modifiers, H])[]} entries - Each lookup without modifiers, the modifiers the
 *   binding needs, and its handler, in the order bound
 * @returns {(query: Query) => readonly H[]} Every handler bound to the query's lookups whose modifiers are held, each
 *   once, best first
 */
function looseTable(entries) {
  /** @type {Map<string, Readonly<{ mods: Modifiers, handler: H }>[]>} */
  const table = new Map()
  for (const [bare, mods, handler] of entries) {
    const list = table.get(bare)
    if (list === undefined) {
      table.set(bare, [{ handler, mods }])
    } else {
      list.push({ handler, mods })
    }
  }
  return (query) => [
    ...new Set(
      query.bare.flatMap((lookup) =>
        (table.get(lookup) ?? []).filter((each) => holdsAll(each.mods, query.mods)).map((each) => each.handler),
      ),
    ),
  ]
}

export { looseTable }
