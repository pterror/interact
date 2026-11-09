/**
 * Whether a modifier is held now, alone or with other keys (Alt held during a drag to copy instead of move). It follows
 * the modifier flags every key and pointer event carries, so a press that began before the page had focus, or a
 * release it missed, is caught up by the next event. Listens in the capture phase, so handlers that stop events don't
 * hide them; the window losing focus lets go.
 */

const EVENTS = ['keydown', 'keyup', 'pointerdown', 'pointermove', 'pointerup']
/** @type {Readonly<Record<ModifierHeldOptions['modifier'], 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey'>>} */
const FLAGS = { Alt: 'altKey', Control: 'ctrlKey', Meta: 'metaKey', Shift: 'shiftKey' }

/**
 * @typedef {Readonly<{
 *   modifier: 'Alt' | 'Control' | 'Meta' | 'Shift',
 *   target?: EventTarget,
 * }>} ModifierHeldOptions
 */

/**
 * @typedef {Readonly<{
 *   get: () => boolean,
 *   watch: (listener: () => void) => () => void,
 *   stop: () => void,
 * }>} ModifierHeld
 */

/**
 * Follows whether a modifier is held
 * @param {ModifierHeldOptions} options - The modifier ("Alt", "Control", "Meta" or "Shift"), and where to listen (default
 *   the window)
 * @returns {ModifierHeld} Whether it is held, told when that changes, and stopping
 * @example
 * const alt = modifierHeld({ modifier: 'Alt' })
 * alt.watch(() => label.textContent = alt.get() ? 'Keep both' : 'Move')
 */
function modifierHeld({ modifier, target = globalThis }) {
  const view = target instanceof Node ? (target.ownerDocument?.defaultView ?? target) : target
  /** @type {Set<() => void>} */
  const listeners = new Set()
  let held = false

  /**
   * @param {boolean} now - Whether it is held
   * @returns {void}
   */
  const set = (now) => {
    if (now === held) {
      return
    }
    held = now
    for (const listener of listeners) {
      listener()
    }
  }

  /**
   * @param {Event} event - A key or pointer event
   * @returns {void}
   */
  const onEvent = (event) => {
    if (event instanceof KeyboardEvent && event.key === modifier) {
      set(event.type === 'keydown')
    } else if (event instanceof KeyboardEvent || event instanceof MouseEvent) {
      set(event[FLAGS[modifier]])
    }
  }

  const onBlur = () => {
    set(false)
  }

  for (const type of EVENTS) {
    target.addEventListener(type, onEvent, { capture: true, passive: true })
  }
  view.addEventListener('blur', onBlur)
  return {
    get: () => held,
    stop() {
      for (const type of EVENTS) {
        target.removeEventListener(type, onEvent, true)
      }
      view.removeEventListener('blur', onBlur)
      listeners.clear()
    },
    watch(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

export { modifierHeld }
