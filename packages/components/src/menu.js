/**
 * @import { Point } from '@interact/core/intent'
 * @import { Source } from '@interact/core/source'
 * @import { MenuEntry, MenuItem } from './menu-entry.js'
 */

import { Controllable, Layer, Listeners, insideArea } from '@interact/core'

import { landing } from './landing.js'
import { Listbox } from './listbox.js'
import { entryText, isSeparator } from './menu-entry.js'

/**
 * Waits, then runs something, unless stopped first.
 * @typedef {(milliseconds: number, run: () => void) => () => void} Wait
 */

/**
 * How a menu starts: its entries, an `id` its parts' ids start with (unique in the page for light DOM), its accessible
 * name, the most rows it shows before scrolling, how it waits (a test's clock, say), and, for a submenu, the menu it
 * opens from, which sets it.
 * @template F
 * @typedef {Readonly<{
 *   items?: Source<MenuEntry<F>, F>,
 *   id?: string,
 *   label?: string,
 *   rows?: number,
 *   wait?: Wait,
 *   parent?: Menu<F>,
 * }>} MenuOptions
 */

/**
 * An item chosen: which, where, and in which menu of a menu and its submenus.
 * @template F
 * @typedef {Readonly<{ entry: MenuItem<F>, position: number, menu: Menu<F> }>} MenuSelect
 */

/**
 * A submenu open from an entry: the entry's position, and the submenu.
 * @template F
 * @typedef {Readonly<{ position: number, menu: Menu<F> }>} OpenSubmenu
 */

/**
 * How an item was activated: Enter, Space, or a press with the pointer. Space on a checkbox or radio item leaves the
 * menu open; anything else that runs an item closes it.
 * @typedef {'enter' | 'space' | 'press'} Activation
 */

/**
 * Where focus goes as a menu opens: its first item, its last, or nowhere yet (a submenu opened by the pointer resting
 * on its entry).
 * @typedef {'first' | 'last' | 'none'} OpenFocus
 */

const DEFAULT_ROWS = 10
/** How long the pointer rests on an entry before its submenu opens, as zag.js's menu waits. */
const OPEN_DELAY = 200
/** @type {Point | undefined} */
const NO_POINT = undefined

/**
 * Waits with a timer.
 * @type {Wait}
 */
function waitWithTimer(milliseconds, run) {
  const timer = setTimeout(run, milliseconds)
  return () => {
    clearTimeout(timer)
  }
}

/**
 * A menu's behavior, with no DOM: its entries in a listbox that selects nothing and passes over separators, the layer
 * it opens in, the point it opens at (a context menu) if not beside its button, and the submenu open from it, with
 * what the pointer is doing about it: one about to open once the pointer has rested on its entry, and the area the
 * pointer may cross on its way to the open one. Submenus are menus of their own, each in a layer above its parent's.
 * An item chosen in a submenu is reported by `onSelect` on every menu above it too.
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
  /** @type {OpenSubmenu<F> | undefined} */
  #opened = undefined
  /** @type {(() => void) | undefined} */
  #unfollowSubmenu = undefined
  /**
   * Stops a submenu about to open.
   * @type {(() => void) | undefined}
   */
  #pending = undefined
  /**
   * The area the pointer may cross on its way to the open submenu.
   * @type {readonly Point[] | undefined}
   */
  #heading = undefined
  /**
   * The entry the pointer is over.
   * @type {number | undefined}
   */
  #pointed = undefined

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
    this.#follow()
    this.list.source.set(options.items)
  }

  /** @returns {OpenSubmenu<F> | undefined} The submenu open from one of its entries, and which */
  get submenu() {
    return this.#opened
  }

  /**
   * Opens the menu, with focus on its first or last item, or on none yet.
   * @param {OpenFocus} [focus] - Where focus goes
   * @returns {void}
   */
  open(focus = 'first') {
    this.layer.open.request(true)
    const { count } = this.list.items
    const at = focus === 'last' ? landing(this.list, count - 1, -1) : landing(this.list, 0, 1)
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
   * Opens the submenu of the entry at a position, closing any other, with focus on its first item if `focus`. The
   * submenu is made now unless it is the one open: a menu of its own, whose choices are this menu's too. One that
   * closes by itself (Escape, the arrow back) is let go, and focus comes back to this menu.
   * @param {number} position - The entry's position
   * @param {boolean} focus - Whether focus goes into the submenu
   * @returns {boolean} Whether the entry has a submenu, enabled
   */
  openSubmenu(position, focus) {
    const entry = this.list.items.item(position)
    if (entry?.kind !== 'submenu' || entry.disabled === true) {
      return false
    }
    this.#cancel()
    let menu = this.#opened?.position === position ? this.#opened.menu : undefined
    if (menu === undefined) {
      this.#closeSubmenu()
      const made = new Menu({
        id: `${this.id}-${String(position)}`,
        items: entry.items,
        label: entry.label,
        parent: this,
        rows: this.rows,
        wait: this.wait,
      })
      made.onSelect((chosen) => {
        this.#selects.emit(chosen)
      })
      const stops = [
        made.subscribe(() => {
          this.#changes.emit(undefined)
        }),
        made.layer.open.subscribe((open) => {
          if (!open && this.#opened?.menu === made) {
            this.#closeSubmenu()
            this.#wantsFocus = true
          }
        }),
      ]
      this.#unfollowSubmenu = () => {
        for (const stop of stops) {
          stop()
        }
      }
      this.#opened = { menu: made, position }
      menu = made
    }
    menu.open(focus ? 'first' : 'none')
    menu.#wantsFocus = focus
    return true
  }

  /**
   * The pointer is over the entry at a position: it becomes active, and its submenu opens once the pointer has rested
   * there, any other submenu closing; moving on over the same entry changes nothing. Crossing entries on the way to the
   * open submenu (see `headFor`) does nothing; once the pointer strays outside that area, it is no longer on its way.
   * @param {number} position - Where the entry is
   * @param {Point} pointer - Where the pointer is
   * @returns {boolean} Whether the menu took it, so its list should have focus
   */
  pointTo(position, pointer) {
    const entry = this.list.items.item(position)
    if (entry === undefined || entry.kind === 'separator') {
      return false
    }
    const crossing =
      this.#heading !== undefined && this.#opened?.position !== position && insideArea(pointer, this.#heading)
    if (crossing) {
      return false
    }
    this.#heading = undefined
    if (this.parent !== undefined) {
      this.parent.#heading = undefined
      this.parent.#cancel()
    }
    this.list.active.request(position)
    if (this.#pointed === position) {
      return true
    }
    this.#cancel()
    if (this.#opened?.position !== position) {
      this.#closeSubmenu()
    }
    this.#pointed = position
    if (entry.kind === 'submenu' && entry.disabled !== true && this.#opened === undefined) {
      this.#pending = this.wait(OPEN_DELAY, () => {
        this.#pending = undefined
        this.openSubmenu(position, false)
      })
    }
    return true
  }

  /**
   * The pointer left an entry toward its open submenu: while it stays inside `area`, crossing other entries leaves the
   * submenu open.
   * @param {readonly Point[]} area - Where it may pass (see `intentArea`)
   * @returns {void}
   */
  headFor(area) {
    this.#heading = area
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
   * Stops a submenu about to open.
   * @returns {void}
   */
  #cancel() {
    this.#pending?.()
    this.#pending = undefined
  }

  /**
   * Closes and lets go of the submenu, if one is open, and stops one about to open.
   * @returns {void}
   */
  #closeSubmenu() {
    const open = this.#opened
    this.#cancel()
    this.#heading = undefined
    this.#pointed = undefined
    this.#unfollowSubmenu?.()
    this.#unfollowSubmenu = undefined
    this.#opened = undefined
    if (open !== undefined) {
      open.menu.layer.open.set(false)
      this.#changes.emit(undefined)
    }
  }

  /**
   * Follows its own state: closing lets go of its submenu and forgets its active item; its list shows as many rows as
   * it has entries, up to `rows`; every change is reported.
   * @returns {void}
   */
  #follow() {
    this.layer.open.subscribe((open) => {
      if (!open) {
        this.#closeSubmenu()
        this.list.active.set(undefined)
      }
      this.#changes.emit(undefined)
    })
    this.list.subscribe(() => {
      this.list.scroll.rows.set(Math.max(1, Math.min(this.list.items.count, this.rows)))
      this.#changes.emit(undefined)
    })
    this.point.subscribe(() => {
      this.#changes.emit(undefined)
    })
  }
}

export { Menu }
