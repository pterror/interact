/**
 * @import { Selection } from '@interact/core/selection'
 * @import { Source } from '@interact/core/source'
 * @import { Modifiers } from './listbox-keys.js'
 */

import { countSelected, isSelected, spanning, toggle } from '@interact/core'

/**
 * Whether one item at a time is selected, following the active item, or any number, toggled and extended.
 * @typedef {'single' | 'multiple'} SelectionMode
 */

/**
 * What choosing items needs: the source, how many items it has, the items read so far, the selection now, and ways
 * to ask for a new active item and a new selection.
 * @template T, F
 * @typedef {Readonly<{
 *   source: () => Source<T, F> | undefined,
 *   count: () => number,
 *   item: (position: number) => T | undefined,
 *   selection: () => Selection<F>,
 *   requestActive: (position: number) => void,
 *   requestSelection: (next: Selection<F>) => void,
 * }>} Choosing
 */

const NONE = 0
const ONE = 1

/**
 * What pressing, moving and Space do to a selection, in single or multiple mode, from an anchor: the item last chosen
 * without Shift, which Shift selects through from. Selecting by position reads nothing: the source makes a filter.
 * @template T, F
 */
class Chooser {
  /**
   * @readonly
   * @type {SelectionMode}
   */
  mode
  /**
   * @readonly
   * @type {Choosing<T, F>}
   */
  #host
  /** @type {number | undefined} */
  #anchor = undefined

  /**
   * @param {Choosing<T, F>} host - What to choose in
   * @param {SelectionMode} mode - How it selects
   */
  constructor(host, mode) {
    this.#host = host
    this.mode = mode
  }

  /**
   * The item last chosen without Shift, which Shift selects through from, if any.
   * @returns {number | undefined} Its position
   */
  get anchor() {
    return this.#anchor
  }

  /**
   * Forgets the anchor, as when the items are replaced.
   * @returns {void}
   */
  reset() {
    this.#anchor = undefined
  }

  /**
   * Pressing an item: it becomes active, and is selected alone, toggled with the toggle modifier, or selected through
   * from the anchor with Shift; the last two only in multiple mode.
   * @param {number} position - The item pressed
   * @param {Modifiers} modifiers - What was held
   * @returns {void}
   */
  press(position, modifiers) {
    this.#host.requestActive(position)
    if (this.mode === 'multiple' && modifiers.shift) {
      this.#through(this.#anchor ?? position, position)
      return
    }
    if (this.mode === 'multiple' && modifiers.toggle) {
      this.#flip(position)
    } else {
      this.#through(position, position)
    }
    this.#anchor = position
  }

  /**
   * Moving the active item to a position. In single mode it is selected. In multiple mode, moving leaves the
   * selection and the anchor alone, and with `extend` selects everything from the anchor to it: the item last chosen,
   * or, before anything was, the item the move started from.
   * @param {number} position - Where the active item went
   * @param {boolean} extend - Whether Shift was held
   * @param {number} [from] - Where it was, if anywhere
   * @returns {void}
   */
  moved(position, extend, from = position) {
    if (this.mode === 'single') {
      this.#anchor = position
      this.#through(position, position)
    } else if (extend) {
      this.#anchor ??= from
      this.#through(this.#anchor, position)
    }
  }

  /**
   * Space on the active item: toggles it in multiple mode, selects it in single mode.
   * @param {number} position - The active item
   * @returns {void}
   */
  toggle(position) {
    if (this.mode === 'multiple') {
      this.#flip(position)
    } else {
      this.#through(position, position)
    }
    this.#anchor = position
  }

  /**
   * Selects the items from one position through another, either way round, and nothing else; in multiple mode only.
   * @param {number} from - One end
   * @param {number} to - The other end
   * @returns {void}
   */
  span(from, to) {
    if (this.mode === 'multiple') {
      this.#through(from, to)
    }
  }

  /**
   * Selects every item, as one filter, whatever the count.
   * @returns {void}
   */
  all() {
    const source = this.#host.source()
    const count = this.#host.count()
    if (source && count > NONE) {
      this.#host.requestSelection(spanning(source, NONE, count))
    }
  }

  /**
   * Whether the item at a position is selected; false until it has been read.
   * @param {number} position - Where it is
   * @returns {boolean} Whether it is selected
   */
  isSelected(position) {
    const item = this.#host.item(position)
    const source = this.#host.source()
    return item !== undefined && source !== undefined && isSelected(this.#host.selection(), source, item)
  }

  /**
   * How many items are selected, without reading them.
   * @returns {Promise<number>} The count
   */
  async count() {
    const source = this.#host.source()
    return source ? countSelected(this.#host.selection(), source) : NONE
  }

  /**
   * Asks to select the items from one position through another, either way round, and nothing else.
   * @param {number} from - One end
   * @param {number} to - The other end
   * @returns {void}
   */
  #through(from, to) {
    const source = this.#host.source()
    if (source) {
      this.#host.requestSelection(spanning(source, Math.min(from, to), Math.max(from, to) + ONE))
    }
  }

  /**
   * Asks to flip one item's selection, once it has been read; until then nothing happens.
   * @param {number} position - Where the item is
   * @returns {void}
   */
  #flip(position) {
    const item = this.#host.item(position)
    const source = this.#host.source()
    if (item !== undefined && source) {
      this.#host.requestSelection(toggle(this.#host.selection(), source, item))
    }
  }
}

export { Chooser }
