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
 *
 * The eight slots start at the top and go clockwise, each a dot with its label beside it. Labels on the right half sit
 * right of their dot, left-aligned; labels on the left half sit left of it, right-aligned; the top and bottom slots go
 * right. Arrows point: up is the top slot, right the right one, and so on, or the nearest filled slot to that when it's
 * empty; Tab and Shift+Tab go round the filled slots. Pointing at a slot only repaints the slots already there:
 * drawing them again would replace the one under the pointer, and a press that began on it would never become a click.
 */

/**
 * @import { ActiveCommand, Command, Context } from './command.js'
 */

import { isActive } from './command.js'
import { make, styleOf } from './component-dom.js'
import { markKind } from './modal.js'

const SVG = 'http://www.w3.org/2000/svg'

/** Always eight slots, so each direction keeps its place */
const SLOTS = 8
const RADIUS = 80
const DOT = 6
const LABEL_GAP = 14
/** Room around the circle for the labels */
const LABEL_ROOM = 160
/** How much bigger than its dot a slot's hit area is */
const HIT_MARGIN = 10
/** How much an active slot's dot grows */
const ACTIVE_GROWTH = 2

const ACTIVE_COLOR = 'var(--radial-menu-active-color, #4f8ef7)'
const INACTIVE_COLOR = 'var(--radial-menu-inactive-color, #888)'
const DISABLED_COLOR = 'var(--radial-menu-disabled-color, #555)'
const TEXT_COLOR = 'var(--radial-menu-text-color, currentColor)'
const SPOKE_COLOR = 'var(--radial-menu-spoke-color, currentColor)'

/**
 * The slot each arrow points at
 * @type {ReadonlyMap<string, number>}
 */
const ARROWS = new Map([
  ['ArrowDown', 4],
  ['ArrowLeft', 6],
  ['ArrowRight', 2],
  ['ArrowUp', 0],
])

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
 * Where a slot is
 * @param {number} slot - Which, 0 at the top
 * @returns {Readonly<{ onRight: boolean, x: number, y: number }>} Its centre, from the menu's, and which side its
 *   label goes
 */
function slotPoint(slot) {
  const angle = (Math.PI * 2 * slot) / SLOTS - Math.PI / 2
  return { onRight: Math.cos(angle) >= 0, x: RADIUS * Math.cos(angle), y: RADIUS * Math.sin(angle) }
}

/**
 * An SVG element with attributes
 * @template {keyof SVGElementTagNameMap} K
 * @param {K} tag - Which element
 * @param {Readonly<Record<string, string | number>>} attributes - Its attributes
 * @returns {SVGElementTagNameMap[K]} The element
 */
function svg(tag, attributes) {
  const element = document.createElementNS(SVG, tag)
  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, String(value))
  }
  return element
}

/**
 * A slot's color: dimmed when its command doesn't apply, highlighted when it's active
 * @param {Readonly<{ enabled: boolean, on: boolean }>} state - Whether it applies, and whether it's active
 * @param {string} otherwise - Its color when it applies and isn't active
 * @returns {string} The color
 */
function colorOf({ enabled, on }, otherwise) {
  if (!enabled) {
    return DISABLED_COLOR
  }
  return on ? ACTIVE_COLOR : otherwise
}

/**
 * Shows on a slot whether it's the active one, and whether its command applies
 * @param {SVGGElement} group - The slot
 * @param {Readonly<{ enabled: boolean, on: boolean }>} state - Whether it applies, and whether it's active
 * @returns {void}
 */
function paintSlot(group, { enabled, on }) {
  const disabled = enabled ? '' : ' radial-menu__slot--disabled'
  group.setAttribute('class', `radial-menu__slot${disabled}${on ? ' radial-menu__slot--active' : ''}`)
  group.setAttribute('part', `slot${on ? ' slot-active' : ''}${enabled ? '' : ' slot-disabled'}`)
  group.querySelector('.radial-menu__indicator')?.setAttribute('r', String(on ? DOT + ACTIVE_GROWTH : DOT))
  group.querySelector('.radial-menu__indicator')?.setAttribute('fill', colorOf({ enabled, on }, INACTIVE_COLOR))
  group.querySelector('.radial-menu__label')?.setAttribute('fill', colorOf({ enabled, on }, TEXT_COLOR))
}

/**
 * The slot a key makes active: the one an arrow points at or the filled slot nearest it, trying clockwise before
 * counter-clockwise at each distance; with Tab the next filled slot round from the active one, or the one before with
 * Shift
 * @param {Readonly<{ key: string, shiftKey: boolean }>} event - The key going down
 * @param {Readonly<{ active: number, filled: number }>} slots - The active slot (-1 for none), and how many are filled
 * @returns {number | undefined} The slot; -1 if the key moves but nothing is filled, undefined if it doesn't move
 */
function slotForKey({ key, shiftKey }, { active, filled }) {
  const target = ARROWS.get(key)
  if (target !== undefined) {
    for (let distance = 0; distance < SLOTS; distance += 1) {
      const clockwise = (target + distance) % SLOTS
      const counter = (target - distance + SLOTS) % SLOTS
      if (clockwise < filled) {
        return clockwise
      }
      if (counter < filled) {
        return counter
      }
    }
    return -1
  }
  if (key !== 'Tab') {
    return undefined
  }
  if (filled === 0) {
    return -1
  }
  const last = filled - 1
  if (shiftKey) {
    return active <= 0 ? last : active - 1
  }
  return active === -1 || active >= last ? 0 : active + 1
}

/** A radial menu */
class RadialMenu extends HTMLElement {
  static kind = 'radial-menu'
  static observedAttributes = ['open']

  /** @type {readonly Command[]} */
  #commands = []
  /** @type {Context} */
  #context = {}
  #centre = { x: 0, y: 0 }
  /** @readonly */
  #frame = document.createElementNS(SVG, 'svg')
  /** @readonly */
  #spokes = document.createElementNS(SVG, 'g')
  /** @readonly */
  #slots = document.createElementNS(SVG, 'g')
  /**
   * The commands in the slots, in order from the top
   * @type {readonly ActiveCommand[]}
   */
  #entries = []
  /** The active slot, -1 for none */
  #active = -1
  /** Whether the pointer, rather than the keys, moved last */
  #pointer = true
  /** @readonly */
  #keys = this.#key.bind(this)
  /** @readonly */
  #pointed = this.#point.bind(this)

  /** Builds the menu's shadow DOM: its SVG, holding a group for the spokes and one for the slots */
  constructor() {
    super()
    this.#frame.setAttribute('class', 'radial-menu__container')
    this.#frame.setAttribute('part', 'container')
    this.#spokes.setAttribute('class', 'radial-menu__spokes')
    this.#slots.setAttribute('class', 'radial-menu__slots')
    this.#frame.append(this.#spokes, this.#slots)
    const backdrop = make('div', { className: 'radial-menu__backdrop', part: 'backdrop' })
    this.attachShadow({ mode: 'open' }).append(styleOf(STYLE), backdrop, this.#frame)
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
    this.#commands = commands.slice(0, SLOTS)
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
   * Follows its `open` attribute; opening starts over with nothing active and the pointer followed
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
    this.#active = -1
    this.#pointer = true
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
      x === undefined || y === undefined ? { x: globalThis.innerWidth / 2, y: globalThis.innerHeight / 2 } : { x, y }
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
   * Places its SVG around its centre, with room for the labels, and draws its slots for the commands that aren't
   * hidden, the first at the top
   * @returns {void}
   */
  #show() {
    const { x, y } = this.#centre
    const pad = RADIUS + LABEL_ROOM
    this.#frame.style.height = `${pad * 2}px`
    this.#frame.style.left = `${x - pad}px`
    this.#frame.style.top = `${y - pad}px`
    this.#frame.style.width = `${pad * 2}px`
    this.#frame.setAttribute('viewBox', `${-pad} ${-pad} ${pad * 2} ${pad * 2}`)
    /** @type {ActiveCommand[]} */
    const entries = this.#commands
      .filter((command) => command.hidden !== true)
      .map((command) => ({ active: isActive(command, this.#context), command }))
    this.#entries = entries
    /** @type {SVGLineElement[]} */
    const spokes = []
    /** @type {SVGGElement[]} */
    const slots = []
    for (let slot = 0; slot < (entries.length > 0 ? SLOTS : 0); slot += 1) {
      const entry = entries[slot]
      const point = slotPoint(slot)
      // The line from the centre to the slot, dimmed when the slot is empty
      spokes.push(
        svg('line', {
          class: 'radial-menu__spoke',
          part: 'spoke',
          stroke: entry === undefined ? DISABLED_COLOR : SPOKE_COLOR,
          x1: 0,
          x2: point.x,
          y1: 0,
          y2: point.y,
        }),
      )
      if (entry !== undefined) {
        slots.push(this.#slotFor(slot, entry))
      }
    }
    this.#spokes.replaceChildren(...spokes)
    this.#slots.replaceChildren(...slots)
  }

  /**
   * A slot holding a command, listening to the pointer: a hit area bigger than its dot, the dot, and the label beside
   * the dot on the side away from the centre
   * @param {number} slot - Which
   * @param {ActiveCommand} entry - Its command, and whether it applies
   * @returns {SVGGElement} The slot
   */
  #slotFor(slot, { active, command }) {
    const { onRight, x, y } = slotPoint(slot)
    const group = svg('g', { 'aria-label': command.label, role: 'menuitem' })
    group.dataset['slot'] = String(slot)
    if (!active) {
      group.setAttribute('aria-disabled', 'true')
    }
    const hit = svg('circle', { cx: x, cy: y, fill: 'transparent' })
    hit.setAttribute('r', String(DOT + HIT_MARGIN))
    const dot = svg('circle', { class: 'radial-menu__indicator', cx: x, cy: y, part: 'indicator' })
    const label = svg('text', {
      class: 'radial-menu__label',
      part: 'label',
      'text-anchor': onRight ? 'start' : 'end',
      x: onRight ? x + DOT + LABEL_GAP : x - DOT - LABEL_GAP,
      y,
    })
    label.textContent = command.label
    group.append(hit, dot, label)
    if (active) {
      group.addEventListener('click', this.#pointed)
    }
    group.addEventListener('mouseenter', this.#pointed)
    group.addEventListener('mouseleave', this.#pointed)
    paintSlot(group, { enabled: active, on: slot === this.#active })
    return group
  }

  /**
   * Hears the pointer on a slot: clicking it, entering and leaving it
   * @param {Event} event - A click, mouseenter or mouseleave on a slot
   * @returns {void}
   */
  #point(event) {
    const slot = event.currentTarget instanceof SVGElement ? Number(event.currentTarget.dataset['slot']) : -1
    if (event.type === 'click') {
      this.#execute(slot)
    } else if (this.#pointer) {
      if (event.type === 'mouseenter') {
        this.#active = slot
      } else if (this.#active === slot) {
        this.#active = -1
      }
      this.#mark()
    }
  }

  /**
   * Shows on each slot whether it's the active one
   * @returns {void}
   */
  #mark() {
    for (const group of this.#slots.querySelectorAll('g')) {
      const slot = Number(group.dataset['slot'])
      paintSlot(group, { enabled: this.#entries[slot]?.active === true, on: slot === this.#active })
    }
  }

  /**
   * What a key does while it's open: arrows and Tab choose a slot, which makes the keys rather than the pointer choose
   * until it opens again; Enter runs it, Escape closes the menu
   * @param {KeyboardEvent} event - The key going down
   * @returns {void}
   */
  #key(event) {
    const slot = slotForKey(event, { active: this.#active, filled: this.#entries.length })
    if (slot !== undefined) {
      event.preventDefault()
      this.#pointer = false
      if (slot !== -1) {
        this.#active = slot
      }
      this.#mark()
    } else if (event.key === 'Enter') {
      event.preventDefault()
      this.#execute(this.#active)
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
    const entry = this.#entries[slot]
    if (entry === undefined || !entry.active) {
      return
    }
    this.close()
    entry.command.execute(this.#context)
    this.dispatchEvent(new CustomEvent('command', { detail: { command: entry.command } }))
  }
}

export { RadialMenu, slotForKey }
