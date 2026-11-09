/**
 * The overlay rule: an open element that takes the keyboard (an open `<dialog>`, an open popover, or any element with
 * `data-keybinds-modal` and `open`) keeps events inside it from listeners outside it. It is found along the event's
 * composed path, inside shadow roots too. A listener on such an element, or inside it, is its own keyboard handling,
 * and hears them: a menu level's keys, bound on the level.
 */

const OVERLAYS = '[data-keybinds-modal][open], dialog[open], :popover-open'

/**
 * Whether events are kept from a listener by an overlay they happened in
 * @param {EventTarget} listener - Where the listener listens
 * @returns {(event: Event) => boolean} Whether an open overlay lies between an event's target and the listener
 */
function outsideOverlay(listener) {
  return (event) => {
    const path = event.composedPath()
    const at = path.indexOf(listener)
    return (at === -1 ? path : path.slice(0, at)).some((each) => each instanceof Element && each.matches(OVERLAYS))
  }
}

/**
 * The overlay rule for input that has no event target of its own (gamepads, axes), judged by where focus is
 * @param {EventTarget} listener - Where the listener listens
 * @returns {() => boolean} Whether an open overlay lies between the focused element and the listener
 */
function focusInOverlay(listener) {
  return () => {
    let focused = ((listener instanceof Node ? listener.ownerDocument : undefined) ?? globalThis.document).activeElement
    while (focused?.shadowRoot?.activeElement) {
      focused = focused.shadowRoot.activeElement
    }
    /** @type {Node | null | undefined} */
    let node = focused
    for (; node && node !== listener; node = node instanceof ShadowRoot ? node.host : node.parentNode) {
      if (node instanceof Element && node.matches(OVERLAYS)) {
        return true
      }
    }
    return false
  }
}

export { focusInOverlay, outsideOverlay }
