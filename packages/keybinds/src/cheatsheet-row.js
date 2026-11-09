/**
 * A cheatsheet row's contents, as a facet: its label, then each binding as a span of `<kbd>`s, one per display part.
 * Header rows are left as they were made.
 */

/**
 * A header row's key
 * @typedef {Readonly<{ category: string }>} Header
 */

/**
 * @typedef {Readonly<{ label: string }>} Entry
 */

/**
 * @template {Entry} E
 * @typedef {Readonly<{
 *   entryOf: (id: string) => E | undefined,
 *   parts: (entry: E) => readonly (readonly string[])[],
 *   watch: (listener: () => void) => () => void,
 * }>} CheatsheetRowOptions
 */

/**
 * An element with text
 * @param {string} tag - Its tag
 * @param {string} text - Its text
 * @returns {HTMLElement} The element
 */
function made(tag, text) {
  const element = document.createElement(tag)
  element.textContent = text
  return element
}

/**
 * Fills rows
 * @template {Entry} E
 * @param {CheatsheetRowOptions<E>} options - An id's entry; its bindings as display parts; and hearing either change
 * @returns {Readonly<{ apply: (key: string | Header, element: Element) => void,
 *   watch: (listener: () => void) => () => void }>} The facet
 */
function cheatsheetRow({ entryOf, parts, watch }) {
  return {
    apply(key, element) {
      const entry = typeof key === 'string' ? entryOf(key) : undefined
      if (entry === undefined) {
        return
      }
      const bindings = document.createElement('span')
      bindings.append(
        ...parts(entry).map((each) => {
          const binding = document.createElement('span')
          binding.append(...each.map((part) => made('kbd', part)))
          return binding
        }),
      )
      element.replaceChildren(made('span', entry.label), bindings)
    },
    watch: (listener) =>
      watch(() => {
        listener()
      }),
  }
}

export { cheatsheetRow }
