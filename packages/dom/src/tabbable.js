import { flatChildren } from './flat-tree.js'

/**
 * Whether an element is a radio button that Tab skips: one in a named group, unless it is the checked one, or the
 * group has none checked and it is the group's first.
 * @param {HTMLElement} element - The element
 * @returns {boolean} Whether Tab skips it
 */
function skippedRadio(element) {
  if (!(element instanceof HTMLInputElement) || element.type !== 'radio' || element.name === '' || element.checked) {
    return false
  }
  const root = element.form ?? element.getRootNode()
  if (!(root instanceof HTMLFormElement || root instanceof Document || root instanceof ShadowRoot)) {
    return false
  }
  const group = [...root.querySelectorAll(`input[type="radio"][name="${CSS.escape(element.name)}"]`)]
  const checked = group.find((radio) => radio instanceof HTMLInputElement && radio.checked)
  return checked === undefined ? group.at(0) !== element : true
}

/**
 * Whether Tab can stop at an element: it is in the sequential focus order, not disabled, inert or hidden, and not a
 * radio button its group passes over.
 * @param {Element} element - The element
 * @returns {element is HTMLElement} Whether it can
 */
function isTabbable(element) {
  return (
    element instanceof HTMLElement &&
    element.tabIndex >= 0 &&
    !element.matches(':disabled') &&
    element.closest('[inert]') === null &&
    element.checkVisibility({ visibilityProperty: true }) &&
    !skippedRadio(element)
  )
}

/**
 * The elements Tab stops at inside a root, as rendered across shadow roots and slots, in the order Tab visits them:
 * positive `tabindex` first, by value, then the rest in tree order. The root itself is never one: a dialog is a stop
 * in Firefox (`tabIndex` 0), but not one inside itself.
 * @param {Element} root - Where to look
 * @returns {HTMLElement[]} The elements
 */
function tabbables(root) {
  /** @type {HTMLElement[]} */
  const found = []
  /** @type {Element[]} */
  const pending = flatChildren(root).toReversed()
  let next = pending.pop()
  while (next !== undefined) {
    if (isTabbable(next)) {
      found.push(next)
    }
    pending.push(...flatChildren(next).toReversed())
    next = pending.pop()
  }
  const positive = found.filter((element) => element.tabIndex > 0)
  const ordered = positive.toSorted((first, second) => first.tabIndex - second.tabIndex)
  return [...ordered, ...found.filter((element) => element.tabIndex === 0)]
}

/**
 * Whether Tab goes round inside a region instead of moving on: focus is on its last stop going forwards or its first
 * going backwards, or on none of them, or it has none.
 * @param {readonly HTMLElement[]} stops - Where Tab stops in it, in order
 * @param {Element | undefined} active - Where focus is
 * @param {boolean} backwards - Whether Tab goes backwards (Shift+Tab)
 * @returns {boolean} Whether it goes round
 */
function tabWraps(stops, active, backwards) {
  const at = active instanceof HTMLElement ? stops.indexOf(active) : -1
  const edge = backwards ? 0 : stops.length - 1
  return at === -1 || at === edge
}

export { tabWraps, tabbables }
