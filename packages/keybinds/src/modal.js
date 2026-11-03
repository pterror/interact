/**
 * Elements that take the keyboard while they're open: an element with `data-keybinds-modal` and `open` keeps
 * bindings from firing inside it. The palette, settings panel and menus mark themselves; a page's own dialogs can too.
 */

const OVERLAYS = '[data-keybinds-modal][open]'

/**
 * Marks a component with its kind, so styles work whatever tag name it was registered under, and whether it takes
 * the keyboard while open
 * @param {HTMLElement} element - The component
 * @param {string} kind - Its kind ("command-palette")
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
 * Whether an event's target is inside an element whose own keyboard handling takes over while it's open
 * @param {EventTarget | null} target - Where the event happened
 * @returns {boolean} Whether it is
 */
function overlayOpen(target) {
  return typeof Element !== 'undefined' && target instanceof Element && target.closest(OVERLAYS) !== null
}

/**
 * Whether any such element is open, for inputs whose events have no target (gamepads)
 * @returns {boolean} Whether one is
 */
function anyOverlayOpen() {
  return typeof document !== 'undefined' && document.querySelector(OVERLAYS) !== null
}

export { anyOverlayOpen, markKind, overlayOpen }
