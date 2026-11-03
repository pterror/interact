/**
 * @import { Point } from '@interact/core/intent'
 * @import { Source } from '@interact/core/source'
 * @import { MenuEntry } from './menu-entry.js'
 * @import { Activation, MenuOptions, MenuSelect, OpenFocus, OpenSubmenu } from './menu-types.js'
 */

import { Controllable, Layer, Listeners } from '@interact/core'

import { landing } from './landing.js'
import { Listbox } from './listbox.js'
import { entryText, isSeparator } from './menu-entry.js'
import { SubmenuSlot } from './menu-submenu.js'
import { waitWithTimer } from './menu-types.js'

const DEFAULT_ROWS = 10
const NONE = 0
const ONE = 1
const FORWARD = 1
const BACK = -1
/** @type {Point | undefined} */
const NO_POINT = undefined

/**
 * A menu's behavior, with no DOM: its entries in a listbox that selects nothing and passes over separators, the layer
 * it opens in, the point it opens at (a context menu) if not beside its button, and the submenu open from it.
 * Submenus are menus of their own, each in a layer above its parent's. An item chosen in a submenu is reported by
 * `onSelect` on every menu above it too.
 * @template F
 */
class Menu {
  /** @readonly */
  layer = new Layer()
  /**
   * The point it opens at, as a context menu does; beside its button otherwise.
   * @readonly
   */
  point = new Controllable(NO_POINT, false)
  /**
   * @readonly
   * @type {Listeners<MenuSelect<F>>}
   */
  #selects = new Listeners()
  /**
   * @readonly
   * @type {Listeners<undefined>}
   */
  #changes = new Listeners()
  #wantsFocus = false
  /**
   * @readonly
   * @type {SubmenuSlot<Menu<F>>}
   */
  #slot

  /**
   * @param {MenuOptions<F>} [options] - How it starts
   */
  constructor(options = {}) {
    /** @readonly */
    this.id = options.id ?? 'menu'
    /** @readonly */
    this.parent = options.parent
    /** @readonly */
    this.rows = options.rows ?? DEFAULT_ROWS
    /** @readonly */
    this.wait = options.wait ?? waitWithTimer
    /**
     * Its entries, in a list that selects nothing and passes over separators.
     * @readonly
     * @type {Listbox<MenuEntry<F>, F>}
     */
    this.list = new Listbox({
      id: this.id,
      label: options.label ?? '',
      mode: 'none',
      skip: isSeparator,
      text: entryText,
    })
    this.#slot = new SubmenuSlot({
      changed: () => {
        this.#changes.emit(undefined)
      },
      closed: () => {
        this.#wantsFocus = true
      },
      wait: this.wait,
    })
    this.#follow()
    this.list.source.set(options.items)
  }

  /** @returns {OpenSubmenu<F> | undefined} The submenu open from one of its entries, and which */
  get submenu() {
    return this.#slot.open
  }

  /**
   * Opens the menu, with focus on its first or last item, or on none yet.
   * @param {OpenFocus} [focus] - Where focus goes
   * @returns {void}
   */
  open(focus = 'first') {
    this.layer.open.request(true)
    const { count } = this.list.items
    const at = focus === 'last' ? landing(this.list, count - ONE, BACK) : landing(this.list, NONE, FORWARD)
    if (focus !== 'none' && at !== undefined) {
      this.list.goTo(at)
    }
  }

  /**
   * Opens the menu at a point, as a context menu, with focus on its first item.
   * @param {Point} point - Where, in pixels from the viewport's top left
   * @returns {void}
   */
  openAt(point) {
    this.point.set(point)
    this.open('first')
  }

  /**
   * Asks to close the menu, and with it any submenu open from it.
   * @returns {void}
   */
  close() {
    this.layer.open.request(false)
  }

  /**
   * Closes the menu this one is a submenu of, all the way up, as running an item does.
   * @returns {void}
   */
  closeAll() {
    if (this.parent === undefined) {
      this.close()
    } else {
      this.parent.closeAll()
    }
  }

  /**
   * Whether focus should come to this menu's list now, which its view does: once a submenu opens from a key, or closes
   * back to it. Asking clears it.
   * @returns {boolean} Whether it should
   */
  takeFocus() {
    const wants = this.#wantsFocus && this.layer.open.get()
    this.#wantsFocus = false
    return wants
  }

  /**
   * Runs the item at a position, or opens its submenu: a command, checkbox or radio item is reported to `onSelect`,
   * then every menu up to the first closes, unless it was a checkbox or radio item activated with Space. A separator or
   * a disabled item does nothing.
   * @param {number} position - Where it is
   * @param {Activation} how - What activated it
   * @returns {boolean} Whether there was an item there
   */
  activate(position, how) {
    const entry = this.list.items.item(position)
    if (entry === undefined || entry.kind === 'separator') {
      return false
    }
    if (entry.kind === 'submenu' || entry.disabled === true) {
      return entry.kind !== 'submenu' || this.openSubmenu(position, how !== 'press')
    }
    this.#selects.emit({ entry, menu: this, position })
    if (how !== 'space' || entry.kind === 'command') {
      this.closeAll()
    }
    return true
  }

  /**
   * Opens the submenu of the entry at a position, closing any other, with focus on its first item if `focus`.
   * @param {number} position - The entry's position
   * @param {boolean} focus - Whether focus goes into the submenu
   * @returns {boolean} Whether the entry has a submenu, enabled
   */
  openSubmenu(position, focus) {
    const entry = this.list.items.item(position)
    if (entry?.kind !== 'submenu' || entry.disabled === true) {
      return false
    }
    const menu = this.#slot.take(position, () => this.#makeSubmenu(position, entry))
    menu.open(focus ? 'first' : 'none')
    menu.#wantsFocus = focus
    return true
  }

  /**
   * The pointer is over the entry at a position: it becomes active, and its submenu opens once the pointer has rested
   * there, any other submenu closing. Crossing entries on the way to the open submenu (see `headFor`) does nothing.
   * @param {number} position - Where the entry is
   * @param {Point} pointer - Where the pointer is
   * @returns {boolean} Whether the menu took it, so its list should have focus
   */
  pointTo(position, pointer) {
    const entry = this.list.items.item(position)
    if (entry === undefined || entry.kind === 'separator' || this.#slot.crossing(position, pointer)) {
      return false
    }
    if (this.parent !== undefined) {
      this.parent.#slot.arrived()
    }
    this.list.active.request(position)
    this.#slot.pointedAt(position, entry.kind === 'submenu' && entry.disabled !== true, () => {
      this.openSubmenu(position, false)
    })
    return true
  }

  /**
   * The pointer left an entry toward its open submenu: while it stays inside `area`, crossing other entries leaves the
   * submenu open.
   * @param {readonly Point[]} area - Where it may pass (see `intentArea`)
   * @returns {void}
   */
  headFor(area) {
    this.#slot.headFor(area)
  }

  /**
   * Calls `listener` with every item chosen, in this menu or a submenu of it.
   * @param {(chosen: MenuSelect<F>) => void} listener - What to call
   * @returns {() => void} Stops calling it
   */
  onSelect(listener) {
    return this.#selects.add(listener)
  }

  /**
   * Calls `listener` whenever anything a view shows may have changed, in this menu or a submenu of it.
   * @param {() => void} listener - What to call
   * @returns {() => void} Stops calling it
   */
  subscribe(listener) {
    return this.#changes.add(() => {
      listener()
    })
  }

  /**
   * Makes the submenu of an entry: a menu of its own, whose choices are this menu's too.
   * @param {number} position - The entry's position
   * @param {Readonly<{ label: string, items: Source<MenuEntry<F>, F> }>} entry - The entry
   * @returns {Menu<F>} The submenu
   */
  #makeSubmenu(position, entry) {
    const id = `${this.id}-${String(position)}`
    const menu = new Menu({
      id,
      items: entry.items,
      label: entry.label,
      parent: this,
      rows: this.rows,
      wait: this.wait,
    })
    menu.onSelect((chosen) => {
      this.#selects.emit(chosen)
    })
    return menu
  }

  /**
   * Follows its own state: closing lets go of its submenu and forgets its active item; its list shows as many rows as
   * it has entries, up to `rows`; every change is reported.
   * @returns {void}
   */
  #follow() {
    this.layer.open.subscribe((open) => {
      if (!open) {
        this.#slot.close()
        this.list.active.set(undefined)
      }
      this.#changes.emit(undefined)
    })
    this.list.subscribe(() => {
      this.list.scroll.rows.set(Math.max(ONE, Math.min(this.list.items.count, this.rows)))
      this.#changes.emit(undefined)
    })
    this.point.subscribe(() => {
      this.#changes.emit(undefined)
    })
  }
}

export { Menu }
