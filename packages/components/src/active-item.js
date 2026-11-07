/**
 * @import { ListPipeline, RenderRow } from '@interact/core/list-pipeline'
 * @import { ItemSource } from '@interact/core/source'
 * @import { Builder, Effect, EffectType, Extension, Facet, Field, State } from '@interact/core/state'
 */

import { defineEffect, defineFacet, defineField, inputHandler, listFacet, precedence } from '@interact/core'

/**
 * A move of the active item: where to (undefined for nowhere), whether Shift was held (a selection extends by it), and
 * whether focus entering the list put it there rather than the person moving it (a selection that follows the active
 * item doesn't follow that).
 * @typedef {Readonly<{ to: number | undefined, shift: boolean, entering: boolean }>} ActiveMove
 */

/**
 * Where focus entering a list with nothing active may go, as an extension knows it (a selection's first item): a
 * position, at once or later, or undefined to leave it to the next extension.
 * @typedef {(state: State) => number | undefined | Promise<number | undefined>} EntryPoint
 */

/**
 * The active item of one list: where keys act, and what the list names as its active descendant. A position, set by
 * `moved` effects and moving with the list's changes; nothing once its item goes or the list is replaced. It is an
 * extension, and the one every extension acting on the active item is written against, so they share one field:
 * keyboard navigation, typeahead, selection and focus entering are each given it. It keeps the active item rendered
 * (`keep`), so focus never falls out of a list that renders only some rows; it marks the active row (`part="active"`)
 * and names it as the list's `aria-activedescendant` once its item has arrived, by the id some extension gives the
 * row; and a press on a row makes it active, unless an extension before it takes the press. Which items focus passes
 * over (`skip`) and where focus entering goes (`entering`) are facets other extensions give.
 * @template T, R
 * @template {ItemSource<T>} S
 */
class ActiveItem {
  /**
   * Moves the active item.
   * @readonly
   * @type {EffectType<ActiveMove>}
   */
  moved = defineEffect()
  /**
   * Whether focus passes over an item (a menu's separator): true if any extension says so.
   * @readonly
   * @type {Facet<(item: T) => boolean, (item: T) => boolean>}
   */
  skip = defineFacet((inputs) => (item) => inputs.some((skips) => skips(item)))
  /**
   * Where focus entering the list may go while nothing is active, in precedence order: the first that knows decides.
   * @readonly
   * @type {Facet<EntryPoint, readonly EntryPoint[]>}
   */
  entering = listFacet()
  /**
   * @readonly
   * @type {Field<number | undefined>}
   */
  field
  /**
   * @readonly
   * @type {ListPipeline<T, R, S>}
   */
  list
  /**
   * @readonly
   * @type {Extension}
   */
  #parts

  /** @param {ListPipeline<T, R, S>} list - The list */
  constructor(list) {
    this.list = list
    /** @type {Field<number | undefined>} */
    this.field = defineField({
      /** @returns {number | undefined} Nothing active at first */
      create: () => undefined,
      update: (value, transaction) => {
        const moves = transaction.effectsOf(this.moved)
        const last = moves.at(-1)
        if (last !== undefined) {
          return last.to
        }
        return value === undefined ? undefined : list.mapPosition(value, transaction)
      },
    })
    this.#parts = [
      list.extension,
      this.field,
      list.keep.of((state) => {
        const at = state.field(this.field)
        return at === undefined ? [] : [at]
      }),
      list.attributes.of((row, state) =>
        row.kind === 'item' && row.position === state.field(this.field) ? { part: 'active' } : {},
      ),
      list.containerAttributes.of((state) => ({ 'aria-activedescendant': this.descendantIn(state) })),
      precedence(
        'low',
        inputHandler.of((input, store) => {
          if (!input.is(list.press)) {
            return false
          }
          store.dispatch({
            effects: this.moved.of({ entering: false, shift: input.value.shift, to: input.value.position }),
          })
          return true
        }),
      ),
    ]
  }

  /**
   * Puts the active item in a configuration.
   * @param {Builder} into - The configuration being built
   * @param {number} level - Its level
   * @returns {void}
   */
  install(into, level) {
    into.add(this.#parts, level)
  }

  /**
   * Where the active item is in a state.
   * @param {State} state - The state
   * @returns {number | undefined} Its position, if anything is active
   */
  positionIn(state) {
    return state.field(this.field)
  }

  /**
   * The effects that make a position active and show it.
   * @param {number} to - The position
   * @param {Readonly<{ shift?: boolean, entering?: boolean }>} [how] - Whether Shift was held, and whether focus
   *   entering put it there
   * @returns {Effect<unknown>[]} The effects
   */
  go(to, how = {}) {
    const { entering = false, shift = false } = how
    return [this.moved.of({ entering, shift, to }), this.list.reveal.of(to)]
  }

  /**
   * The position nearest `position` that focus can rest on, looking toward `direction` first and then back the other
   * way: never an item `skip` passes over; an item not read yet may be, since nothing is known of it.
   * @param {State} state - The state
   * @param {number} position - Where to start
   * @param {number} direction - Which way to look first: 1 forward, -1 back
   * @returns {number | undefined} The position, if any item can take focus
   */
  landing(state, position, direction) {
    return this.#scan(state, position, direction) ?? this.#scan(state, position - direction, -direction)
  }

  /**
   * The first position from `from` on, stepping by `step`, that focus can rest on.
   * @param {State} state - The state
   * @param {number} from - Where to start
   * @param {number} step - 1 forward, -1 back
   * @returns {number | undefined} The position, if there is one before the end
   */
  #scan(state, from, step) {
    const list = this.list.listOf(state)
    const skip = state.facet(this.skip)
    const count = list.count()
    for (let at = from; at >= 0 && at < count; at += step) {
      const item = readNow(list, at)
      if (item === undefined || !skip(item.item)) {
        return at
      }
    }
    return undefined
  }

  /**
   * The id of the active row, once its item has arrived: the id an extension gives it, which the list names as its
   * active descendant, or a field controlling the list does instead.
   * @param {State} state - The state
   * @returns {string | undefined} The id
   */
  descendantIn(state) {
    const at = state.field(this.field)
    const list = this.list.listOf(state)
    const item = at === undefined ? undefined : readNow(list, at)
    if (at === undefined || item === undefined) {
      return undefined
    }
    /** @type {RenderRow<T>} */
    const row = { item: item.item, key: list.key(item.item), kind: 'item', position: at }
    const { id } = this.list.attributesOf(row, state)
    return typeof id === 'string' ? id : undefined
  }
}

/**
 * The item at a position, if the list gives it at once.
 * @template T
 * @param {ItemSource<T>} list - The list
 * @param {number} position - Where it is
 * @returns {Readonly<{ item: T }> | undefined} The item, unless it comes only later or isn't there
 */
function readNow(list, position) {
  const read = list.read(position, position + 1)
  const [item] = read instanceof Promise ? [] : read
  return item === undefined ? undefined : { item }
}

/**
 * The active item of a list, to give every extension acting on it.
 * @template T, R
 * @template {ItemSource<T>} S
 * @param {ListPipeline<T, R, S>} list - The list
 * @returns {ActiveItem<T, R, S>} Its active item
 */
function active(list) {
  return new ActiveItem(list)
}

export { ActiveItem, active, readNow }
