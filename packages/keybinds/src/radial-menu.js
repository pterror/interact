/**
 * <keybinds-radial-menu>: up to eight commands evenly around a circle, so each direction becomes muscle memory. It has
 * no trigger of its own: the app opens it with openAt() and closes it with close().
 *
 * Properties: `commands` (the first eight), `context` (what `when` conditions see), `open`.
 *
 * Events: `command` (detail: { command }) when a command is chosen and run; `close` when it's dismissed.
 *
 * Parts: backdrop, container, spoke, slot, slot-active, slot-disabled, indicator, label. Colors come from
 * --radial-menu-active-color, -inactive-color, -disabled-color, -text-color and -spoke-color.
 */

/**
 * @import { Command, Context } from './command.js'
 * @import { ActiveCommand } from './search.js'
 */

import { isActive } from './command.js'
import { make, styleOf } from './component-dom.js'
import { markKind } from './modal.js'
import { slotForKey } from './radial-keys.js'
import { SLOTS, SVG, placeFrame } from './radial-layout.js'
import { RadialSlots } from './radial-slots.js'

const HALF = 2
const FIRST = 0
const NONE = -1

const STYLE = `@layer keybinds.structure {
  :host { display: none; }
  :host(:where([open])) { display: block; }
  :where(*) { box-sizing: border-box; }
  :where(.radial-menu__backdrop) { position: fixed; inset: 0; z-index: 9998; }
  :where(.radial-menu__container) { position: fixed; z-index: 9999; pointer-events: none; overflow: visible; }
  :where(.radial-menu__slot) { pointer-events: all; cursor: pointer; }
  :where(.radial-menu__slot--disabled) { cursor: default; opacity: 0.35; }
  :where(.radial-menu__indicator) { transition: r 0.1s, fill 0.1s; }
  :where(.radial-menu__label) {
    font: 13px/1.4 system-ui, sans-serif;
    fill: currentColor;
    dominant-baseline: central;
    pointer-events: none;
    user-select: none;
  }
  :where(.radial-menu__spoke) { stroke-width: 1; opacity: 0.25; }
}`

/**
 * The menu's SVG, holding a group for the spokes and one for the slots
 * @returns {Readonly<{ frame: SVGSVGElement, slots: SVGGElement, spokes: SVGGElement }>} The SVG and its groups
 */
function frameOf() {
  const frame = document.createElementNS(SVG, 'svg')
  frame.setAttribute('class', 'radial-menu__container')
  frame.setAttribute('part', 'container')
  const spokes = document.createElementNS(SVG, 'g')
  spokes.setAttribute('class', 'radial-menu__spokes')
  const slots = document.createElementNS(SVG, 'g')
  slots.setAttribute('class', 'radial-menu__slots')
  frame.append(spokes, slots)
  return { frame, slots, spokes }
}

/** A radial menu */
class RadialMenu extends HTMLElement {
  static kind = 'radial-menu'
  static observedAttributes = ['open']

  /** @type {readonly Command[]} */
  #commands = []
  /** @type {Context} */
  #context = {}
  #centre = { x: FIRST, y: FIRST }
  /**
   * @readonly
   * @type {SVGSVGElement}
   */
  #frame
  /**
   * @readonly
   * @type {RadialSlots}
   */
  #slots
  /** @readonly */
  #keys = this.#key.bind(this)

  /** Builds the menu's shadow DOM */
  constructor() {
    super()
    const { frame, slots, spokes } = frameOf()
    this.#frame = frame
    this.#slots = new RadialSlots(spokes, slots, (slot) => {
      this.#execute(slot)
    })
    const backdrop = make('div', { className: 'radial-menu__backdrop', part: 'backdrop' })
    this.attachShadow({ mode: 'open' }).append(styleOf(STYLE), backdrop, frame)
    backdrop.addEventListener('click', () => {
      this.close()
    })
    backdrop.addEventListener('contextmenu', (event) => {
      event.preventDefault()
      this.close()
    })
  }

  /** @returns {void} */
  connectedCallback() {
    markKind(this, 'radial-menu')
  }

  /** @returns {readonly Command[]} The commands in its slots */
  get commands() {
    return this.#commands
  }

  /** @param {readonly Command[]} commands - The commands; it shows the first eight */
  set commands(commands) {
    this.#commands = commands.slice(FIRST, SLOTS)
    this.#refresh()
  }

  /** @returns {Context} What `when` conditions see */
  get context() {
    return this.#context
  }

  /** @param {Context} context - What `when` conditions see */
  set context(context) {
    this.#context = context
    this.#refresh()
  }

  /** @returns {boolean} Whether it's open */
  get open() {
    return this.hasAttribute('open')
  }

  /** @param {boolean} open - Whether it's open */
  set open(open) {
    this.toggleAttribute('open', open)
  }

  /**
   * Follows its `open` attribute
   * @param {string} _name - The attribute, always `open`
   * @param {string | null} _previous - Its value before
   * @param {string | null} value - Its value now
   * @returns {void}
   */
  attributeChangedCallback(_name, _previous, value) {
    if (value === null) {
      document.removeEventListener('keydown', this.#keys)
      return
    }
    this.#slots.reset()
    this.#refresh()
    document.addEventListener('keydown', this.#keys)
  }

  /**
   * Opens it around a point, the viewport's centre if none is given
   * @param {Readonly<{ x?: number, y?: number }>} [point] - Where, in viewport pixels
   * @returns {void}
   */
  openAt(point = {}) {
    const { x, y } = point
    this.#centre =
      x === undefined || y === undefined
        ? { x: globalThis.innerWidth / HALF, y: globalThis.innerHeight / HALF }
        : { x, y }
    this.#show()
    this.open = true
  }

  /**
   * Dismisses it
   * @returns {void}
   */
  close() {
    this.open = false
    this.dispatchEvent(new CustomEvent('close'))
  }

  /**
   * Draws the slots again if it's open
   * @returns {void}
   */
  #refresh() {
    if (this.open) {
      this.#show()
    }
  }

  /**
   * Draws its slots around its centre, for the commands that aren't hidden
   * @returns {void}
   */
  #show() {
    placeFrame(this.#frame, this.#centre)
    /** @type {ActiveCommand[]} */
    const entries = this.#commands
      .filter((command) => command.hidden !== true)
      .map((command) => ({ active: isActive(command, this.#context), command }))
    this.#slots.show(entries)
  }

  /**
   * What a key does while it's open: arrows and Tab choose a slot, Enter runs it, Escape closes the menu
   * @param {KeyboardEvent} event - The key going down
   * @returns {void}
   */
  #key(event) {
    const slot = slotForKey(event, { active: this.#slots.active, filled: this.#slots.entries.length })
    if (slot !== undefined) {
      event.preventDefault()
      this.#slots.choose(slot === NONE ? this.#slots.active : slot)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      this.#execute(this.#slots.active)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      this.close()
    }
  }

  /**
   * Runs the command in a slot, closing first, if it applies
   * @param {number} slot - Which
   * @returns {void}
   */
  #execute(slot) {
    const entry = this.#slots.entries[slot]
    if (entry === undefined || !entry.active) {
      return
    }
    this.close()
    entry.command.execute(this.#context)
    this.dispatchEvent(new CustomEvent('command', { detail: { command: entry.command } }))
  }
}

export { RadialMenu }
