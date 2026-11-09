/**
 * A modifier key pressed and let go on its own: `down` on a fresh press with no other modifier held; `spoiled` when
 * anything else happens while it is held (another key, a click, scrolling), after which nothing counts until it is let
 * go; `up` when let go, with whether the press stayed clean. Listens in the capture phase, so editors that stop events
 * don't hide them; the window losing focus lets go, not clean.
 */

/**
 * @typedef {Readonly<{
 *   modifiers: readonly string[],
 *   target: EventTarget,
 *   down: () => void,
 *   spoiled: () => void,
 *   up: (clean: boolean) => void,
 * }>} ModifierAloneOptions
 */

const MODIFIERS = ['Alt', 'Control', 'Meta', 'Shift']
const SPOILERS = ['pointerdown', 'wheel', 'contextmenu']

/**
 * Follows a modifier on its own
 * @param {ModifierAloneOptions} options - The modifiers ("Control", "Alt", "Shift", "Meta"); where to listen; and
 *   what happens
 * @returns {() => void} Stopping
 */
function modifierAlone({ down, modifiers, spoiled, target, up }) {
  const names = new Set(modifiers.map((name) => name.toLowerCase()))
  const view = target instanceof Node ? (target.ownerDocument?.defaultView ?? target) : target
  let held = false
  let clean = false

  const spoil = () => {
    if (held && clean) {
      clean = false
      spoiled()
    }
  }

  /**
   * @param {Event} event - A key event, or one that spoils a press
   * @returns {void}
   */
  const onEvent = (event) => {
    if (!(event instanceof KeyboardEvent)) {
      spoil()
    } else if (!names.has(event.key.toLowerCase())) {
      if (event.type === 'keydown') {
        spoil()
      }
    } else if (event.type === 'keyup') {
      if (held) {
        held = false
        up(clean)
      }
    } else if (!event.repeat && !held) {
      held = true
      clean = !MODIFIERS.some((name) => !names.has(name.toLowerCase()) && event.getModifierState(name))
      if (clean) {
        down()
      }
    }
  }

  const onBlur = () => {
    if (held) {
      held = false
      clean = false
      up(false)
    }
  }

  for (const type of ['keydown', 'keyup', ...SPOILERS]) {
    target.addEventListener(type, onEvent, { capture: true, passive: true })
  }
  view.addEventListener('blur', onBlur)
  return () => {
    for (const type of ['keydown', 'keyup', ...SPOILERS]) {
      target.removeEventListener(type, onEvent, true)
    }
    view.removeEventListener('blur', onBlur)
  }
}

export { modifierAlone }
