/**
 * The radial menu's layout: eight slots evenly around a circle, starting at the top and going clockwise, each a dot
 * with its label beside it. Labels on the right half sit right of their dot, left-aligned; labels on the left half
 * sit left of it, right-aligned; the top and bottom slots go right.
 */

/** @import { ActiveCommand } from './search.js' */

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
const HALF = 2
const ORIGIN = 0
const QUARTER_TURN = Math.PI / HALF
const TURN = Math.PI * HALF

const ACTIVE_COLOR = 'var(--radial-menu-active-color, #4f8ef7)'
const INACTIVE_COLOR = 'var(--radial-menu-inactive-color, #888)'
const DISABLED_COLOR = 'var(--radial-menu-disabled-color, #555)'
const TEXT_COLOR = 'var(--radial-menu-text-color, currentColor)'
const SPOKE_COLOR = 'var(--radial-menu-spoke-color, currentColor)'

/**
 * Where a slot is
 * @param {number} slot - Which, 0 at the top
 * @returns {Readonly<{ onRight: boolean, x: number, y: number }>} Its centre, from the menu's, and which side its
 *   label goes
 */
function slotPoint(slot) {
  const angle = (TURN * slot) / SLOTS - QUARTER_TURN
  return { onRight: Math.cos(angle) >= ORIGIN, x: RADIUS * Math.cos(angle), y: RADIUS * Math.sin(angle) }
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
 * The line from the centre to a slot, dimmed when the slot is empty
 * @param {number} slot - Which
 * @param {boolean} filled - Whether a command is in it
 * @returns {SVGLineElement} The line
 */
function spokeOf(slot, filled) {
  const { x, y } = slotPoint(slot)
  return svg('line', {
    class: 'radial-menu__spoke',
    part: 'spoke',
    stroke: filled ? SPOKE_COLOR : DISABLED_COLOR,
    x1: ORIGIN,
    x2: x,
    y1: ORIGIN,
    y2: y,
  })
}

/**
 * A slot's label, beside its dot on the side away from the centre
 * @param {Readonly<{ onRight: boolean, x: number, y: number }>} point - Where the slot is
 * @param {string} text - The label
 * @returns {SVGTextElement} The label
 */
function labelAt({ onRight, x, y }, text) {
  const label = svg('text', {
    class: 'radial-menu__label',
    part: 'label',
    'text-anchor': onRight ? 'start' : 'end',
    x: onRight ? x + DOT + LABEL_GAP : x - DOT - LABEL_GAP,
    y,
  })
  label.textContent = text
  return label
}

/**
 * A slot holding a command: a hit area bigger than its dot, the dot, and the label
 * @param {number} slot - Which
 * @param {ActiveCommand} entry - Its command, and whether it applies
 * @returns {SVGGElement} The slot
 */
function slotOf(slot, { active, command }) {
  const point = slotPoint(slot)
  const group = svg('g', { 'aria-label': command.label, role: 'menuitem' })
  group.dataset['slot'] = String(slot)
  if (!active) {
    group.setAttribute('aria-disabled', 'true')
  }
  const hit = svg('circle', { cx: point.x, cy: point.y, fill: 'transparent' })
  hit.setAttribute('r', String(DOT + HIT_MARGIN))
  const dot = svg('circle', { class: 'radial-menu__indicator', cx: point.x, cy: point.y, part: 'indicator' })
  group.append(hit, dot, labelAt(point, command.label))
  return group
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
 * Places the menu's SVG around a point, with room for the labels
 * @param {SVGSVGElement} frame - The SVG
 * @param {Readonly<{ x: number, y: number }>} centre - The point, in viewport pixels
 * @returns {void}
 */
function placeFrame(frame, { x, y }) {
  const pad = RADIUS + LABEL_ROOM
  Object.assign(frame.style, {
    height: `${pad * HALF}px`,
    left: `${x - pad}px`,
    top: `${y - pad}px`,
    width: `${pad * HALF}px`,
  })
  frame.setAttribute('viewBox', `${-pad} ${-pad} ${pad * HALF} ${pad * HALF}`)
}

export { SLOTS, SVG, paintSlot, placeFrame, slotOf, spokeOf }
