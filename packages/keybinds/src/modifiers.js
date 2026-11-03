/**
 * Holding a modifier on its own, or tapping it, as a trigger (the cheatsheet opens this way).
 */

import { windowOf } from './input.js'

/**
 * What a modifier on its own does: `down` is a fresh press (not the key's auto-repeat) with no other modifier held;
 * `spoiled` is anything else happening while it's held (another key, a click, scrolling), after which nothing counts
 * until it's let go; `up` is it being let go, with whether the press stayed clean
 * @typedef {Readonly<{ down: () => void, spoiled: () => void, up: (clean: boolean) => void }>} ModifierEvents
 */

/**
 * Where to listen for a modifier, how long a hold takes, and how many taps in how long
 * @typedef {Readonly<{ count?: number, delay?: number, target?: EventTarget, within?: number }>} ModifierOptions
 */

const MODIFIERS = ['Alt', 'Control', 'Meta', 'Shift']
const SPOILERS = ['pointerdown', 'wheel', 'contextmenu']
const DEFAULT_DELAY = 200
const DEFAULT_WITHIN = 400
const DEFAULT_COUNT = 2

/**
 * Follows a modifier being pressed and let go on its own. Listens in the capture phase, so editors that stop events
 * don't hide them
 */
class ModifierWatch {
  /**
   * @readonly
   * @type {ReadonlySet<string>}
   */
  #modifiers
  /**
   * @readonly
   * @type {EventTarget}
   */
  #target
  /**
   * @readonly
   * @type {EventTarget}
   */
  #window
  /**
   * @readonly
   * @type {ModifierEvents}
   */
  #on
  #held = false
  #clean = false

  /**
   * Starts following
   * @param {string | readonly string[]} modifiers - The modifier or modifiers: "Control", "Alt", "Shift", "Meta"
   * @param {EventTarget} target - Where to listen
   * @param {ModifierEvents} on - What happens
   */
  constructor(modifiers, target, on) {
    this.#modifiers = new Set(
      (typeof modifiers === 'string' ? [modifiers] : modifiers).map((name) => name.toLowerCase()),
    )
    this.#target = target
    this.#window = windowOf(target)
    this.#on = on
    target.addEventListener('keydown', this, true)
    target.addEventListener('keyup', this, true)
    for (const type of SPOILERS) {
      target.addEventListener(type, this, { capture: true, passive: true })
    }
    this.#window.addEventListener('blur', this)
  }

  /**
   * Hears keys, whatever spoils a press, and the window losing focus
   * @param {Event} event - The event
   * @returns {void}
   */
  handleEvent(event) {
    if (event.type === 'blur') {
      this.#blur()
    } else if (!(event instanceof KeyboardEvent)) {
      this.#spoil()
    } else if (!this.#modifiers.has(event.key.toLowerCase())) {
      this.#other(event)
    } else if (event.type === 'keyup') {
      this.#up()
    } else {
      this.#down(event)
    }
  }

  /**
   * One of the modifiers went down. Other modifiers already down (Shift, then Control) make it a chord, not a press
   * on its own
   * @param {KeyboardEvent} event - The keydown
   * @returns {void}
   */
  #down(event) {
    if (event.repeat || this.#held) {
      return
    }
    this.#held = true
    this.#clean = !MODIFIERS.some((name) => !this.#modifiers.has(name.toLowerCase()) && event.getModifierState(name))
    if (this.#clean) {
      this.#on.down()
    }
  }

  /** @returns {void} */
  #up() {
    if (this.#held) {
      this.#held = false
      this.#on.up(this.#clean)
    }
  }

  /**
   * Another key, which spoils a press going down but not a key going up
   * @param {KeyboardEvent} event - The key event
   * @returns {void}
   */
  #other(event) {
    if (event.type === 'keydown') {
      this.#spoil()
    }
  }

  /** @returns {void} */
  #spoil() {
    if (this.#held && this.#clean) {
      this.#clean = false
      this.#on.spoiled()
    }
  }

  /** @returns {void} */
  #blur() {
    if (this.#held) {
      this.#held = false
      this.#clean = false
      this.#on.up(false)
    }
  }

  /** @returns {void} */
  stop() {
    this.#target.removeEventListener('keydown', this, true)
    this.#target.removeEventListener('keyup', this, true)
    for (const type of SPOILERS) {
      this.#target.removeEventListener(type, this, true)
    }
    this.#window.removeEventListener('blur', this)
  }
}

/**
 * Calls back when a modifier is held on its own for a while, and again when it's let go
 * @example
 *   const stop = onModifierHold('Control', (held) => {
 *     cheatsheet.open = held
 *   }, { delay: 300 })
 * @param {string | readonly string[]} modifiers - The modifier or modifiers: "Control", "Alt", "Shift", "Meta"
 * @param {(held: boolean) => void} onHeld - Called with true once it's been held `delay` ms, false when let go
 * @param {ModifierOptions} [options] - `delay` in ms (default 200), and where to listen (default the window)
 * @returns {() => void} A function that stops
 */
function onModifierHold(modifiers, onHeld, options = {}) {
  const { delay = DEFAULT_DELAY, target = globalThis } = options
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let timer = undefined
  let held = false
  /** @returns {void} */
  function letGo() {
    clearTimeout(timer)
    timer = undefined
    if (held) {
      held = false
      onHeld(false)
    }
  }
  const watch = new ModifierWatch(modifiers, target, {
    down: () => {
      letGo()
      timer = setTimeout(() => {
        timer = undefined
        held = true
        onHeld(true)
      }, delay)
    },
    spoiled: letGo,
    up: letGo,
  })
  return () => {
    watch.stop()
    clearTimeout(timer)
  }
}

/**
 * Calls back when a modifier is tapped (pressed and let go on its own) `count` times in quick succession, as in
 * double-tapping Shift
 * @example
 *   onModifierTaps('Control', () => {
 *     cheatsheet.open = !cheatsheet.open
 *   })
 * @param {string | readonly string[]} modifiers - The modifier or modifiers: "Control", "Alt", "Shift", "Meta"
 * @param {() => void} onTaps - Called once they've happened
 * @param {ModifierOptions} [options] - `count`: taps in a row (default 2); `within`: most ms from one tap's press to
 *   the next tap's release (default 400); and where to listen (default the window)
 * @returns {() => void} A function that stops
 */
function onModifierTaps(modifiers, onTaps, options = {}) {
  const { count = DEFAULT_COUNT, target = globalThis, within = DEFAULT_WITHIN } = options
  /** @type {readonly number[]} */
  let taps = []
  let pressed = performance.now()
  const watch = new ModifierWatch(modifiers, target, {
    down: () => {
      pressed = performance.now()
    },
    spoiled: () => {
      taps = []
    },
    up: (clean) => {
      const now = performance.now()
      taps = clean && now - pressed <= within ? [...taps.filter((tap) => now - tap <= within * count), now] : []
      if (taps.length >= count) {
        taps = []
        onTaps()
      }
    },
  })
  return () => {
    watch.stop()
  }
}

export { onModifierHold, onModifierTaps }
