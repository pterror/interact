/**
 * Ids drawn under a header row per category, as render draws them with groupMount: each header's key and row (a
 * `role=presentation` element with the category as its text and an id that labels its group), and the group of each
 * key drawn.
 */

import { withHeaders } from '@pterror/interact-list'

/** @typedef {Readonly<{ category: string }>} Header */

/**
 * @typedef {Readonly<{
 *   drawn: Readonly<{ keys: () => readonly string[], watch: (listener: () => void) => () => void }>,
 *   categoryOf: (id: string) => string,
 *   prefix: string,
 * }>} CategoryHeadersOptions
 */

/**
 * Headers over ids grouped by category
 * @param {CategoryHeadersOptions} options - The ids, those of a category together; each id's category; and what
 *   the headers' element ids start with, unique in the page
 * @returns {Readonly<{
 *   drawn: Readonly<{ keys: () => readonly (string | Header)[], watch: (listener: () => void) => () => void }>,
 *   groupOf: (key: string | Header) => string,
 *   labelIdOf: (category: string) => string,
 *   header: (key: string | Header) => Element | undefined,
 * }>} The ids with headers; each key's category; the id of a category's header row; and a header key's row (none
 *   for an id)
 */
function categoryHeaders({ categoryOf, drawn, prefix }) {
  /** @type {Map<string, Readonly<{ header: Header, id: string }>>} */
  const headers = new Map()
  /**
   * A category's header, made the first time
   * @param {string} category - The category
   * @returns {Readonly<{ header: Header, id: string }>} Its key, and its row's id
   */
  const headerOf = (category) => {
    const known = headers.get(category) ?? { header: { category }, id: `${prefix}-${String(headers.size)}` }
    headers.set(category, known)
    return known
  }
  /** @type {(key: string | Header) => string} */
  const groupOf = (key) => (typeof key === 'string' ? categoryOf(key) : key.category)
  return {
    drawn: withHeaders({ drawn, groupOf, headerOf: (category) => headerOf(category).header }),
    groupOf,
    header(key) {
      if (typeof key === 'string') {
        return undefined
      }
      const row = document.createElement('div')
      row.id = headerOf(key.category).id
      row.setAttribute('role', 'presentation')
      row.textContent = key.category
      return row
    },
    labelIdOf: (category) => headerOf(category).id,
  }
}

export { categoryHeaders }
