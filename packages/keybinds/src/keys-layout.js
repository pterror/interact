/**
 * Showing physical keys ("slash", "digit1", "bracketleft") as the character they type on the person's own keyboard
 * layout, rather than a US one. Browsers that can tell (Chromium) say so through navigator.keyboard.getLayoutMap();
 * elsewhere keys show as on a US layout.
 * @example
 * const input = keysUI(followLayout()) // follows the layout, and switches with it
 * const fixed = keysUI(layout(await loadLayout())) // shows one layout and nothing more
 */

/** @import { KeySyntax } from './keys.js' */

const DIGITS = 10
const FIRST = 0
const ONE = 1

/** @type {ReadonlyMap<string, string>} */
const PUNCTUATION = new Map([
  ['backquote', 'Backquote'],
  ['backslash', 'Backslash'],
  ['bracketleft', 'BracketLeft'],
  ['bracketright', 'BracketRight'],
  ['comma', 'Comma'],
  ['equal', 'Equal'],
  ['minus', 'Minus'],
  ['period', 'Period'],
  ['quote', 'Quote'],
  ['semicolon', 'Semicolon'],
  ['slash', 'Slash'],
])

/**
 * Physical key names as bindings write them, and as `KeyboardEvent.code` names them
 * @returns {ReadonlyMap<string, string>} The codes, by binding name
 */
function codes() {
  /** @type {Map<string, string>} */
  const all = new Map(PUNCTUATION)
  for (let digit = FIRST; digit < DIGITS; digit += ONE) {
    all.set(`digit${digit}`, `Digit${digit}`)
  }
  return all
}

const CODES = codes()

/**
 * The person's keyboard layout, from the browser
 * @returns {Promise<ReadonlyMap<string, string> | undefined>} What each physical key types, or undefined where the
 *   browser can't tell, or won't here (an iframe without permission, say)
 */
async function loadLayout() {
  const keyboard = 'navigator' in globalThis ? globalThis.navigator.keyboard : undefined
  if (keyboard === undefined) {
    return undefined
  }
  try {
    return await keyboard.getLayoutMap()
  } catch {
    return undefined
  }
}

/**
 * Whether two layouts type the same characters
 * @param {ReadonlyMap<string, string> | undefined} first - One layout
 * @param {ReadonlyMap<string, string> | undefined} second - The other
 * @returns {boolean} Whether they're the same
 */
function sameLayout(first, second) {
  if (first === undefined || second === undefined) {
    return first === second
  }
  if (first.size !== second.size) {
    return false
  }
  for (const [code, typed] of first) {
    if (second.get(code) !== typed) {
      return false
    }
  }
  return true
}

/**
 * How a layout shows a physical key
 * @param {ReadonlyMap<string, string> | undefined} map - The layout
 * @param {string} name - The key's binding name
 * @returns {string | undefined} The character it types, uppercase, if the layout says
 */
function glyphIn(map, name) {
  const code = CODES.get(name)
  return code === undefined ? undefined : map?.get(code)?.toUpperCase()
}

/**
 * For keysUI(layout(map)): shows physical keys as one layout types them
 * @param {ReadonlyMap<string, string>} [map] - The layout, from loadLayout(); none shows keys as on a US
 *   layout
 * @returns {KeySyntax} The layout, as a piece of key syntax
 */
function layout(map) {
  return { glyph: (name) => glyphIn(map, name), name: 'layout' }
}

/** The person's layout, loaded and followed */
class LayoutFollower {
  /** @type {ReadonlyMap<string, string> | undefined} */
  #current
  /**
   * @readonly
   * @type {Set<() => void>}
   */
  #listeners = new Set()

  /**
   * Loads the layout, and looks again when the window gets focus back and when a key types something other than the
   * layout says it should: browsers say nothing when someone switches layouts
   * @param {EventTarget} view - The window to follow
   */
  constructor(view) {
    void this.reload()
    view.addEventListener('focus', this)
    view.addEventListener('keydown', this, { capture: true, passive: true })
  }

  /**
   * Hears the window's focus and its keys
   * @param {Event} event - A focus or keydown
   * @returns {void}
   */
  handleEvent(event) {
    if (event instanceof KeyboardEvent) {
      this.#check(event)
    } else {
      void this.reload()
    }
  }

  /**
   * Looks again if a plain key typed something other than the layout says it should
   * @param {KeyboardEvent} event - The keydown
   * @returns {void}
   */
  #check(event) {
    const current = this.#current
    const modified = event.ctrlKey || event.altKey || event.metaKey || event.shiftKey
    if (current === undefined || modified || !/^.$/su.test(event.key)) {
      return
    }
    const said = current.get(event.code)
    if (said !== undefined && said !== event.key.toLowerCase()) {
      void this.reload()
    }
  }

  /** @returns {Promise<void>} When the layout is loaded, and anyone watching heard if it changed */
  async reload() {
    const next = await loadLayout()
    if (sameLayout(next, this.#current)) {
      return
    }
    this.#current = next
    for (const listener of this.#listeners) {
      listener()
    }
  }

  /**
   * How the layout shows a physical key
   * @param {string} name - The key's binding name
   * @returns {string | undefined} The character it types, uppercase, if the layout says
   */
  glyph(name) {
    return glyphIn(this.#current, name)
  }

  /**
   * Follows the layout changing
   * @param {() => void} onChange - Called when it does
   * @returns {() => void} A function that stops
   */
  watch(onChange) {
    this.#listeners.add(onChange)
    return () => {
      this.#listeners.delete(onChange)
    }
  }
}

/**
 * For keysUI(followLayout()): shows physical keys as the person's layout types them, following them switching
 * layouts. Components showing bindings update when it changes
 * @param {EventTarget} [view] - The window to follow (default: the global one)
 * @returns {KeySyntax} The layout, as a piece of key syntax that can change
 */
function followLayout(view = globalThis) {
  const follower = new LayoutFollower(view)
  return {
    glyph: (name) => follower.glyph(name),
    name: 'layout',
    watch: (onChange) => follower.watch(onChange),
  }
}

export { followLayout, layout, loadLayout }
