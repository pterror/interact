/**
 * Elements that take the keyboard while they're open, so bindings don't fire inside them: an open `<dialog>`, an open
 * popover (a menu, a palette, a combobox's list, whoever made it), or any element with `data-keybinds-modal` and
 * `open`, which a page's own overlays can carry. They're found along an event's composed path, inside shadow roots
 * too.
 */

const OVERLAYS = '[data-keybinds-modal][open], dialog[open], :popover-open'

/**
 * Marks a component with its kind, so styles work whatever tag name it was registered under, and whether it takes
 * the keyboard while open
 * @param {HTMLElement} element - The component
 * @param {string} kind - Its kind ("cheatsheet")
 * @param {boolean} [modal] - Whether it takes the keyboard while open (default false)
 * @returns {void}
 */
function markKind(element, kind, modal = false) {
  if (!('keybinds' in element.dataset)) {
    element.dataset['keybinds'] = kind
  }
  if (modal) {
    element.dataset['keybindsModal'] = ''
  }
}

/**
 * Whether something is an element that takes the keyboard while it's open, and is
 * @param {EventTarget} target - Something an event passed through
 * @returns {boolean} Whether it is
 */
function takesKeyboard(target) {
  return typeof Element !== 'undefined' && target instanceof Element && target.matches(OVERLAYS)
}

/**
 * Whether an event happened inside an element whose own keyboard handling takes over while it's open
 * @param {Event} event - The event
 * @returns {boolean} Whether it did
 */
function overlayOpen(event) {
  return event.composedPath().some((target) => takesKeyboard(target))
}

/**
 * The element focus is in, through shadow roots
 * @param {Document} document - The page
 * @returns {Element | undefined} The element, if any
 */
function focusedElement(document) {
  let focused = document.activeElement ?? undefined
  while (focused?.shadowRoot?.activeElement) {
    focused = focused.shadowRoot.activeElement
  }
  return focused
}

/**
 * The element around another in the flat tree: its parent, or the host of the shadow root it's at the top of
 * @param {Element} element - The element
 * @returns {Element | undefined} The one around it, if any
 */
function around(element) {
  const root = element.getRootNode()
  return element.parentElement ?? (root instanceof ShadowRoot ? root.host : undefined)
}

/**
 * Whether focus is inside an element that takes the keyboard while it's open
 * @param {Document} document - The page
 * @returns {boolean} Whether it is
 */
function focusInOverlay(document) {
  for (let element = focusedElement(document); element !== undefined; element = around(element)) {
    if (takesKeyboard(element)) {
      return true
    }
  }
  return false
}

/**
 * Whether such an element is open in the page, or holds focus, for inputs whose events have no target (gamepads)
 * @returns {boolean} Whether one is
 */
function anyOverlayOpen() {
  return typeof document !== 'undefined' && (document.querySelector(OVERLAYS) !== null || focusInOverlay(document))
}

export { anyOverlayOpen, markKind, overlayOpen }
