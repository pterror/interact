/**
 * @import { Point } from '@interact/core/intent'
 * @import { Attributes, ListPipeline, RenderRow } from '@interact/core/list-pipeline'
 * @import { ItemSource } from '@interact/core/source'
 * @import { Builder, EffectType, Extension, Facet, Field, State } from '@interact/core/state'
 * @import { TemplateResult } from '@interact/dom/template'
 * @import { ActiveItem } from './active-item.js'
 * @import { MenuEntry, MenuItem } from './menu-entry.js'
 */

import {
  Layer,
  Store,
  defineEffect,
  defineFacet,
  defineField,
  definePlugin,
  inputHandler,
  keyInput,
  listPipeline,
} from '@interact/core'
import { attributes, html, ownElement, viewContent, viewPlugin } from '@interact/dom'

import { active, readNow } from './active-item.js'
import { entryRole, entryText, isSeparator, menuEntries } from './menu-entry.js'

/**
 * An item chosen: which, where, and in which menu of a menu and its submenus.
 * @typedef {Readonly<{ entry: MenuItem, position: number, menu: MenuCore }>} MenuSelect
 */

/**
 * A submenu open from an entry: the entry's position, and the submenu.
 * @typedef {Readonly<{ position: number, menu: Menu }>} OpenSubmenu
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

/**
 * What each menu in a menu's tree is made of besides its core, given that core: the root's, and each submenu's.
 * @typedef {(menu: MenuCore) => Extension} MenuExtensions
 */

/**
 * How a menu starts: an `id` its parts' ids start with (unique in the page for light DOM), its accessible name, its
 * entries, what it is made of besides its core, and, for a submenu, the menu it opens from and its entry's position.
 * @typedef {Readonly<{
 *   id?: string,
 *   label?: string,
 *   items?: ItemSource<MenuEntry>,
 *   extensions?: MenuExtensions,
 *   parent?: MenuCore,
 *   position?: number,
 * }>} MenuOptions
 */

/** @type {Point | undefined} */
const NO_POINT = undefined

/**
 * The parts a row has, beside every row's: its kind's, and whether it is active or disabled.
 * @param {MenuEntry | undefined} entry - Its entry, once read
 * @param {boolean} isActive - Whether it is the active item
 * @returns {string} The parts
 */
function partsOf(entry, isActive) {
  if (entry?.kind === 'separator') {
    return 'separator'
  }
  const disabled = entry?.disabled === true ? ' item-disabled' : ''
  return `item${isActive ? ' item-active' : ''}${disabled}`
}

/**
 * Whether a checkbox or radio item is checked, for `aria-checked`; nothing for other entries.
 * @param {MenuEntry | undefined} entry - The entry
 * @returns {'true' | 'false' | undefined} The state
 */
function checkedOf(entry) {
  if (entry?.kind !== 'checkbox' && entry?.kind !== 'radio') {
    return undefined
  }
  return entry.checked ? 'true' : 'false'
}

/**
 * What shows beside a checked item: a check for a checkbox, a dot for a radio item.
 * @param {MenuEntry | undefined} entry - The entry
 * @returns {string} The mark
 */
function markOf(entry) {
  if (checkedOf(entry) !== 'true') {
    return ''
  }
  return entry?.kind === 'radio' ? '•' : '✓'
}

/**
 * What makes a list a menu, as the WAI-ARIA Authoring Practices menu pattern has it, and no more: the list is a
 * `menu` and its rows are its entries, each with its role, id and state (`aria-checked`, `aria-disabled`,
 * `aria-haspopup`), showing its check mark, label, shortcut and the arrow of a submenu; focus passes over separators
 * and typing finds items by their labels; Enter, Space and a press run an item (`chosen`), and close every menu up to
 * the first, but Space leaves a checkbox or radio item's menu open; it opens in a layer of its own, at a point for a
 * context menu, and nothing is active once it closes; and it asks for focus to come to its list (`askFocus`), which
 * its view gives. Keyboard navigation, typeahead, the pointer, submenus, windowing and a rendering are extensions given
 * beside it.
 */
class MenuCore {
  /**
   * An item chosen.
   * @readonly
   * @type {EffectType<MenuSelect>}
   */
  chosen = defineEffect()
  /**
   * The menu's layer opened or closed.
   * @readonly
   * @type {EffectType<boolean>}
   */
  layerChanged = defineEffect()
  /**
   * Sets the point the menu opens at, or none to open beside its button.
   * @readonly
   * @type {EffectType<Point | undefined>}
   */
  placed = defineEffect()
  /**
   * Asks for focus to come to the menu's list.
   * @readonly
   * @type {EffectType<undefined>}
   */
  askFocus = defineEffect()
  /**
   * The submenu open from one of its entries, as the extension that opens them says.
   * @readonly
   * @type {Facet<(state: State) => OpenSubmenu | undefined, (state: State) => OpenSubmenu | undefined>}
   */
  opened = defineFacet((inputs) => inputs[0] ?? (() => undefined))
  /** @readonly */
  layer = new Layer()
  /**
   * The point it opens at.
   * @readonly
   * @type {Field<Point | undefined>}
   */
  point = defineField({
    create: () => NO_POINT,
    update: (value, transaction) => {
      const placed = transaction.effectsOf(this.placed)
      return placed.length > 0 ? placed.at(-1) : value
    },
  })
  /**
   * How many times focus was asked for.
   * @readonly
   * @type {Field<number>}
   */
  focusAsked = defineField({
    create: () => 0,
    update: (value, transaction) => value + transaction.effectsOf(this.askFocus).length,
  })
  /**
   * @readonly
   * @type {ListPipeline<MenuEntry, TemplateResult, ItemSource<MenuEntry>>}
   */
  list
  /**
   * @readonly
   * @type {ActiveItem<MenuEntry, TemplateResult, ItemSource<MenuEntry>>}
   */
  current

  /** @param {MenuOptions} options - How it starts */
  constructor(options) {
    /** @readonly */
    this.id = options.id ?? 'menu'
    /** @readonly */
    this.label = options.label ?? ''
    /** @readonly */
    this.parent = options.parent
    /** @readonly */
    this.position = options.position
    /** @type {ListPipeline<MenuEntry, TemplateResult, ItemSource<MenuEntry>>} */
    const list = listPipeline(options.items ?? menuEntries([]))
    this.list = list
    this.current = active(list)
  }

  /** @returns {string} The id of its list */
  get listId() {
    return `${this.id}-menu`
  }

  /**
   * The id of the entry at a position.
   * @param {number} position - Where it is
   * @returns {string} Its id
   */
  rowId(position) {
    return `${this.id}-${String(position)}`
  }

  /**
   * Puts the menu's core in a configuration.
   * @param {Builder} into - The configuration being built
   * @param {number} level - Its level
   * @returns {void}
   */
  install(into, level) {
    const { current, list } = this
    /** @type {Extension} */
    const parts = [
      current,
      this.point,
      this.focusAsked,
      current.skip.of(isSeparator),
      list.text.of(entryText),
      list.attributes.of((row, state) => this.#rowAttributes(row, state)),
      list.containerAttributes.of(() => ({
        'aria-label': this.parent === undefined && this.label !== '' ? this.label : undefined,
        'aria-labelledby': this.parent === undefined ? undefined : this.parent.rowId(this.position ?? 0),
        id: this.listId,
        part: 'viewport',
        role: 'menu',
      })),
      list.item.of((row, next, state) => (row.kind === 'item' ? this.#row(row, state) : next(row))),
      inputHandler.of((input, store) => {
        if (input.is(list.press)) {
          return this.activate(store, input.value.position, 'press')
        }
        if (!input.is(keyInput)) {
          return false
        }
        const { alt, key, shift, toggle } = input.value
        const how = key === 'Enter' ? 'enter' : key === ' ' && !alt && !shift && !toggle ? 'space' : undefined
        const at = current.positionIn(store.state)
        return how !== undefined && at !== undefined && this.activate(store, at, how)
      }),
      definePlugin((store) => ({
        destroy: this.layer.open.subscribe((open) => {
          const forget = open ? [] : [current.moved.of({ entering: false, shift: false, to: undefined })]
          store.dispatch({ effects: [this.layerChanged.of(open), ...forget] })
        }),
      })),
      viewContent.of((state) => list.render(state)),
      viewPlugin((store, root) => {
        let given = 0
        return {
          rendered: () => {
            const asked = store.state.field(this.focusAsked)
            if (asked > given && this.layer.open.get()) {
              given = asked
              ownElement(root, '[data-list]')?.focus({ preventScroll: true })
            }
          },
        }
      }),
    ]
    into.add(parts, level)
  }

  /**
   * Opens the menu, with focus on its first or last item, or on none yet.
   * @param {Store} store - The menu's store
   * @param {OpenFocus} focus - Where focus goes
   * @returns {void}
   */
  open(store, focus) {
    this.layer.open.request(true)
    const { state } = store
    const count = this.list.listOf(state).count()
    const at =
      focus === 'none'
        ? undefined
        : focus === 'last'
          ? this.current.landing(state, count - 1, -1)
          : this.current.landing(state, 0, 1)
    if (at !== undefined) {
      store.dispatch({ effects: this.current.go(at) })
    }
  }

  /**
   * Closes the first menu of the tree this one is in, and with it every submenu, as running an item does.
   * @returns {void}
   */
  closeAll() {
    if (this.parent === undefined) {
      this.layer.open.request(false)
    } else {
      this.parent.closeAll()
    }
  }

  /**
   * Runs the item at a position: a command, checkbox or radio item is reported (`chosen`), then every menu up to the
   * first closes, unless it was a checkbox or radio item activated with Space. A disabled item does nothing. A
   * separator, or a submenu's entry, which an extension opens, isn't an item to run.
   * @param {Store} store - The menu's store
   * @param {number} position - Where it is
   * @param {Activation} how - What activated it
   * @returns {boolean} Whether there was an item to run there
   */
  activate(store, position, how) {
    const entry = readNow(this.list.listOf(store.state), position)?.item
    if (entry === undefined || entry.kind === 'separator' || entry.kind === 'submenu') {
      return false
    }
    if (entry.disabled === true) {
      return true
    }
    store.dispatch({ effects: this.chosen.of({ entry, menu: this, position }) })
    if (how !== 'space' || entry.kind === 'command') {
      this.closeAll()
    }
    return true
  }

  /**
   * An entry's attributes: its id, role, state and parts.
   * @param {RenderRow<MenuEntry>} row - Its row
   * @param {State} state - The state
   * @returns {Attributes} The attributes
   */
  #rowAttributes(row, state) {
    if (row.kind !== 'item') {
      return {}
    }
    const entry = row.item
    const item = entry?.kind === 'separator' ? undefined : entry
    return {
      'aria-checked': checkedOf(entry),
      'aria-disabled': item?.disabled === true ? 'true' : undefined,
      'aria-haspopup': item?.kind === 'submenu' ? 'menu' : undefined,
      id: this.rowId(row.position),
      part: partsOf(entry, this.current.positionIn(state) === row.position),
      role: entry === undefined ? 'menuitem' : entryRole(entry),
    }
  }

  /**
   * An entry's row: its check mark, label, shortcut and a submenu's arrow, with every extension's attributes. One
   * template for every kind, so a row keeps its node whatever its entry turns out to be.
   * @param {RenderRow<MenuEntry>} row - Its row
   * @param {State} state - The state
   * @returns {TemplateResult} The row
   */
  #row(row, state) {
    const entry = row.kind === 'item' ? row.item : undefined
    const item = entry?.kind === 'separator' ? undefined : entry
    const shortcut = item !== undefined && item.kind !== 'submenu' ? (item.shortcut ?? '') : ''
    return html`<div ${attributes(this.list.attributesOf(row, state))}
      ><span part="check" aria-hidden="true">${markOf(entry)}</span><span part="label">${item?.label ?? ''}</span
      ><span part="shortcut">${shortcut}</span
      ><span part="arrow" aria-hidden="true">${item?.kind === 'submenu' ? '›' : ''}</span></div
    >`
  }
}

/**
 * A menu: its core and the extensions it is made of, as a store, with what an app and a view do to it. Its entries,
 * its layer and the point it opens at are its core's; what is chosen in it or in any submenu of it is reported to
 * `onSelect`.
 */
class Menu extends Store {
  /** @param {MenuOptions} [options] - How it starts */
  constructor(options = {}) {
    const core = new MenuCore(options)
    super([core, options.extensions?.(core) ?? []])
    /** @readonly */
    this.core = core
  }

  /** @returns {Layer} The layer it opens in */
  get layer() {
    return this.core.layer
  }

  /** @returns {Point | undefined} The point it opens at, as a context menu does; beside its button otherwise */
  get point() {
    return this.state.field(this.core.point)
  }

  /** @returns {number | undefined} The position of the active entry, if any */
  get active() {
    return this.core.current.positionIn(this.state)
  }

  /** @returns {OpenSubmenu | undefined} The submenu open from one of its entries, and which */
  get submenu() {
    return this.state.facet(this.core.opened)(this.state)
  }

  /**
   * The entry at a position, if it has been read.
   * @param {number} position - Where it is
   * @returns {MenuEntry | undefined} The entry
   */
  entry(position) {
    return readNow(this.core.list.listOf(this.state), position)?.item
  }

  /** @returns {number} How many entries it has */
  get count() {
    return this.core.list.listOf(this.state).count()
  }

  /**
   * Shows other entries.
   * @param {ItemSource<MenuEntry>} items - The entries
   * @returns {void}
   */
  setItems(items) {
    this.dispatch({ effects: this.core.list.setSource.of(items) })
  }

  /**
   * Opens the menu, with focus on its first or last item, or on none yet.
   * @param {OpenFocus} [focus] - Where focus goes
   * @returns {void}
   */
  open(focus = 'first') {
    this.core.open(this, focus)
  }

  /**
   * Opens the menu at a point, as a context menu, with focus on its first item.
   * @param {Point} point - Where, in pixels from the viewport's top left
   * @returns {void}
   */
  openAt(point) {
    this.dispatch({ effects: this.core.placed.of(point) })
    this.open('first')
  }

  /**
   * Asks to close the menu, and with it any submenu open from it.
   * @returns {void}
   */
  close() {
    this.core.layer.open.request(false)
  }

  /**
   * Calls `listener` with every item chosen, in this menu or a submenu of it.
   * @param {(chosen: MenuSelect) => void} listener - What to call
   * @returns {() => void} Stops calling it
   */
  onSelect(listener) {
    return this.subscribe((transaction) => {
      for (const chosen of transaction.effectsOf(this.core.chosen)) {
        listener(chosen)
      }
    })
  }
}

export { Menu, MenuCore }
