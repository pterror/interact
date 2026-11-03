/**
 * @import { Change, Source } from '@interact/core/source'
 * @import { Selection } from '@interact/core/selection'
 * @import { SelectionMode } from './chooser.js'
 * @import { KeyAction, Modifiers } from './listbox-keys.js'
 */

import { Controllable, Listeners, entry, move, nothing, shiftPosition } from '@interact/core'

import { Chooser } from './chooser.js'
import { Items } from './items.js'
import { keyAction } from './listbox-keys.js'
import { ScrollRows } from './scroll-rows.js'

/**
 * How a listbox starts. `text` is what an item is called, `rows` how many show at once, `id` what its options' ids
 * start with (unique in the page for light DOM), `label` its accessible name, and `top` the position shown first.
 * @template T, F
 * @typedef {Readonly<{
 *   source?: Source<T, F>,
 *   text?: (item: T) => string,
 *   mode?: SelectionMode,
 *   rows?: number,
 *   id?: string,
 *   label?: string,
 *   top?: number,
 * }>} ListboxOptions
 */

/** Rows read and rendered beyond each edge of what shows, so a short scroll finds them there. */
const OVERSCAN = 5
const BLOCK_SIZE = 100
/** Blocks kept: what shows, its overscan and the active item fit in a few, so 16 leaves room for rows up to ~1,400. */
const BLOCKS = 16
const DEFAULT_ROWS = 10
const NONE = 0
const ONE = 1

/**
 * No position, typed as the position it could have been.
 * @returns {number | undefined} Undefined
 */
function nowhere() {
  return undefined
}

/**
 * What an item is called when the app doesn't say: a string or number as itself, anything else as nothing.
 * @param {unknown} item - The item
 * @returns {string} Its text
 */
function plainText(item) {
  return typeof item === 'string' || typeof item === 'number' ? String(item) : ''
}

/**
 * A listbox's behavior, with no DOM, ten items or ten billion at the same cost. Its parts: `items` (the source, read
 * through a bounded cache), `scroll` (which rows show), `choose` (what presses do to the selection), and the active
 * item and the selection themselves. Every piece of state is controllable by the app.
 * @template T, F
 */
class Listbox {
  /**
   * The position of the active item, where keys act, if any.
   * @readonly
   * @type {Controllable<number | undefined>}
   */
  active = new Controllable(nowhere(), false)
  /**
   * What is selected.
   * @readonly
   * @type {Controllable<Selection<F>>}
   */
  selection = new Controllable(nothing(), false)
  /**
   * The items, read through a bounded cache.
   * @readonly
   * @type {Items<T, F>}
   */
  items = new Items(BLOCK_SIZE, BLOCKS)
  /**
   * @readonly
   * @type {Listeners<undefined>}
   */
  #changes = new Listeners()
  /**
   * @readonly
   * @type {Listeners<number>}
   */
  #activations = new Listeners()

  /** @param {ListboxOptions<T, F>} [options] - How it starts */
  constructor(options = {}) {
    /** @readonly */
    this.id = options.id ?? 'listbox'
    /** @readonly */
    this.label = options.label ?? ''
    /** @readonly */
    this.text = options.text ?? plainText
    const { items } = this
    /** @readonly */
    this.scroll = new ScrollRows({
      count: () => items.count,
      overscan: OVERSCAN,
      rows: options.rows ?? DEFAULT_ROWS,
      top: options.top ?? NONE,
    })
    /** @readonly */
    this.choose = new Chooser(
      {
        count: () => items.count,
        item: (at) => items.item(at),
        requestActive: (position) => {
          this.active.request(position)
        },
        requestSelection: (next) => {
          this.selection.request(next)
        },
        selection: () => this.selection.get(),
        source: () => items.source,
      },
      options.mode ?? 'single',
    )
    this.#followState()
    this.source = options.source
  }

  /**
   * Where the items come from. Setting it starts over: nothing is active or selected, and the top stays where it was
   * as far as the new items reach.
   * @returns {Source<T, F> | undefined} The source
   */
  get source() {
    return this.items.source
  }

  /** @param {Source<T, F> | undefined} source - Where the items come from */
  set source(source) {
    this.items.source = source
    this.choose.reset()
    this.active.set(undefined)
    this.selection.set(nothing())
    this.scroll.top.set(this.scroll.within(this.scroll.top.get()))
    this.#read()
    this.#changes.emit(undefined)
  }

  /**
   * The positions to render: the window's, and the active item's when it is outside, so it can always be focused.
   * @returns {number[]} The positions, the window's in order
   */
  positions() {
    return this.scroll.positions(this.active.get())
  }

  /**
   * What focus entering the listbox does: the active item stays, or the top one becomes active.
   * @returns {void}
   */
  focus() {
    const position = entry(this.active.get() ?? this.scroll.top.get(), this.items.count)
    if (position !== undefined && position !== this.active.get()) {
      this.active.request(position)
    }
  }

  /**
   * Acts on a key, if it means anything here.
   * @param {string} key - The key, as `KeyboardEvent.key` names it
   * @param {Modifiers} modifiers - What was held
   * @returns {boolean} Whether it meant something, so its default should be prevented
   */
  key(key, modifiers) {
    const action = keyAction(key, modifiers)
    if (action === undefined || this.items.count === NONE) {
      return false
    }
    this.#act(action, modifiers.shift)
    return true
  }

  /**
   * Activates the item at a position: what Enter or a double press does.
   * @param {number} position - Where it is
   * @returns {void}
   */
  activate(position) {
    this.#activations.emit(position)
  }

  /**
   * Calls `listener` with the position of each item activated.
   * @param {(position: number) => void} listener - What to call
   * @returns {() => void} Stops calling it
   */
  onActivate(listener) {
    return this.#activations.add(listener)
  }

  /**
   * Calls `listener` whenever anything a view shows may have changed.
   * @param {() => void} listener - What to call
   * @returns {() => void} Stops calling it
   */
  subscribe(listener) {
    return this.#changes.add(() => {
      listener()
    })
  }

  /**
   * Reads and re-renders as the state and the source change.
   * @returns {void}
   */
  #followState() {
    for (const piece of [this.scroll.top, this.scroll.rows, this.active]) {
      piece.subscribe(() => {
        this.#read()
        this.#changes.emit(undefined)
      })
    }
    this.selection.subscribe(() => {
      this.#changes.emit(undefined)
    })
    this.items.subscribe((change) => {
      this.#follow(change)
    })
  }

  /**
   * Does what a key asked: moves the active item and shows it, selects everything, activates or toggles.
   * @param {KeyAction} action - What it asked
   * @param {boolean} extend - Whether Shift was held, to select through from the anchor
   * @returns {void}
   */
  #act(action, extend) {
    const active = this.active.get()
    const target = this.#target(action, active)
    if (target !== undefined) {
      this.active.request(target)
      this.scroll.reveal(target)
      this.choose.moved(target, extend)
    } else if (action.kind === 'all' && this.choose.mode === 'multiple') {
      this.choose.all()
    } else if (action.kind === 'activate' && active !== undefined) {
      this.activate(active)
    } else if (action.kind === 'toggle' && active !== undefined) {
      this.choose.toggle(active)
    }
  }

  /**
   * Where a key moves the active item, if it moves it.
   * @param {KeyAction} action - What the key asked
   * @param {number | undefined} active - The active item now
   * @returns {number | undefined} Where it goes
   */
  #target(action, active) {
    const { count } = this.items
    if (action.kind === 'move') {
      return move(active ?? this.scroll.top.get(), action.rows + action.pages * this.scroll.rows.get(), count)
    }
    if (action.kind === 'first') {
      return NONE
    }
    return action.kind === 'last' ? count - ONE : undefined
  }

  /**
   * Follows a change in the source: positions that moved move with their items.
   * @param {Change} change - What changed
   * @returns {void}
   */
  #follow(change) {
    if (change.kind !== 'changed') {
      const active = this.active.get()
      this.active.set(active === undefined ? undefined : shiftPosition(active, change))
      const top = shiftPosition(this.scroll.top.get(), change) ?? (change.kind === 'reset' ? NONE : change.start)
      this.scroll.top.set(this.scroll.within(top))
      this.#read()
    }
    this.#changes.emit(undefined)
  }

  /**
   * Reads the window's items and the active item, if they aren't here yet.
   * @returns {void}
   */
  #read() {
    const { end, start } = this.scroll.window()
    this.items.read(start, end)
    const active = this.active.get()
    if (active !== undefined) {
      this.items.read(active, active + ONE)
    }
  }
}

export { Listbox }
