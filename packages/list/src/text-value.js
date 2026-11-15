/**
 * A text field's value, read, set and heard: heard as the person types (`input`), and as it is set here. A value set on
 * the element directly, which no event announces, isn't heard.
 */

/**
 * The field's value
 * @param {Readonly<{ field: HTMLInputElement }>} options - The field
 * @returns {Readonly<{ get: () => string, set: (value: string) => void, watch: (listener: () => void) => () => void }>}
 *   Its value now; setting it, which its listeners hear; and hearing it change
 */
function textValue({ field }) {
  /** @type {Set<() => void>} */
  const listeners = new Set()
  const tell = () => {
    for (const listener of listeners) {
      listener()
    }
  }
  return {
    get: () => field.value,
    set(value) {
      if (value !== field.value) {
        field.value = value
        tell()
      }
    },
    watch(listener) {
      if (listeners.size === 0) {
        field.addEventListener('input', tell)
      }
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
        if (listeners.size === 0) {
          field.removeEventListener('input', tell)
        }
      }
    },
  }
}

export { textValue }
