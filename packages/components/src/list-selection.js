/**
 * @import { KeyInput } from '@interact/core/inputs'
 * @import { Press } from '@interact/core/list-pipeline'
 * @import { Selection } from '@interact/core/selection'
 * @import { Source } from '@interact/core/source'
 * @import { Builder, Effect, EffectType, Extension, Field, State } from '@interact/core/state'
 * @import { Store } from '@interact/core/store'
 * @import { ActiveItem, ActiveMove } from './active-item.js'
 */

import {
  countSelected,
  defineEffect,
  defineField,
  findsSelected,
  firstSelected,
  inputHandler,
  isSelected,
  keyInput,
  nothing,
  precedence,
  spanning,
  toggle,
  transactionFilter,
} from '@interact/core'

import { readNow } from './active-item.js'

/**
 * Whether one item at a time is selected, following the active item, or any number, toggled and extended.
 * @typedef {'single' | 'multiple'} SelectionMode
 */

/**
 * What is selected, and the anchor: the item last chosen without Shift, which Shift selects through from.
 * @template F
 * @typedef {Readonly<{ selection: Selection<F>, anchor: number | undefined }>} Chosen
 */

/**
 * Selection in a list, as the WAI-ARIA Authoring Practices listbox pattern has it. In single mode the selected item
 * follows the active one, in the same transaction that moves it (unless focus entering moved it), and Space selects
 * it. In multiple mode, pressing an item selects it alone, with the toggle modifier toggles it, and with Shift selects
 * from the anchor through it; Space toggles the active item; Shift with a move or with Space selects from the anchor
 * through the active item (a Shift move before anything was chosen starts from where it started); the toggle modifier
 * with Shift and Home or End selects from the active item to the first or last and goes there; the toggle modifier
 * with A selects everything. A selection is the source's filter plus exceptions, so selecting by position reads
 * nothing; it starts over when the source does. Rows say whether they are selected (`aria-selected`, `part="selected"`)
 * and the list whether it selects several (`aria-multiselectable`). An app owns the selection with
 * `controlled(selection.selected, ...)`, given after this extension. Focus entering a list with nothing active goes
 * to the first selected item when the source can place it, else to the item last chosen.
 *
 * It selects in the source itself, so the list stage must keep the source as the list; a step that makes another list
 * is an error when it selects (see docs/design.md, Open).
 * @template T, R, F
 * @template {Source<T, F>} S
 */
class ListSelection {
  /**
   * Sets what is selected.
   * @readonly
   * @type {EffectType<Selection<F>>}
   */
  selected = defineEffect()
  /**
   * Sets the anchor.
   * @readonly
   * @type {EffectType<number | undefined>}
   */
  anchored = defineEffect()
  /**
   * @readonly
   * @type {SelectionMode}
   */
  mode
  /**
   * @readonly
   * @type {Field<Chosen<F>>}
   */
  field
  /**
   * @readonly
   * @type {ActiveItem<T, R, S>}
   */
  #current

  /**
   * @param {ActiveItem<T, R, S>} current - The list's active item
   * @param {SelectionMode} mode - How it selects
   */
  constructor(current, mode) {
    this.#current = current
    this.mode = mode
    const { list } = current
    this.field = defineField({
      /** @returns {Chosen<F>} Nothing chosen */
      create: () => ({ anchor: undefined, selection: nothing() }),
      update: (value, transaction) => {
        if (transaction.state.field(list.source) !== transaction.startState.field(list.source)) {
          return { anchor: undefined, selection: nothing() }
        }
        const chosen = transaction.effectsOf(this.selected).at(-1) ?? value.selection
        const anchors = transaction.effectsOf(this.anchored)
        const anchor =
          anchors.length > 0
            ? anchors.at(-1)
            : value.anchor === undefined
              ? undefined
              : list.mapPosition(value.anchor, transaction)
        return chosen === value.selection && anchor === value.anchor ? value : { anchor, selection: chosen }
      },
    })
  }

  /**
   * Puts selection in a configuration.
   * @param {Builder} into - The configuration being built
   * @param {number} level - Its level
   * @returns {void}
   */
  install(into, level) {
    const { list } = this.#current
    /** @type {Extension} */
    const parts = [
      this.#current,
      this.field,
      precedence(
        'highest',
        transactionFilter.of((effects, state) => this.#following(effects, state)),
      ),
      inputHandler.of((input, store) => {
        if (input.is(list.press)) {
          this.#press(input.value, store)
          return true
        }
        return input.is(keyInput) && this.#key(input.value, store)
      }),
      list.attributes.of((row, state) => {
        if (row.kind !== 'item') {
          return {}
        }
        const selected = row.item !== undefined && this.isSelected(state, row.item)
        return { 'aria-selected': selected ? 'true' : 'false', part: selected ? 'selected' : undefined }
      }),
      list.containerAttributes.of(() => ({ 'aria-multiselectable': this.mode === 'multiple' ? 'true' : undefined })),
      this.#current.entering.of((state) => this.#entry(state)),
    ]
    into.add(parts, level)
  }

  /**
   * What is selected in a state.
   * @param {State} state - The state
   * @returns {Selection<F>} The selection
   */
  selectionIn(state) {
    return state.field(this.field).selection
  }

  /**
   * Whether an item is selected in a state.
   * @param {State} state - The state
   * @param {T} item - The item
   * @returns {boolean} Whether it is
   */
  isSelected(state, item) {
    return isSelected(this.selectionIn(state), state.field(this.#current.list.source), item)
  }

  /**
   * How many items are selected in a state, without reading them.
   * @param {State} state - The state
   * @returns {Promise<number>} The count
   */
  async count(state) {
    return countSelected(this.selectionIn(state), state.field(this.#current.list.source))
  }

  /**
   * The source to select in, which must be the list itself.
   * @param {State} state - The state
   * @returns {S} The source
   * @throws {Error} If the list stage made another list of it
   */
  #source(state) {
    const source = state.field(this.#current.list.source)
    if (this.#current.list.listOf(state) !== source) {
      throw new Error('A selection selects in the source, and a list-stage step has made another list of it')
    }
    return source
  }

  /**
   * The effects that select the items from one position through another, either way round, and nothing else.
   * @param {State} state - The state
   * @param {number} from - One end
   * @param {number} to - The other end
   * @returns {Effect<unknown>} The effect
   */
  #through(state, from, to) {
    return this.selected.of(spanning(this.#source(state), Math.min(from, to), Math.max(from, to) + 1))
  }

  /**
   * The effects that flip one item's selection, once it has been read; until then, none.
   * @param {State} state - The state
   * @param {number} position - Where the item is
   * @returns {Effect<unknown>[]} The effects
   */
  #flip(state, position) {
    const source = this.#source(state)
    const item = readNow(source, position)
    return item === undefined ? [] : [this.selected.of(toggle(this.selectionIn(state), source, item.item))]
  }

  /**
   * What a transaction moving the active item also does: in single mode it selects the item moved to, and in multiple
   * mode with Shift it selects from the anchor through it; unless the transaction selects already, or focus entering
   * moved it.
   * @param {readonly Effect<unknown>[]} effects - The transaction's effects
   * @param {State} state - The state it applies to
   * @returns {readonly Effect<unknown>[]} Its effects, with what the move selects
   */
  #following(effects, state) {
    /** @type {ActiveMove | undefined} */
    let move = undefined
    for (const effect of effects) {
      if (effect.is(this.#current.moved)) {
        move = effect.value
      } else if (effect.is(this.selected)) {
        return effects
      }
    }
    const to = move?.entering === false ? move.to : undefined
    if (to === undefined) {
      return effects
    }
    if (this.mode === 'single') {
      return [...effects, this.#through(state, to, to), this.anchored.of(to)]
    }
    if (move?.shift !== true) {
      return effects
    }
    const anchor = state.field(this.field).anchor ?? this.#current.positionIn(state) ?? to
    return [...effects, this.#through(state, anchor, to), this.anchored.of(anchor)]
  }

  /**
   * A press on an item: it becomes active, and is selected alone, toggled with the toggle modifier, or selected through
   * from the anchor with Shift; the last two in multiple mode only.
   * @param {Press} press - The press
   * @param {Store} store - The store
   * @returns {void}
   */
  #press({ position, shift, toggle: toggled }, store) {
    const { state } = store
    const { anchor } = state.field(this.field)
    /** @type {Effect<unknown>[]} */
    const effects = [this.#current.moved.of({ entering: false, shift, to: position })]
    if (this.mode === 'multiple' && shift) {
      effects.push(this.#through(state, anchor ?? position, position))
    } else {
      const chosen =
        this.mode === 'multiple' && toggled ? this.#flip(state, position) : [this.#through(state, position, position)]
      effects.push(...chosen, this.anchored.of(position))
    }
    store.dispatch({ effects })
  }

  /**
   * The keys that select: Space, Shift with Space, the toggle modifier with A, and with Shift and Home or End.
   * @param {KeyInput} key - The key
   * @param {Store} store - The store
   * @returns {boolean} Whether it was one of them
   */
  #key({ key, shift, toggle: toggled }, store) {
    const { state } = store
    const count = this.#current.list.listOf(state).count()
    const at = this.#current.positionIn(state)
    const home = key === 'Home' || key === 'End'
    const selects = toggled ? (shift ? home : key.toLowerCase() === 'a') : key === ' '
    if (!selects || count === 0) {
      return false
    }
    const multiple = this.mode === 'multiple'
    if (toggled && !shift) {
      if (multiple) {
        store.dispatch({ effects: this.selected.of(spanning(this.#source(state), 0, count)) })
      }
      return true
    }
    if (at === undefined) {
      return true
    }
    if (home) {
      const end = key === 'Home' ? 0 : count - 1
      store.dispatch({ effects: [...(multiple ? [this.#through(state, at, end)] : []), ...this.#current.go(end)] })
      return true
    }
    if (shift && multiple) {
      const anchor = state.field(this.field).anchor ?? at
      store.dispatch({ effects: [this.#through(state, anchor, at), this.anchored.of(anchor)] })
      return true
    }
    const chosen = multiple && !shift ? this.#flip(state, at) : [this.#through(state, at, at)]
    store.dispatch({ effects: [...chosen, this.anchored.of(at)] })
    return true
  }

  /**
   * Where focus entering goes while nothing is active: the first selected item, when the source can say where it is,
   * else the item last chosen.
   * @param {State} state - The state
   * @returns {number | undefined | Promise<number | undefined>} The position, if known
   */
  #entry(state) {
    const { anchor, selection: chosen } = state.field(this.field)
    const source = state.field(this.#current.list.source)
    const any = chosen.filter !== undefined || chosen.added.size > 0
    if (any && findsSelected(chosen, source)) {
      return firstSelected(chosen, source).then((found) => found ?? anchor)
    }
    return anchor
  }
}

/**
 * Selection for a list whose source makes selection filters.
 * @template T, R, F
 * @template {Source<T, F>} S
 * @param {ActiveItem<T, R, S & Source<T, F>>} current - The list's active item
 * @param {Readonly<{ mode?: SelectionMode | undefined }>} [options] - How it selects (single by default)
 * @returns {ListSelection<T, R, F, S>} The extension
 */
function selection(current, options = {}) {
  return new ListSelection(current, options.mode ?? 'single')
}

export { ListSelection, selection }
