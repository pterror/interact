/**
 * Giving focus back: closing the palette, settings or a menu returns focus to where it was (the text being edited,
 * say), before the chosen command runs; the command can still move it elsewhere.
 */

/**
 * The element a node's shadow tree is attached to, if it's in one
 * @param {Element} node - The node
 * @returns {Element | undefined} Its shadow host
 */
function hostOf(node) {
  const root = node.getRootNode()
  return root instanceof ShadowRoot ? root.host : undefined
}

/**
 * Whether an element is inside a component, even in a component's shadow DOM: focus there isn't somewhere to come
 * back to
 * @param {Element} element - Where focus went
 * @returns {boolean} Whether it's in a component
 */
function inComponent(element) {
  /** @type {Element | undefined} */
  let node = element
  while (node !== undefined) {
    if (node.closest('[data-keybinds]') !== null) {
      return true
    }
    node = hostOf(node)
  }
  return false
}

/**
 * Whether focus is lost once an overlay closes: nowhere, on the page itself, or still in the overlay
 * @param {HTMLElement} overlay - The overlay that closed
 * @param {Element | null} now - Where focus is
 * @returns {boolean} Whether it's lost
 */
function lostTo(overlay, now) {
  return (
    now === null ||
    now === document.body ||
    now === overlay ||
    overlay.contains(now) ||
    now.getRootNode() === overlay.shadowRoot
  )
}

/** Where focus was outside the overlays, and putting it back when one closes */
class FocusReturn {
  /**
   * @readonly
   * @type {readonly HTMLElement[]}
   */
  #overlays
  /** @type {HTMLElement | undefined} */
  #last

  /**
   * Starts following focus, and the overlays closing
   * @param {readonly HTMLElement[]} overlays - The palette, settings and menu there are
   */
  constructor(overlays) {
    this.#overlays = overlays
    document.addEventListener('focusin', this, true)
    for (const overlay of overlays) {
      overlay.addEventListener('close', this)
    }
  }

  /**
   * Notes where focus went, or gives it back when an overlay closes
   * @param {Event} event - A focusin, or an overlay's close
   * @returns {void}
   */
  handleEvent(event) {
    const { target } = event
    if (event.type === 'close') {
      const overlay = this.#overlays.find((each) => each === target)
      if (overlay !== undefined && lostTo(overlay, document.activeElement) && this.#last?.isConnected === true) {
        this.#last.focus({ preventScroll: true })
      }
    } else if (target instanceof HTMLElement && !inComponent(target)) {
      this.#last = target
    }
  }

  /**
   * Stops following focus
   * @returns {void}
   */
  stop() {
    document.removeEventListener('focusin', this, true)
    for (const overlay of this.#overlays) {
      overlay.removeEventListener('close', this)
    }
  }
}

export { FocusReturn }
