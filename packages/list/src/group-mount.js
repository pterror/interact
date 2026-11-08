/**
 * Elements inside one `role=group` element per group, in one container. A group's element is made when its first
 * element is put, labelled by the element whose id `labelIdOf` gives, and removed with its last.
 */

/**
 * @template K, G
 * @typedef {Readonly<{ container: Element, groupOf: (key: K) => G, labelIdOf: (group: G) => string }>}
 *   GroupMountOptions
 */

/**
 * A mount into group elements
 * @template K, G
 * @param {GroupMountOptions<K, G>} options - The container, each key's group, and the id of what labels a group
 * @returns {Readonly<{ put: (key: K, element: Element, before: Element | undefined) => void,
 *   remove: (element: Element) => void }>} The mount
 */
function groupMount({ container, groupOf, labelIdOf }) {
  /** @type {Map<G, Element>} */
  const groups = new Map()
  /** @type {WeakMap<Element, G>} */
  const groupOfElement = new WeakMap()

  /**
   * A group's element, made if it has none
   * @param {G} group - The group
   * @returns {Element} Its element
   */
  const elementOf = (group) => {
    const found = groups.get(group)
    if (found !== undefined) {
      return found
    }
    const made = document.createElement('div')
    made.setAttribute('role', 'group')
    made.setAttribute('aria-labelledby', labelIdOf(group))
    groups.set(group, made)
    groupOfElement.set(made, group)
    return made
  }

  /**
   * Removes a group's element once it holds nothing
   * @param {Element | null} parent - Where an element was
   * @returns {void}
   */
  const dropIfEmpty = (parent) => {
    const group = parent === null ? undefined : groupOfElement.get(parent)
    if (parent?.childElementCount === 0 && group !== undefined) {
      groups.delete(group)
      parent.remove()
    }
  }

  return {
    put(key, element, before) {
      const was = element.parentElement
      const group = elementOf(groupOf(key))
      const beforeGroup = before?.parentElement ?? undefined
      if (before !== undefined && beforeGroup === group) {
        if (element.nextSibling !== before) {
          before.before(element)
          dropIfEmpty(was)
        }
        return
      }
      if (group.lastChild !== element) {
        group.append(element)
      }
      if (beforeGroup === undefined) {
        if (container.lastChild !== group) {
          container.append(group)
        }
      } else if (group.nextSibling !== beforeGroup) {
        beforeGroup.before(group)
      }
      if (was !== group) {
        dropIfEmpty(was)
      }
    },
    remove(element) {
      const parent = element.parentElement
      element.remove()
      dropIfEmpty(parent)
    },
  }
}

export { groupMount }
