/**
 * The tree as it is rendered, across shadow roots and slots: an element in a shadow root is inside the shadow host, and
 * an element assigned to a slot is inside the slot.
 */

/**
 * A node's parent as rendered: the slot it is assigned to, else its parent, else, for a shadow root, its host.
 * @param {Node} node - The node
 * @returns {Node | undefined} Its parent, unless it is the top
 */
function flatParent(node) {
  if (node instanceof Element || node instanceof Text) {
    const slot = node.assignedSlot
    if (slot !== null) {
      return slot
    }
  }
  if (node instanceof ShadowRoot) {
    return node.host
  }
  return node.parentNode ?? undefined
}

/**
 * Whether a node is an ancestor of another, or the node itself, as rendered.
 * @param {Node} ancestor - The possible ancestor
 * @param {Node} node - The node
 * @returns {boolean} Whether it contains it
 */
function flatContains(ancestor, node) {
  /** @type {Node | undefined} */
  let at = node
  while (at !== undefined) {
    if (at === ancestor) {
      return true
    }
    at = flatParent(at)
  }
  return false
}

/**
 * An element's children as rendered: its shadow root's, if it has one; a slot's assigned elements, or its own when
 * nothing is assigned; otherwise its own.
 * @param {Element} element - The element
 * @returns {readonly Element[]} The children
 */
function flatChildren(element) {
  if (element.shadowRoot !== null) {
    return [...element.shadowRoot.children]
  }
  if (element instanceof HTMLSlotElement) {
    const assigned = element.assignedElements({ flatten: true })
    return assigned.length > 0 ? assigned : [...element.children]
  }
  return [...element.children]
}

/**
 * The element focus is on, inside whatever shadow roots it is in.
 * @param {Document} document - The document
 * @returns {Element | undefined} The element, unless focus is nowhere
 */
function deepActiveElement(document) {
  let active = document.activeElement ?? undefined
  let inner = active?.shadowRoot?.activeElement ?? undefined
  while (inner !== undefined) {
    active = inner
    inner = active.shadowRoot?.activeElement ?? undefined
  }
  return active
}

export { deepActiveElement, flatChildren, flatContains, flatParent }
