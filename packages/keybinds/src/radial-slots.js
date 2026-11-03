/**
 * The radial menu's slots: drawn for the commands it shows, which one is active, and what the pointer does to them.
 * Pointing at a slot only repaints the slots already there: drawing them again would replace the one under the
 * pointer, and a press that began on it would never become a click.
 */

/** @import { ActiveCommand } from './search.js' */

import { SLOTS, paintSlot, slotOf, spokeOf } from './radial-layout.js'

const NONE = -1
const FIRST = 0
const NEXT = 1

/** A radial menu's slots, and which is active */
class RadialSlots {
  /**
   * @readonly
   * @type {SVGGElement}
   */
  #spokes
  /**
   * @readonly
   * @type {SVGGElement}
   */
  #slots
  /**
   * @readonly
   * @type {(slot: number) => void}
   */
  #choose
  /** @type {readonly ActiveCommand[]} */
  #entries = []
  #active = NONE
  /** Whether the pointer, rather than the keys, moved last */
  #pointer = true

  /**
   * Slots drawn into two SVG groups
   * @param {SVGGElement} spokes - Where the spokes go
   * @param {SVGGElement} slots - Where the slots go
   * @param {(slot: number) => void} choose - Runs the command in a slot
   */
  constructor(spokes, slots, choose) {
    this.#spokes = spokes
    this.#slots = slots
    this.#choose = choose
  }

  /** @returns {readonly ActiveCommand[]} The commands in the slots, in order from the top */
  get entries() {
    return this.#entries
  }

  /** @returns {number} The active slot, -1 for none */
  get active() {
    return this.#active
  }

  /**
   * Draws the slots for some commands, the first at the top
   * @param {readonly ActiveCommand[]} entries - The commands, and whether each applies
   * @returns {void}
   */
  show(entries) {
    this.#entries = entries
    /** @type {SVGLineElement[]} */
    const spokes = []
    /** @type {SVGGElement[]} */
    const slots = []
    for (let slot = FIRST; slot < (entries.length > FIRST ? SLOTS : FIRST); slot += NEXT) {
      const entry = entries[slot]
      spokes.push(spokeOf(slot, entry !== undefined))
      if (entry !== undefined) {
        slots.push(this.#slotFor(slot, entry))
      }
    }
    this.#spokes.replaceChildren(...spokes)
    this.#slots.replaceChildren(...slots)
  }

  /**
   * Makes a slot active from the keys; the pointer is ignored from then on, until reset
   * @param {number} slot - Which
   * @returns {void}
   */
  choose(slot) {
    this.#pointer = false
    this.#active = slot
    this.#mark()
  }

  /**
   * Starts over as on opening: nothing active, the pointer followed
   * @returns {void}
   */
  reset() {
    this.#active = NONE
    this.#pointer = true
  }

  /**
   * Hears the pointer on a slot: clicking it, entering and leaving it
   * @param {Event} event - A click, mouseenter or mouseleave on a slot
   * @returns {void}
   */
  handleEvent(event) {
    const slot = event.currentTarget instanceof SVGElement ? Number(event.currentTarget.dataset['slot']) : NONE
    if (event.type === 'click') {
      this.#choose(slot)
    } else if (this.#pointer) {
      if (event.type === 'mouseenter') {
        this.#active = slot
      } else if (this.#active === slot) {
        this.#active = NONE
      }
      this.#mark()
    }
  }

  /**
   * A slot for a command, listening to the pointer
   * @param {number} slot - Which
   * @param {ActiveCommand} entry - Its command, and whether it applies
   * @returns {SVGGElement} The slot
   */
  #slotFor(slot, entry) {
    const group = slotOf(slot, entry)
    if (entry.active) {
      group.addEventListener('click', this)
    }
    group.addEventListener('mouseenter', this)
    group.addEventListener('mouseleave', this)
    paintSlot(group, { enabled: entry.active, on: slot === this.#active })
    return group
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
}

export { RadialSlots }
