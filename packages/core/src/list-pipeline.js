/**
 * @import { Change, ItemSource, Key } from './source.js'
 * @import { EffectType, Extension, Facet, Field, State, Transaction } from './state.js'
 */

import { shiftPosition } from './source.js'
import { defineEffect, defineFacet, defineField, listFacet } from './state.js'
import { definePlugin } from './store.js'
import { plainText } from './text.js'

/**
 * Attributes an extension gives a row or the list: `part`, `class` and `style` from every extension are joined, and
 * for any other attribute the first extension to give it, in precedence order, decides. `undefined` gives nothing;
 * `false` leaves the attribute out.
 * @typedef {Readonly<Record<string, string | number | boolean | undefined>>} Attributes
 */

/**
 * What the list stage renders, in order: the item at a position, or a gap standing for the positions from `from` up
 * to `to`, which are not rendered.
 * @typedef {Readonly<{ kind: 'item', position: number }> | Readonly<{ kind: 'gap', from: number, to: number }>} Row
 */

/**
 * Rows, read one at a time, so a stage over a long list never makes them all.
 * @typedef {Readonly<{ length: number, at: (index: number) => Row | undefined }>} Rows
 */

/**
 * A row as the item stage gets it: an item row with its item (undefined until it has been read) and key, or a gap.
 * @template T
 * @typedef {Readonly<{ kind: 'item', position: number, item: T | undefined, key: Key }>
 *   | Readonly<{ kind: 'gap', from: number, to: number, key: Key }>} RenderRow
 */

/**
 * One step of the list stage: a source made from the one before. `apply` is called again only when its input source or
 * what `depends` gives (compared with `Object.is`) changes, so it reads nothing of the state but that.
 * @template T
 * @typedef {Readonly<{
 *   depends?: (state: State) => unknown,
 *   apply: (source: ItemSource<T>, state: State) => ItemSource<T>,
 * }>} ListTransform
 */

/**
 * One step choosing what is rendered: rows made from the rows before.
 * @typedef {(rows: Rows, state: State) => Rows} RowsStep
 */

/**
 * One step of the item stage: what a row renders as, given the next step (the one after it in precedence order).
 * A step decorates by calling `next`, and replaces what comes after it by not calling it.
 * @template T, R
 * @typedef {(row: RenderRow<T>, next: (row: RenderRow<T>) => R, state: State) => R} ItemStep
 */

/**
 * What a row rendered as, with its key.
 * @template R
 * @typedef {Readonly<{ key: Key, rendered: R }>} Keyed
 */

/**
 * One step of the container stage: what the rendered rows render as together, given the next step.
 * @template R
 * @typedef {(children: readonly Keyed<R>[], next: (children: readonly Keyed<R>[]) => R, state: State) => R} ContainerStep
 */

/**
 * The positions shown, from `start` up to `end`.
 * @typedef {Readonly<{ start: number, end: number }>} Visible
 */

/**
 * A press on a row: its position, whether Shift and the toggle modifier (Control, or Command on a Mac) were held, and
 * how many presses in quick succession it makes (2 for the second of a double press).
 * @typedef {Readonly<{ position: number, shift: boolean, toggle: boolean, count: number }>} Press
 */

/**
 * A change the list reported, with the list that reported it.
 * @template T
 * @typedef {Readonly<{ list: ItemSource<T>, change: Change }>} ListChange
 */

/**
 * One list-stage step as it was last applied.
 * @template T
 * @typedef {Readonly<{ input: ItemSource<T>, depends: unknown, output: ItemSource<T> }>} Applied
 */

/**
 * The list as the list stage made it, with each step as it was applied.
 * @template T
 * @typedef {Readonly<{ list: ItemSource<T>, steps: readonly Applied<T>[] }>} Built
 */

/** Attributes whose values from every extension are joined, and with what. */
const JOINED = new Map([
  ['class', ' '],
  ['part', ' '],
  ['style', '; '],
])

/**
 * Attributes from several extensions, as one.
 * @param {readonly Attributes[]} all - Each extension's, in precedence order
 * @returns {Attributes} The attributes
 */
function mergeAttributes(all) {
  /** @type {Record<string, string | number | boolean>} */
  const merged = {}
  for (const attributes of all) {
    for (const [name, value] of Object.entries(attributes)) {
      const was = merged[name]
      const joiner = JOINED.get(name)
      if (value === undefined) {
        continue
      }
      if (was === undefined) {
        merged[name] = value
      } else if (joiner !== undefined && typeof was === 'string' && typeof value === 'string') {
        merged[name] = `${was}${joiner}${value}`
      }
    }
  }
  return merged
}

/**
 * Every position of a list, as item rows.
 * @param {number} count - How many items it has
 * @returns {Rows} The rows
 */
function everyRow(count) {
  return {
    at: (index) => (index >= 0 && index < count ? { kind: 'item', position: index } : undefined),
    length: count,
  }
}

/**
 * Rows held in an array.
 * @param {readonly Row[]} rows - The rows
 * @returns {Rows} The rows
 */
function rowsOf(rows) {
  return { at: (index) => rows[index], length: rows.length }
}

/**
 * Runs a chain of steps from one of them: each is given the next as `next`; past the last is an error.
 * @template A, R
 * @param {readonly ((input: A, next: (input: A) => R, state: State) => R)[]} steps - The steps
 * @param {number} index - The step to run
 * @param {A} input - Its input
 * @param {State} state - The state
 * @param {string} what - What is being rendered, for the error
 * @returns {R} What the steps make of it
 */
function runSteps(steps, index, input, state, what) {
  const step = steps[index]
  if (step === undefined) {
    throw new Error(`Nothing renders ${what}: include a rendering, or a step that doesn't hand it on`)
  }
  return step(input, (next) => runSteps(steps, index + 1, next, state, what), state)
}

/**
 * One list in a component, from its source to what it renders as (`R`: a template, a string, a terminal's lines), and
 * the extension points each stage has. The list stage makes the list from the source, a source at a time
 * (`transform`), and chooses which rows render (`rows`); every position in an effect is a position in that list. The
 * item stage renders each row (`item`), and the container stage renders them together (`container`). Its own
 * extension (`extension`) holds the source, the list, and what follows the list's changes. `S` is the source's own
 * type, for an extension that asks more of it than an `ItemSource` has.
 * @template T, R
 * @template {ItemSource<T>} [S=ItemSource<T>]
 */
class ListPipeline {
  /**
   * Sets the source.
   * @readonly
   * @type {EffectType<S>}
   */
  setSource = defineEffect()
  /**
   * A change the list reported, as it arrives: positions held in fields move with it (`mapPosition`).
   * @readonly
   * @type {EffectType<ListChange<T>>}
   */
  changed = defineEffect()
  /**
   * Asks for the item at a position to be shown.
   * @readonly
   * @type {EffectType<number>}
   */
  reveal = defineEffect()
  /**
   * A press on a row, as an input.
   * @readonly
   * @type {EffectType<Press>}
   */
  press = defineEffect()
  /**
   * The list stage's source steps, in precedence order from the source.
   * @readonly
   * @type {Facet<ListTransform<T>, readonly ListTransform<T>[]>}
   */
  transform = listFacet()
  /**
   * The steps choosing which rows render, in precedence order from every position of the list.
   * @readonly
   * @type {Facet<RowsStep, readonly RowsStep[]>}
   */
  rows = listFacet()
  /**
   * The item stage's steps, outermost first.
   * @readonly
   * @type {Facet<ItemStep<T, R>, readonly ItemStep<T, R>[]>}
   */
  item = listFacet()
  /**
   * The container stage's steps, outermost first.
   * @readonly
   * @type {Facet<ContainerStep<R>, readonly ContainerStep<R>[]>}
   */
  container = listFacet()
  /**
   * Attributes for a row, from every extension.
   * @readonly
   * @type {Facet<(row: RenderRow<T>, state: State) => Attributes, readonly ((row: RenderRow<T>, state: State) => Attributes)[]>}
   */
  attributes = listFacet()
  /**
   * Attributes for the container, from every extension.
   * @readonly
   * @type {Facet<(state: State) => Attributes, readonly ((state: State) => Attributes)[]>}
   */
  containerAttributes = listFacet()
  /**
   * Positions that must be rendered whatever else is (the active item, so focus never falls out of the list).
   * @readonly
   * @type {Facet<(state: State) => readonly number[], (state: State) => readonly number[]>}
   */
  keep = defineFacet((inputs) => (state) => inputs.flatMap((positions) => positions(state)))
  /**
   * The positions shown, from whichever extension knows (the first to say).
   * @readonly
   * @type {Facet<(state: State) => Visible | undefined, (state: State) => Visible | undefined>}
   */
  visible = defineFacet((inputs) => (state) => {
    for (const visible of inputs) {
      const shown = visible(state)
      if (shown !== undefined) {
        return shown
      }
    }
    return undefined
  })
  /**
   * Whether an extension shows revealed items itself; without one, a rendering brings the item's element into view.
   * @readonly
   * @type {Facet<boolean, boolean>}
   */
  reveals = defineFacet((inputs) => inputs.includes(true))
  /**
   * What an item is called, for whatever shows it or searches it: the first extension to say, in precedence order, or
   * a string or number as itself.
   * @readonly
   * @type {Facet<(item: T) => string, (item: T) => string>}
   */
  text = defineFacet((inputs) => inputs[0] ?? plainText)
  /**
   * @readonly
   * @type {Field<S>}
   */
  source
  /**
   * @readonly
   * @type {Field<Built<T>>}
   */
  #built

  /** @param {S} source - The source it starts with */
  constructor(source) {
    this.source = defineField({
      create: () => source,
      update: (value, transaction) => transaction.effectsOf(this.setSource).at(-1) ?? value,
    })
    this.#built = defineField({
      create: (state) => this.#build(state, undefined),
      update: (built, transaction) => this.#build(transaction.state, built),
    })
    const following = definePlugin((store) => {
      /**
       * Dispatches each change a list reports.
       * @param {ItemSource<T>} list - The list
       * @returns {() => void} Stops
       */
      const follow = (list) =>
        list.subscribe((change) => {
          store.dispatch({ effects: this.changed.of({ change, list }) })
        })
      let list = this.listOf(store.state)
      let stop = follow(list)
      return {
        destroy: () => {
          stop()
        },
        update: (transaction) => {
          const now = this.listOf(transaction.state)
          if (now !== list) {
            stop()
            list = now
            stop = follow(now)
          }
        },
      }
    })
    /**
     * The source, the list and what follows the list's changes: what every extension of this list builds on.
     * @readonly
     * @type {Extension}
     */
    this.extension = [this.source, this.#built, following]
  }

  /**
   * The list in a state, as the list stage made it.
   * @param {State} state - The state
   * @returns {ItemSource<T>} The list
   */
  listOf(state) {
    return state.field(this.#built).list
  }

  /**
   * Where a position in the list is after a transaction, as the changes it carries move it: undefined if its item went,
   * or the list was replaced (a new source, or a list-stage step applied again).
   * @param {number} position - Where it was
   * @param {Transaction} transaction - The transaction
   * @returns {number | undefined} Where it is now
   */
  mapPosition(position, transaction) {
    const before = this.listOf(transaction.startState)
    if (this.listOf(transaction.state) !== before) {
      return undefined
    }
    /** @type {number | undefined} */
    let at = position
    for (const { change, list } of transaction.effectsOf(this.changed)) {
      if (list === before && at !== undefined) {
        at = shiftPosition(at, change)
      }
    }
    return at
  }

  /**
   * The rows to render in a state: every position, as the rows steps make it.
   * @param {State} state - The state
   * @returns {Rows} The rows
   */
  rowsIn(state) {
    let rows = everyRow(this.listOf(state).count())
    for (const step of state.facet(this.rows)) {
      rows = step(rows, state)
    }
    return rows
  }

  /**
   * A row's attributes, from every extension.
   * @param {RenderRow<T>} row - The row
   * @param {State} state - The state
   * @returns {Attributes} The attributes
   */
  attributesOf(row, state) {
    return mergeAttributes(state.facet(this.attributes).map((attributes) => attributes(row, state)))
  }

  /**
   * The container's attributes, from every extension.
   * @param {State} state - The state
   * @returns {Attributes} The attributes
   */
  containerAttributesOf(state) {
    return mergeAttributes(state.facet(this.containerAttributes).map((attributes) => attributes(state)))
  }

  /**
   * What the list renders as in a state: the rows chosen, each through the item stage, then together through the
   * container stage. The items of the rows rendered are read; an item a source gives only later renders as not read
   * yet, and the source reports it as changed when it arrives.
   * @param {State} state - The state
   * @returns {R} What it renders as
   * @throws {Error} If no step renders a row or the container
   */
  render(state) {
    const list = this.listOf(state)
    const rows = this.rowsIn(state)
    const items = this.#read(list, rows)
    const steps = state.facet(this.item)
    /** @type {Keyed<R>[]} */
    const children = []
    for (let index = 0; index < rows.length; index += 1) {
      const row = rows.at(index)
      if (row !== undefined) {
        const item = row.kind === 'item' ? items.get(row.position) : undefined
        /** @type {RenderRow<T>} */
        const rendering =
          row.kind === 'gap'
            ? { ...row, key: `\u0000gap ${String(row.from)}` }
            : {
                item: item?.item,
                key: item === undefined ? `\u0000unread ${String(row.position)}` : list.key(item.item),
                kind: 'item',
                position: row.position,
              }
        children.push({
          key: rendering.key,
          rendered: runSteps(steps, 0, rendering, state, row.kind === 'item' ? 'an item row' : 'a gap row'),
        })
      }
    }
    return runSteps(state.facet(this.container), 0, children, state, 'the container')
  }

  /**
   * The list made by the list stage, applying again only the steps whose input or dependency changed.
   * @param {State} state - The state
   * @param {Built<T> | undefined} previous - The list as it was made before
   * @returns {Built<T>} The list
   */
  #build(state, previous) {
    /** @type {ItemSource<T>} */
    let list = state.field(this.source)
    /** @type {Applied<T>[]} */
    const steps = []
    for (const [index, transform] of state.facet(this.transform).entries()) {
      const depends = transform.depends?.(state)
      const was = previous?.steps[index]
      const output = was?.input === list && Object.is(was.depends, depends) ? was.output : transform.apply(list, state)
      steps.push({ depends, input: list, output })
      list = output
    }
    return previous?.list === list ? previous : { list, steps }
  }

  /**
   * Reads the items of the item rows, a run of positions at a time.
   * @param {ItemSource<T>} list - The list
   * @param {Rows} rows - The rows
   * @returns {Map<number, Readonly<{ item: T }>>} The items read at once, by position
   */
  #read(list, rows) {
    const count = list.count()
    /** @type {number[]} */
    const positions = []
    for (let index = 0; index < rows.length; index += 1) {
      const row = rows.at(index)
      if (row?.kind === 'item' && row.position >= 0 && row.position < count) {
        positions.push(row.position)
      }
    }
    const sorted = [...new Set(positions)].toSorted((left, right) => left - right)
    /** @type {Map<number, Readonly<{ item: T }>>} */
    const items = new Map()
    let start = 0
    while (start < sorted.length) {
      let end = start + 1
      while (end < sorted.length && sorted[end] === (sorted[end - 1] ?? 0) + 1) {
        end += 1
      }
      const first = sorted[start] ?? 0
      const result = list.read(first, first + end - start)
      if (result instanceof Promise) {
        void result
      } else {
        for (const [offset, item] of result.entries()) {
          items.set(first + offset, { item })
        }
      }
      start = end
    }
    return items
  }
}

/**
 * A list's pipeline, starting from a source.
 * @template T, R
 * @template {ItemSource<T>} S
 * @param {S & ItemSource<T>} source - The source
 * @returns {ListPipeline<T, R, S>} The pipeline
 */
function listPipeline(source) {
  return new ListPipeline(source)
}

export { ListPipeline, everyRow, listPipeline, mergeAttributes, rowsOf }
