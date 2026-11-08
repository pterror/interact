/**
 * Elements in one container, in order, in the page's flow. An element already in place isn't moved.
 */

/**
 * A mount into one container, which holds only what is put there
 * @param {Element} container - The container
 * @returns {Readonly<{ put: (key: unknown, element: Element, before: Element | undefined) => void,
 *   remove: (element: Element) => void }>} The mount
 */
function flowMount(container) {
  return {
    put(_key, element, before) {
      if (before === undefined) {
        if (container.lastChild !== element) {
          container.append(element)
        }
      } else if (element.nextSibling !== before) {
        before.before(element)
      }
    },
    remove(element) {
      element.remove()
    },
  }
}

export { flowMount }
