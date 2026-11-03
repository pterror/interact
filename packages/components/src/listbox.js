/**
 * @import { Change, Source } from '@interact/core/source'
 * @import { Selection } from '@interact/core/selection'
 * @import { SelectionMode } from './chooser.js'
 * @import { KeyAction, Modifiers } from './listbox-keys.js'
 */

import { Controllable, Listeners, nothing, plainText, shiftPosition } from '@interact/core'

import { Chooser } from './chooser.js'
import { Items } from './items.js'
import { act } from './listbox-act.js'
import { enterFocus } from './listbox-focus.js'
import { keyAction } from './listbox-keys.js'
import { ScrollRows } from './scroll-rows.js'
import { Typeahead } from './typeahead.js'

/**
 * How a listbox starts. `text` is what an item is called, `rows` how many show at once, `id` what its options' ids
 * start with (unique in the page for light DOM), `label` its accessible name, `top` the position shown first, and
 * `now` the clock typing is timed by, in milliseconds.
 * @template T, F
 * @typedef {Readonly<{
 *   source?: Source<T, F>,
 *   text?: (item: T) => string,
 *   mode?: SelectionMode,
 *   rows?: number,
 *   id?: string,
 *   label?: string,
 *   top?: number,
 *   now?: () => number,
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

/** @type {number | undefined} */
const NO_POSITION = undefined

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
  active = new Controllable(NO_POSITION, false)
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
   * Where the items come from. A new source starts over: nothing is active or selected, and the top stays where it
   * was as far as the new items reach.
   * @readonly
   * @type {Controllable<Source<T, F> | undefined>}
   */
  source
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
  /**
   * @readonly
   * @type {Typeahead}
   */
  #typeahead

  /** @param {ListboxOptions<T, F>} [options] - How it starts */
  constructor(options = {}) {
    /** @readonly */
    this.id = options.id ?? 'listbox'
    /** @readonly */
    this.label = options.label ?? ''
    /** @readonly */
    this.text = options.text ?? plainText
    this.#typeahead = new Typeahead(options.now ?? (() => performance.now()))
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
    this.source = new Controllable(options.source, false)
    this.#followState()
    this.#use(options.source)
  }

  /**
   * Starts over with a source: nothing active or selected, and the top where it was as far as the new items reach.
   * @param {Source<T, F> | undefined} source - Where the items come from
   * @returns {void}
   */
  #use(source) {
    this.items.use(source)
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
   * What focus entering the listbox does (see `enterFocus`): the active item stays and is shown; with nothing active,
   * the first selected item when the source can say where it is, otherwise the item last chosen, or the top one.
   * @returns {void}
   */
  focus() {
    enterFocus(this)
  }

  /**
   * Acts on a key, if it means anything here.
   * @param {string} key - The key, as `KeyboardEvent.key` names it
   * @param {Modifiers} modifiers - What was held
   * @returns {boolean} Whether it meant something, so its default should be prevented
   */
  key(key, modifiers) {
    const typing = key === ' ' && !modifiers.shift && !modifiers.toggle && this.#typeahead.typing
    /** @type {KeyAction | undefined} */
    const action = typing ? { character: key, kind: 'type' } : keyAction(key, modifiers)
    if (action === undefined || this.items.count === NONE) {
      return false
    }
    act(this, action, modifiers.shift)
    return true
  }

  /**
   * Makes a position active and shows it, the selection following as moving there does.
   * @param {number} position - Where to go
   * @param {boolean} [extend] - Whether to select through from the anchor, as Shift does
   * @returns {void}
   */
  goTo(position, extend = false) {
    const from = this.active.get()
    this.active.request(position)
    this.scroll.reveal(position)
    this.choose.moved(position, extend, from)
  }

  /**
   * Looks for an item by a character typed, with what was typed a moment before it, and goes there when it is found,
   * unless more was typed meanwhile.
   * @param {string} character - What was typed
   * @returns {Promise<void>} When it has been found, or not
   */
  async type(character) {
    const at = { active: this.active.get(), top: this.scroll.top.get() }
    const found = await this.#typeahead.seek(character, at, async (text, from) =>
      this.items.findPrefix(text, from, this.text),
    )
    if (found !== undefined) {
      this.goTo(found)
    }
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
    this.source.subscribe((source) => {
      this.#use(source)
    })
    this.items.subscribe((change) => {
      this.#follow(change)
    })
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
