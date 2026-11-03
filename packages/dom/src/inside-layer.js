/**
 * What a layer is in the page: the element shown, and the element it is anchored to, if any, which counts as inside
 * it (pressing a menu's button is pressing the menu's own control, not outside it).
 * @typedef {Readonly<{ element: HTMLElement, anchor: () => Element | undefined }>} LayerParts
 */

const FIRST = 0

/**
 * Whether an event's path passes through a node.
 * @param {readonly EventTarget[]} path - The event's composed path
 * @param {Element | undefined} node - The node
 * @returns {boolean} Whether it does
 */
function passesThrough(path, node) {
  return node !== undefined && path.includes(node)
}

/**
 * Whether a press on a modal dialog was on its backdrop: the dialog is the target, but the point is outside its box.
 * @param {Event} event - The press
 * @param {HTMLElement} element - The layer's element
 * @returns {boolean} Whether it was
 */
function onBackdrop(event, element) {
  const target = event.composedPath().at(FIRST)
  if (!(element instanceof HTMLDialogElement) || !(event instanceof MouseEvent) || target !== element) {
    return false
  }
  const box = element.getBoundingClientRect()
  const { clientX: across, clientY: down } = event
  return across < box.left || across > box.right || down < box.top || down > box.bottom
}

/**
 * Whether a press was on a scrollbar of the element it targets, which is scrolling, not pressing outside: inside the
 * element's box, beyond its client area. A scrollbar that takes no room (an overlay scrollbar) leaves no such place.
 * @param {Event} event - The press
 * @returns {boolean} Whether it was
 */
function onScrollbar(event) {
  const target = event.composedPath().at(FIRST)
  if (!(event instanceof MouseEvent) || !(target instanceof Element)) {
    return false
  }
  const root = target === target.ownerDocument.documentElement
  const box = target.getBoundingClientRect()
  const across = event.clientX - (root ? FIRST : box.left + target.clientLeft)
  const down = event.clientY - (root ? FIRST : box.top + target.clientTop)
  const scrolls = target.scrollHeight > target.clientHeight || target.scrollWidth > target.clientWidth
  const within = root || (across < box.width - target.clientLeft && down < box.height - target.clientTop)
  return scrolls && within && (across >= target.clientWidth || down >= target.clientHeight)
}

/**
 * Whether an event happened inside a layer: in its element, unless on a modal dialog's backdrop, or in its anchor.
 * Shadow roots and slots don't hide it: the event's composed path goes through them.
 * @param {Event} event - The event
 * @param {LayerParts} parts - The layer's parts
 * @returns {boolean} Whether it did
 */
function happenedIn(event, parts) {
  const path = event.composedPath()
  const inElement = passesThrough(path, parts.element) && !onBackdrop(event, parts.element)
  return inElement || passesThrough(path, parts.anchor())
}

export { happenedIn, onScrollbar }
