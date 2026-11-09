/**
 * The keyboard as presses: a key going down is a press known by its physical key (`event.code`), its auto-repeat
 * goes on with it, and its coming up ends it. A modifier key on its own never presses (Shift, to type "G", mustn't
 * break off a sequence). When the window loses focus every held key is released: its keyup would go elsewhere.
 */

import { keyQuery } from './key-parse.js'

/**
 * @typedef {Readonly<{ ctrl: boolean, alt: boolean, shift: boolean, meta: boolean }>} Modifiers
 */

/**
 * A key event's lookups, best first; the same without modifiers; and the modifiers held
 * @typedef {Readonly<{ exact: readonly string[], bare: readonly string[], mods: Modifiers }>} Query
 */

/**
 * @typedef {Readonly<{ id: string, query: Query, event: Event, typing: boolean, repeat: boolean }>} Press
 */

/**
 * @typedef {Readonly<{ id: string, event: Event, typing: boolean, blocked: boolean }>} Release
 */

/**
 * Where presses go; what `down` gives back isn't read here
 * @typedef {Readonly<{ down: (press: Press) => unknown, up: (release: Release) => void }>} Sink
 */

/**
 * @template T
 * @typedef {Readonly<{ has: (value: T) => boolean, watch: (listener: (values?: readonly T[]) => void) => () => void }>}
 *   Test
 */

/**
 * @typedef {Readonly<{
 *   target: EventTarget,
 *   to: Sink,
 *   capture?: boolean,
 *   blocked?: (event: Event) => boolean,
 *   query?: (event: KeyboardEvent) => Query,
 * }>} KeyListenOptions
 */

/**
 * A key that is down: what releases it if its keyup never comes, its lookups without modifiers, and whether it went
 * down where text is typed
 * @typedef {Readonly<{ code: string, key: string, bare: readonly string[], typing: boolean }>} Down
 */

/** @type {ReadonlySet<string>} */
const MODIFIER_KEYS = new Set(['Alt', 'Control', 'Meta', 'Shift'])

/**
 * Whether an event happened where text is typed: a field or an editable element, inside an open shadow root too
 * @param {Event} event - The event
 * @returns {boolean} Whether it did
 */
function isTyping(event) {
  const [target = event.target] = event.composedPath()
  return (
    target instanceof Element &&
    (target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      (target instanceof HTMLElement && target.isContentEditable))
  )
}

/**
 * The window a target is in, which hears it lose focus; a target outside any document is its own
 * @param {EventTarget} target - Where keys are listened to
 * @returns {EventTarget} Its window
 */
function windowOf(target) {
  return target instanceof Node ? (target.ownerDocument?.defaultView ?? target) : target
}

/**
 * Listens to the keyboard. `held` holds for a lookup (without modifiers: "a", "keya") while a key it names is down,
 * pressed where text isn't typed and not inside an overlay
 * @param {KeyListenOptions} options - Where to listen; where presses go; whether in the capture phase; which events
 *   to leave alone (default none); and what a key event is looked up by (default keyQuery without syntax)
 * @returns {Readonly<{ held: Test<string>, stop: () => void }>} The keys held, and stopping
 */
function keyListen({ blocked = () => false, capture = false, query = keyQuery, target, to }) {
  /** @type {Map<string, Down>} */
  const down = new Map()
  /** @type {Set<(values?: readonly string[]) => void>} */
  const listeners = new Set()
  const frame = windowOf(target)

  /**
   * Tells listeners which lookups changed
   * @param {Down | undefined} changed - The key that went down or came up
   * @returns {void}
   */
  const tell = (changed) => {
    if (changed !== undefined && !changed.typing) {
      for (const listener of listeners) {
        listener(changed.bare)
      }
    }
  }

  /**
   * @param {Event} event - A keydown
   * @returns {void}
   */
  const onDown = (event) => {
    if (!(event instanceof KeyboardEvent) || MODIFIER_KEYS.has(event.key) || blocked(event)) {
      return
    }
    const id = event.code === '' ? event.key : event.code
    const repeat = event.repeat && down.has(id)
    const typing = isTyping(event)
    const asked = query(event)
    if (!repeat) {
      const replaced = down.get(id)
      const going = { bare: asked.bare, code: event.code, key: event.key, typing }
      down.set(id, going)
      tell(replaced)
      tell(going)
    }
    to.down({ event, id, query: asked, repeat, typing })
  }

  /**
   * @param {Event} event - A keyup
   * @returns {void}
   */
  const onUp = (event) => {
    if (!(event instanceof KeyboardEvent)) {
      return
    }
    const id = event.code === '' ? event.key : event.code
    const ended = down.get(id)
    if (ended !== undefined) {
      down.delete(id)
      tell(ended)
      to.up({ blocked: blocked(event), event, id, typing: isTyping(event) })
    }
  }

  const onBlur = () => {
    const ended = [...down]
    down.clear()
    for (const [id, each] of ended) {
      tell(each)
      to.up({
        blocked: false,
        event: new KeyboardEvent('keyup', { cancelable: true, code: each.code, key: each.key }),
        id,
        typing: false,
      })
    }
  }

  target.addEventListener('keydown', onDown, { capture })
  target.addEventListener('keyup', onUp, { capture })
  frame.addEventListener('blur', onBlur)

  return {
    held: {
      has: (lookup) => [...down.values()].some((each) => !each.typing && each.bare.includes(lookup)),
      watch(listener) {
        listeners.add(listener)
        return () => {
          listeners.delete(listener)
        }
      },
    },
    stop() {
      target.removeEventListener('keydown', onDown, { capture })
      target.removeEventListener('keyup', onUp, { capture })
      frame.removeEventListener('blur', onBlur)
      down.clear()
      for (const listener of listeners) {
        listener()
      }
    },
  }
}

export { keyListen }
