/** @import { Query } from './query.js' */

import { defineQuery } from './query.js'

/**
 * What typing in a list asks its source: the first position at or after `from` whose item's text starts with `text`,
 * compared as `startsWithTyped` compares, or undefined when none does. Only the source knows every item, so it answers
 * from its own index; a source that doesn't know the query leaves the list to look among the items it renders.
 * @type {Query<Readonly<{ text: string, from: number }>, number | undefined>}
 */
const findPrefix = defineQuery()

export { findPrefix }
