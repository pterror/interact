/**
 * @import { Point } from '@interact/core/intent'
 * @import { Hover } from '@interact/core/list-pipeline'
 * @import { Builder, Effect, EffectType, Extension, Field } from '@interact/core/state'
 * @import { Store } from '@interact/core/store'
 * @import { Placement } from '@interact/dom/anchored'
 * @import { Mount } from '@interact/dom/store-view'
 * @import { MenuCore, MenuExtensions, OpenSubmenu } from './menu.js'
 */

import {
  defineEffect,
  defineField,
  definePlugin,
  inputHandler,
  insideArea,
  intentArea,
  keyInput,
  precedence,
} from '@interact/core'
import {
  contentOf,
  html,
  inOwnView,
  mountStore,
  ownElement,
  releaseOverlay,
  syncOverlay,
  viewPlugin,
} from '@interact/dom'

import { readNow } from './active-item.js'
import { Menu } from './menu.js'

/**
 * Waits, then runs something, unless stopped first.
 * @typedef {(milliseconds: number, run: () => void) => () => void} Wait
 */

/**
 * The submenu open, and what the pointer is doing about it: the entry it is over, the entry whose submenu opens once it
 * has rested there, and the area it may cross on its way to the open one. And which way text runs, which says which
 * arrow is toward the inline end.
 * @typedef {Readonly<{
 *   open: OpenSubmenu | undefined,
 *   pointed: number | undefined,
 *   pending: number | undefined,
 *   heading: readonly Point[] | undefined,
 *   direction: 'ltr' | 'rtl',
 * }>} Submenus
 */

/** How long the pointer rests on an entry before its submenu opens, as zag.js's menu waits. */
const OPEN_DELAY = 200

/**
 * Where a submenu goes: beside its entry toward the inline end, lined up with it.
 * @type {Partial<Placement>}
 */
const PLACEMENT = { align: 'start', gap: 0, side: 'inline-end' }

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
 * Nothing open, and the pointer doing nothing about it.
 * @param {'ltr' | 'rtl'} direction - Which way text runs
 * @returns {Submenus} The state
 */
function closed(direction) {
  return { direction, heading: undefined, open: undefined, pending: undefined, pointed: undefined }
}

/**
 * Submenus, as the WAI-ARIA Authoring Practices menu pattern has them: a submenu's entry opens it with Enter, Space or
 * the arrow toward the inline end, focus going to its first item, and with a press, focus staying; the arrow back, in a
 * submenu, closes it; a submenu closing by itself gives focus back to the menu it opened from. A submenu is a menu of
 * its own, made the way the first one was (`extensions`), shown in an overlay inside its menu's beside its entry, and
 * what is chosen in it is chosen in its menu too; it closes when its menu does. With the pointer, an entry's submenu
 * opens once the pointer has rested there (`OPEN_DELAY`), and any other closes; leaving an entry toward its open
 * submenu notes the area the pointer may cross on its way there (`intentArea`), and while it stays inside, crossing
 * other entries changes nothing.
 */
class SubmenuExtension {
  /**
   * @readonly
   * @type {EffectType<OpenSubmenu | undefined>}
   */
  opened = defineEffect()
  /**
   * @readonly
   * @type {EffectType<number | undefined>}
   */
  pointed = defineEffect()
  /**
   * @readonly
   * @type {EffectType<number | undefined>}
   */
  pending = defineEffect()
  /**
   * @readonly
   * @type {EffectType<readonly Point[] | undefined>}
   */
  headed = defineEffect()
  /**
   * @readonly
   * @type {EffectType<'ltr' | 'rtl'>}
   */
  directed = defineEffect()
  /**
   * The open submenu changed what it shows.
   * @readonly
   * @type {EffectType<undefined>}
   */
  changed = defineEffect()
  /**
   * @readonly
   * @type {Field<Submenus>}
   */
  field
  /**
   * @readonly
   * @type {MenuCore}
   */
  #menu
  /**
   * @readonly
   * @type {MenuExtensions}
   */
  #extensions
  /**
   * @readonly
   * @type {Wait}
   */
  #wait

  /**
   * @param {MenuCore} menu - The menu
   * @param {MenuExtensions} extensions - What a submenu is made of besides its core
   * @param {Wait} wait - How it waits
   */
  constructor(menu, extensions, wait) {
    this.#menu = menu
    this.#extensions = extensions
    this.#wait = wait
    this.field = defineField({
      create: () => closed('ltr'),
      update: (value, transaction) => {
        if (transaction.effectsOf(menu.layerChanged).includes(false)) {
          return closed(value.direction)
        }
        let next = value
        for (const effect of transaction.effects) {
          next = this.#after(next, effect)
        }
        return next
      },
    })
  }

  /**
   * Puts submenus in a configuration.
   * @param {Builder} into - The configuration being built
   * @param {number} level - Its level
   * @returns {void}
   */
  install(into, level) {
    const menu = this.#menu
    const { list } = menu
    /** @type {Extension} */
    const parts = [
      menu,
      this.field,
      menu.opened.of((state) => state.field(this.field).open),
      list.attributes.of((row, state) =>
        row.kind === 'item' && row.item?.kind === 'submenu'
          ? { 'aria-expanded': String(state.field(this.field).open?.position === row.position) }
          : {},
      ),
      list.container.of((children, next, state) => {
        const open = state.field(this.field).open
        const shown =
          open === undefined
            ? undefined
            : html`<div part="overlay submenu" popover="manual">${contentOf(open.menu)}</div>`
        return html`${next(children)}${shown}`
      }),
      precedence(
        'high',
        inputHandler.of((input, store) => {
          if (input.is(list.hover)) {
            return this.#hover(input.value, store)
          }
          if (input.is(list.press)) {
            return this.#isSubmenu(store, input.value.position) && this.open(store, input.value.position, false)
          }
          return input.is(keyInput) && this.#key(input.value.key, store)
        }),
      ),
      this.#plugin(),
      this.#page(),
    ]
    into.add(parts, level)
  }

  /**
   * Opens the submenu of the entry at a position, closing any other, with focus on its first item if `focus`; the one
   * open from it already stays.
   * @param {Store} store - The menu's store
   * @param {number} position - The entry's position
   * @param {boolean} focus - Whether focus goes into the submenu
   * @returns {boolean} Whether the entry has a submenu, enabled
   */
  open(store, position, focus) {
    const menu = this.#menu
    const entry = readNow(menu.list.listOf(store.state), position)?.item
    if (entry?.kind !== 'submenu' || entry.disabled === true) {
      return false
    }
    const { open, pending } = store.state.field(this.field)
    let submenu = open?.position === position ? open.menu : undefined
    if (submenu === undefined) {
      submenu = new Menu({
        extensions: this.#extensions,
        id: menu.rowId(position),
        items: entry.items,
        label: entry.label,
        parent: menu,
        position,
      })
      store.dispatch({ effects: this.opened.of({ menu: submenu, position }) })
    } else if (pending !== undefined) {
      store.dispatch({ effects: this.pending.of(undefined) })
    }
    submenu.open(focus ? 'first' : 'none')
    if (focus) {
      submenu.dispatch({ effects: submenu.core.askFocus.of(undefined) })
    }
    return true
  }

  /**
   * The state after one effect.
   * @param {Submenus} value - The state before
   * @param {Effect<unknown>} effect - The effect
   * @returns {Submenus} The state after
   */
  #after(value, effect) {
    if (effect.is(this.opened)) {
      return { ...closed(value.direction), open: effect.value }
    }
    if (effect.is(this.pointed)) {
      return { ...value, pointed: effect.value }
    }
    if (effect.is(this.pending)) {
      return { ...value, pending: effect.value }
    }
    if (effect.is(this.headed)) {
      return { ...value, heading: effect.value }
    }
    return effect.is(this.directed) ? { ...value, direction: effect.value } : value
  }

  /**
   * Whether the entry at a position opens a submenu.
   * @param {Store} store - The menu's store
   * @param {number} position - Where it is
   * @returns {boolean} Whether it does
   */
  #isSubmenu(store, position) {
    return readNow(this.#menu.list.listOf(store.state), position)?.item.kind === 'submenu'
  }

  /**
   * A key: the arrow toward the inline end, Enter or Space on a submenu's entry opens it with focus in it; the arrow
   * back closes this menu if it is a submenu.
   * @param {string} key - The key
   * @param {Store} store - The menu's store
   * @returns {boolean} Whether it was taken
   */
  #key(key, store) {
    const menu = this.#menu
    const { direction } = store.state.field(this.field)
    const [inward, outward] = direction === 'rtl' ? ['ArrowLeft', 'ArrowRight'] : ['ArrowRight', 'ArrowLeft']
    const at = menu.current.positionIn(store.state)
    if (key === outward) {
      if (menu.parent !== undefined) {
        menu.layer.open.request(false)
      }
      return menu.parent !== undefined
    }
    const opens = key === inward || ((key === 'Enter' || key === ' ') && at !== undefined && this.#isSubmenu(store, at))
    return opens && at !== undefined && this.open(store, at, true)
  }

  /**
   * The pointer over an entry: crossing entries on its way to the open submenu takes the move, changing nothing;
   * otherwise it is no longer on its way, and a new entry under it closes any other submenu and starts its own
   * opening. The entry becomes active by whatever follows the pointer.
   * @param {Hover} hover - The move
   * @param {Store} store - The menu's store
   * @returns {boolean} Whether it took the move
   */
  #hover({ position, x, y }, store) {
    const entry = readNow(this.#menu.list.listOf(store.state), position)?.item
    if (entry === undefined || entry.kind === 'separator') {
      return false
    }
    const { heading, open, pointed } = store.state.field(this.field)
    if (heading !== undefined && open?.position !== position && insideArea({ x, y }, heading)) {
      return true
    }
    /** @type {Effect<unknown>[]} */
    const effects = heading === undefined ? [] : [this.headed.of(undefined)]
    if (pointed !== position) {
      const other = open !== undefined && open.position !== position
      const waits = entry.kind === 'submenu' && entry.disabled !== true && (open === undefined || other)
      effects.push(
        ...(other ? [this.opened.of(undefined)] : []),
        this.pointed.of(position),
        this.pending.of(waits ? position : undefined),
      )
    }
    if (effects.length > 0) {
      store.dispatch({ effects })
    }
    return false
  }

  /**
   * What follows the open submenu: its changes shown, what is chosen in it chosen here too, and its closing by itself
   * giving focus back here; one let go is closed. And the wait for a submenu about to open.
   * @returns {Extension} The plugin
   */
  #plugin() {
    const menu = this.#menu
    return definePlugin((store) => {
      /** @type {Readonly<{ submenu: Menu, stop: () => void }> | undefined} */
      let following = undefined
      /** @type {Readonly<{ position: number, stop: () => void }> | undefined} */
      let waiting = undefined
      /**
       * Follows a submenu.
       * @param {Menu} submenu - The submenu
       * @returns {() => void} Stops
       */
      const follow = (submenu) => {
        const stops = [
          submenu.subscribe((transaction) => {
            const chosen = transaction.effectsOf(submenu.core.chosen).map((each) => menu.chosen.of(each))
            store.dispatch({ effects: [this.changed.of(undefined), ...chosen] })
          }),
          submenu.layer.open.subscribe((open) => {
            if (!open && store.state.field(this.field).open?.menu === submenu) {
              store.dispatch({ effects: [this.opened.of(undefined), menu.askFocus.of(undefined)] })
            }
          }),
        ]
        return () => {
          for (const stop of stops) {
            stop()
          }
        }
      }
      return {
        destroy: () => {
          following?.stop()
          waiting?.stop()
        },
        update: (transaction) => {
          const { open, pending } = transaction.state.field(this.field)
          if (open?.menu !== following?.submenu) {
            const was = following?.submenu
            following?.stop()
            following = open === undefined ? undefined : { stop: follow(open.menu), submenu: open.menu }
            if (was?.layer.open.get() === true) {
              was.layer.open.set(false)
            }
          }
          if (pending !== waiting?.position) {
            waiting?.stop()
            waiting =
              pending === undefined
                ? undefined
                : {
                    position: pending,
                    stop: this.#wait(OPEN_DELAY, () => {
                      waiting = undefined
                      this.open(store, pending, false)
                    }),
                  }
          }
        },
      }
    })
  }

  /**
   * What submenus do in the page: the open one shown in its overlay beside its entry, its own view running there; the
   * way text runs read as an arrow is pressed; the area the pointer may cross noted as it leaves the open one's entry;
   * and the pointer reaching the submenu ending its way there.
   * @returns {Extension} The view plugin
   */
  #page() {
    const menu = this.#menu
    return viewPlugin((store, root) => {
      /** @type {Readonly<{ submenu: Menu, element: HTMLElement, mount: Mount }> | undefined} */
      let shown = undefined
      /** @returns {void} */
      const release = () => {
        if (shown !== undefined) {
          shown.mount.destroy()
          releaseOverlay(shown.element)
          shown = undefined
        }
      }
      /**
       * An arrow pressed: which way text runs where it was.
       * @param {Event} event - The key
       * @returns {void}
       */
      const keydown = (event) => {
        const { target } = event
        const arrow = event instanceof KeyboardEvent && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')
        if (!arrow || !(target instanceof Element) || !inOwnView(root, target)) {
          return
        }
        const direction = getComputedStyle(target).direction === 'rtl' ? 'rtl' : 'ltr'
        if (direction !== store.state.field(this.field).direction) {
          store.dispatch({ effects: this.directed.of(direction) })
        }
      }
      /**
       * The pointer leaving a row: the open submenu's entry, toward it.
       * @param {Event} event - The leaving
       * @returns {void}
       */
      const pointerleave = (event) => {
        const { target } = event
        const open = store.state.field(this.field).open
        const isRow = target instanceof HTMLElement && target.dataset['position'] !== undefined
        if (!(event instanceof PointerEvent) || !isRow || !inOwnView(root, target) || shown === undefined) {
          return
        }
        if (Number(target.dataset['position']) === open?.position) {
          const rect = shown.element.getBoundingClientRect()
          const area = { height: rect.height, width: rect.width, x: rect.x, y: rect.y }
          store.dispatch({ effects: this.headed.of(intentArea({ x: event.clientX, y: event.clientY }, area)) })
        }
      }
      /**
       * The pointer in the open submenu: it got there.
       * @param {Event} event - The move
       * @returns {void}
       */
      const pointermove = (event) => {
        const { heading, pending } = store.state.field(this.field)
        const there = event.target instanceof Node && shown?.element.contains(event.target) === true
        if (there && (heading !== undefined || pending !== undefined)) {
          store.dispatch({ effects: [this.headed.of(undefined), this.pending.of(undefined)] })
        }
      }
      root.addEventListener('keydown', keydown, true)
      root.addEventListener('pointerleave', pointerleave, true)
      root.addEventListener('pointermove', pointermove)
      return {
        destroy: () => {
          root.removeEventListener('keydown', keydown, true)
          root.removeEventListener('pointerleave', pointerleave, true)
          root.removeEventListener('pointermove', pointermove)
          release()
        },
        rendered: () => {
          const open = store.state.field(this.field).open
          const element = open === undefined ? undefined : ownElement(root, '[part~="submenu"]')
          if (shown !== undefined && (shown.submenu !== open?.menu || shown.element !== element)) {
            release()
          }
          if (open === undefined || element === undefined) {
            return
          }
          const row = ownElement(root, `[id="${menu.rowId(open.position)}"]`) ?? element
          syncOverlay(element, open.menu.layer, { anchor: row, focus: 'stay', placement: PLACEMENT })
          shown ??= { element, mount: mountStore(open.menu, element), submenu: open.menu }
          shown.mount.rendered()
        },
      }
    })
  }
}

/**
 * Submenus for a menu, each made the way it was.
 * @param {MenuCore} menu - The menu
 * @param {Readonly<{ extensions: MenuExtensions, wait?: Wait | undefined }>} options - What a submenu is made of
 *   besides its core, and how the pointer's rest is waited for (a test's clock, say)
 * @returns {SubmenuExtension} The extension
 */
function submenus(menu, options) {
  return new SubmenuExtension(menu, options.extensions, options.wait ?? waitWithTimer)
}

export { SubmenuExtension, submenus }
