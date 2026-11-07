/**
 * @import { Change, Source } from '@interact/core/source'
 * @import { Selection } from '@interact/core/selection'
 * @import { SelectionMode } from './chooser.js'
 * @import { KeyAction, Modifiers } from './listbox-keys.js'
 */

import { Controllable, Listeners, entry, move, nothing, plainText, shiftPosition } from '@interact/core'

import { chooserFor } from './chooser.js'
import { Items } from './items.js'
import { landing } from './landing.js'
import { keyAction } from './listbox-keys.js'
import { ScrollRows } from './scroll-rows.js'
import { Typeahead } from './typeahead.js'

/**
 * How a listbox starts. `text` is what an item is called, `skip` which items focus passes over (a menu's separators),
 * `rows` how many show at once, `id` what its options' ids start with (unique in the page for light DOM), `label` its
 * accessible name, `top` the position shown first, and `now` the clock typing is timed by, in milliseconds.
 * @template T, F
 * @typedef {Readonly<{
 *   source?: Source<T, F>,
 *   text?: (item: T) => string,
 *   skip?: (item: T) => boolean,
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

/** @type {number | undefined} */
const NO_POSITION = undefined

/**
 * Passes over no item.
 * @returns {boolean} False
 */
function passNothing() {
  return false
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
    /** @readonly */
    this.skip = options.skip ?? passNothing
    this.#typeahead = new Typeahead(options.now ?? (() => performance.now()))
    /** @readonly */
    this.scroll = new ScrollRows({
      count: () => this.items.count,
      overscan: OVERSCAN,
      rows: options.rows ?? DEFAULT_ROWS,
      top: options.top ?? 0,
    })
    /** @readonly */
    this.choose = chooserFor(this, options.mode ?? 'single')
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
   * What focus entering the listbox does, as the WAI-ARIA listbox pattern has it: the active item stays and is
   * scrolled into view. With nothing active, the first selected item becomes active and is shown when the source can
   * say where it is (`findsSelected`); otherwise, or with nothing selected, the item last chosen stands in for it, or
   * the top one when nothing was.
   * @returns {void}
   */
  focus() {
    const active = this.active.get()
    if (active !== undefined) {
      this.scroll.reveal(active)
      return
    }
    const selection = this.selection.get()
    const chosen = selection.filter !== undefined || selection.added.size > 0
    if (chosen && this.items.findsSelected(selection)) {
      void this.#enterSelected(selection)
      return
    }
    this.#enterAt(undefined)
  }

  /** @returns {boolean} Whether what was typed a moment ago is still being added to, so a space is part of it */
  get typing() {
    return this.#typeahead.typing
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
    if (action === undefined || this.items.count === 0) {
      return false
    }
    this.#act(action, modifiers.shift)
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
    const landed = found === undefined ? undefined : landing(this, found, 1)
    if (landed !== undefined) {
      this.goTo(landed)
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
   * Does what a key asked: moves the active item and shows it, never onto an item focus passes over; looks for an item
   * by what was typed; selects everything; or acts on the active item: activates or toggles it, selects through to it
   * from the anchor, or selects from it to the first or last item and goes there.
   * @param {KeyAction} action - What it asked
   * @param {boolean} extend - Whether Shift was held, to select through from the anchor
   * @returns {void}
   */
  #act(action, extend) {
    const { count } = this.items
    /** @type {number | undefined} */
    let to = undefined
    if (action.kind === 'move') {
      const by = action.rows + action.pages * this.scroll.rows.get()
      to = landing(this, move(this.active.get() ?? this.scroll.top.get(), by, count), by < 0 ? -1 : 1)
    } else if (action.kind === 'first') {
      to = landing(this, 0, 1)
    } else if (action.kind === 'last') {
      to = landing(this, count - 1, -1)
    }
    const active = this.active.get()
    if (to !== undefined) {
      this.goTo(to, extend)
    } else if (action.kind === 'type') {
      void this.type(action.character)
    } else if (action.kind === 'all' && this.choose.mode === 'multiple') {
      this.choose.all()
    } else if (active !== undefined && action.kind === 'activate') {
      this.activate(active)
    } else if (active !== undefined && action.kind === 'toggle') {
      this.choose.toggle(active)
    } else if (active !== undefined && action.kind === 'through') {
      this.choose.moved(active, true)
    } else if (active !== undefined && (action.kind === 'toFirst' || action.kind === 'toLast')) {
      const end = action.kind === 'toFirst' ? 0 : count - 1
      this.choose.span(active, end)
      this.active.request(end)
      this.scroll.reveal(end)
    }
  }

  /**
   * Makes an item active as focus enters: `position` while it is inside, otherwise the item last chosen, or the top.
   * @param {number | undefined} position - Where focus should go, if known
   * @returns {number | undefined} The position made active, if there are items
   */
  #enterAt(position) {
    const left = position ?? this.choose.anchor ?? this.scroll.top.get()
    const entered = entry(left, this.items.count)
    const at = entered === undefined ? undefined : landing(this, entered, 1)
    if (at !== undefined) {
      this.active.request(at)
    }
    return at
  }

  /**
   * Makes the first selected item active and shows it, once the source has said where it is. The answer is dropped if
   * a key made something active meanwhile, or the source changed.
   * @param {Selection<F>} selection - What is selected
   * @returns {Promise<void>} When it has, or the answer was dropped
   */
  async #enterSelected(selection) {
    const { source } = this.items
    const found = await this.items.firstSelected(selection)
    if (this.active.get() !== undefined || this.items.source !== source) {
      return
    }
    const entered = this.#enterAt(found)
    if (found !== undefined && entered !== undefined) {
      this.scroll.reveal(entered)
    }
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
   * Follows a change in the source: positions that moved move with their items, and items it made stale are read
   * again. A read fetches only what is not here, so a block arriving, reported as a change too, reads nothing more.
   * @param {Change} change - What changed
   * @returns {void}
   */
  #follow(change) {
    if (change.kind !== 'changed') {
      const active = this.active.get()
      this.active.set(active === undefined ? undefined : shiftPosition(active, change))
      const top = shiftPosition(this.scroll.top.get(), change) ?? (change.kind === 'reset' ? 0 : change.start)
      this.scroll.top.set(this.scroll.within(top))
    }
    this.#read()
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
      this.items.read(active, active + 1)
    }
  }
}

export { Listbox }
