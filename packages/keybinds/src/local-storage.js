/**
 * A storage for bindingStore() in localStorage, under one key. What is stored is read leniently: anything that isn't a
 * list of bindings in a field an override sets is left out. Storage that can't be read or written (private browsing,
 * a full quota) reads as no overrides, and overrides set then still apply until the page reloads. Another tab saving
 * is heard.
 */

/**
 * @typedef {Readonly<{ keys?: readonly string[], mouse?: readonly string[], pad?: readonly string[],
 *   axes?: readonly string[] }>} Override
 */

/** @typedef {Readonly<Record<string, Override>>} Overrides */

/** @type {readonly (keyof Override)[]} */
const FIELDS = ['axes', 'keys', 'mouse', 'pad']

/**
 * Whether a value is a list of strings
 * @param {unknown} value - The value
 * @returns {value is readonly string[]} Whether it is
 */
function isStrings(value) {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

/**
 * A field something parsed has of its own
 * @param {object} parsed - What was parsed
 * @param {string} field - The field
 * @returns {unknown} Its value, or undefined if it has none
 */
function ownField(parsed, field) {
  return Object.hasOwn(parsed, field) ? Reflect.get(parsed, field) : undefined
}

/**
 * Overrides as stored
 * @param {string | null} text - The JSON stored, if any
 * @returns {Overrides} The overrides; none if the text isn't an object of them
 */
function parse(text) {
  try {
    /** @type {unknown} */
    const parsed = JSON.parse(text ?? '{}')
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return {}
    }
    return Object.fromEntries(
      Object.keys(parsed).map((id) => {
        const stored = ownField(parsed, id)
        const fields =
          typeof stored === 'object' && stored !== null
            ? FIELDS.flatMap((field) => {
                const value = ownField(stored, field)
                return isStrings(value) ? [[field, value]] : []
              })
            : []
        return [id, Object.fromEntries(fields)]
      }),
    )
  } catch {
    return {}
  }
}

/**
 * Overrides kept in localStorage
 * @param {string} key - The key they are kept under
 * @param {EventTarget} [view] - The window whose storage events say another tab saved (default the global one)
 * @returns {Readonly<{ load: () => Overrides, save: (overrides: Overrides) => void,
 *   subscribe: (listener: (overrides: Overrides) => void) => () => void }>} The storage
 */
function localStorageBindings(key, view = globalThis) {
  const read = () => {
    try {
      return parse(localStorage.getItem(key))
    } catch {
      return {}
    }
  }
  return {
    load: read,
    save(overrides) {
      try {
        localStorage.setItem(key, JSON.stringify(overrides))
      } catch {
        // The overrides still apply in this page; they just aren't kept
      }
    },
    subscribe(listener) {
      /**
       * @param {Event} event - A storage event
       * @returns {void}
       */
      const heard = (event) => {
        const changed = 'key' in event ? event.key : undefined
        if (changed === key || changed === null) {
          listener(read())
        }
      }
      view.addEventListener('storage', heard)
      return () => {
        view.removeEventListener('storage', heard)
      }
    },
  }
}

export { localStorageBindings }
