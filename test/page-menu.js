/**
 * Case 4: a menu button whose menu has submenus, wired by hand from `@pterror/interact-list`, with each level's keys
 * bound by keybinds on the level itself, which is an open popover. Unstyled, in the light DOM; what it shows is in its
 * aria and data attributes.
 */

import { keybinds } from '@pterror/interact-keybinds'
import {
  activeDescendant,
  arrayList,
  arrayStep,
  cell,
  dismiss,
  flowMount,
  focusWhen,
  hoverIntent,
  ids,
  mark,
  move,
  pick,
  popover,
  render,
} from '@pterror/interact-list'

/** Each menu's items: a name is a submenu when it is a menu here too */
const MENUS = new Map([
  ['Edit', ['Cut', 'Copy', 'Paste', 'Find', 'Share']],
  ['Find', ['Find…', 'Replace…', 'Find next']],
  ['Share', ['Email', 'Link']],
])

/** How long the pointer rests on an item before it counts, kept short for the test */
const REST_MS = 50

/**
 * What the menu shows a screen reader, and where focus is
 * @typedef {Readonly<{ expanded: string | undefined, open: readonly string[], focused: string | undefined,
 *   active: Readonly<Record<string, string | undefined>>, ran: string | undefined,
 *   submenus: Readonly<Record<string, string | null>> }>} MenuSeen
 */

/**
 * Whether a menu is open, set and heard
 * @typedef {Readonly<{ get: () => boolean, set: (open: boolean) => void,
 *   watch: (listener: () => void) => () => void }>} Open
 */

/**
 * One menu level: its element, whether it is open, and making its first item active
 * @typedef {Readonly<{ name: string, element: HTMLElement, open: Open, first: () => Promise<void> }>} Level
 */

/** @type {string | undefined} */
const NONE = undefined

/**
 * A menu item's element id
 * @param {string} menu - Its menu
 * @param {string} key - The item
 * @returns {string} Its id
 */
function idOf(menu, key) {
  return `menu-${menu}-${key}`.replaceAll(/[^\w-]/gu, '')
}

/**
 * Puts the menu button and its menus in the page
 * @returns {void}
 */
function putMenu() {
  const button = document.createElement('button')
  button.textContent = 'Edit'
  button.setAttribute('aria-haspopup', 'menu')
  button.setAttribute('aria-expanded', 'false')
  document.body.append(button)
  const focus = cell(NONE)
  focusWhen({ element: button, when: { get: () => focus.get() === 'button', watch: focus.watch } })

  /**
   * Builds a menu level and its submenus
   * @param {string} name - Its menu's name
   * @param {Element} anchor - What it opens against
   * @param {'below' | 'right'} side - Where
   * @param {string | undefined} parent - The level it opens from, if any
   * @param {Open} open - Whether it is open
   * @returns {Level} The level
   */
  const level = (name, anchor, side, parent, open) => {
    const element = document.createElement('div')
    element.id = `menu-${name}`
    element.setAttribute('role', 'menu')
    element.setAttribute('aria-label', name)
    element.tabIndex = -1
    document.body.append(element)
    const list = arrayList(MENUS.get(name) ?? [])
    const active = list.hold(undefined, 'next')
    const openChild = cell(NONE)
    /** @type {Map<string, Level>} */
    const children = new Map()
    const rendered = render({
      create: (key) => {
        const item = document.createElement('div')
        item.setAttribute('role', 'menuitem')
        item.textContent = key
        if (MENUS.has(key)) {
          item.setAttribute('aria-haspopup', 'menu')
          item.setAttribute('aria-controls', `menu-${key}`)
        }
        return item
      },
      drawn: list,
      facets: [
        ids((/** @type {string} */ key) => idOf(name, key)),
        activeDescendant({ active, element, idOf: (key) => idOf(name, key) }),
        mark({ attribute: 'data-active', on: '', test: active }),
        {
          apply(key, item) {
            if (MENUS.has(key)) {
              item.setAttribute('aria-expanded', String(openChild.get() === key))
            }
          },
          watch: (listener) => openChild.watch(listener),
        },
      ],
      mount: flowMount(element),
    })
    for (const key of list.keys()) {
      const item = element.querySelector(`#${idOf(name, key)}`)
      if (MENUS.has(key) && item !== null) {
        children.set(
          key,
          level(key, item, 'right', name, {
            get: () => openChild.get() === key,
            set: (opened) => {
              openChild.set(opened ? key : undefined)
            },
            watch: (listener) => openChild.watch(listener),
          }),
        )
      }
    }
    open.watch(() => {
      if (!open.get()) {
        openChild.set(undefined)
      }
    })
    popover({ anchor, element, open, side })
    focusWhen({ element, when: { get: () => focus.get() === name, watch: focus.watch } })
    const moves = move({ from: active.get, step: arrayStep(list.keys), to: active.set })

    /**
     * Opens the submenu of an item, if it has one, and gives it the keyboard
     * @param {string | undefined} key - The item
     * @returns {boolean} Whether it had one
     */
    const enter = (key) => {
      const child = key === undefined ? undefined : children.get(key)
      if (key === undefined || child === undefined) {
        return false
      }
      openChild.set(key)
      void child.first()
      focus.set(key)
      return true
    }

    const leave = () => {
      open.set(false)
      focus.set(parent ?? 'button')
    }

    /**
     * Runs an item: opens its submenu, or does it and closes every level
     * @param {string | undefined} key - The item
     * @returns {void}
     */
    const run = (key) => {
      if (key !== undefined && !enter(key)) {
        button.dataset['ran'] = key
        root.open.set(false)
        focus.set('button')
      }
    }

    pick({
      element,
      itemOf: rendered.itemOf,
      to: (key) => {
        active.set(key)
        run(key)
      },
    })
    hoverIntent({
      element,
      itemOf: rendered.itemOf,
      rest: REST_MS,
      to: (key) => {
        active.set(key)
        openChild.set(MENUS.has(key) ? key : undefined)
        focus.set(name)
      },
    })
    keybinds(
      [
        {
          keys: ['ArrowDown'],
          run: () => {
            void moves.by(1)
          },
        },
        {
          keys: ['ArrowUp'],
          run: () => {
            void moves.by(-1)
          },
        },
        {
          keys: ['Home'],
          run: () => {
            void moves.edge(1)
          },
        },
        {
          keys: ['End'],
          run: () => {
            void moves.edge(-1)
          },
        },
        {
          keys: ['Enter', 'Space'],
          run: () => {
            run(active.get())
          },
        },
        { keys: ['ArrowRight'], run: () => enter(active.get()) },
        { keys: parent === undefined ? ['Escape'] : ['ArrowLeft', 'Escape'], run: leave },
      ],
      { target: element },
    )
    return { element, first: async () => moves.edge(1), name, open }
  }

  const root = level('Edit', button, 'below', undefined, cell(false))
  root.open.watch(() => {
    button.setAttribute('aria-expanded', String(root.open.get()))
    if (!root.open.get() && focus.get() !== 'button') {
      focus.set(undefined)
    }
  })
  dismiss({ elements: [button, ...document.querySelectorAll('[role=menu]')], to: root.open.set })
  button.addEventListener('click', () => {
    root.open.set(!root.open.get())
    focus.set(root.open.get() ? 'Edit' : 'button')
  })
  keybinds(
    [
      {
        keys: ['ArrowDown'],
        run: () => {
          root.open.set(true)
          void root.first()
          focus.set('Edit')
        },
      },
    ],
    { target: button },
  )
}

/**
 * What the menu shows now
 * @returns {MenuSeen} What a screen reader is told, what is open, and where focus is
 */
function seenMenu() {
  const button = document.querySelector('button[aria-haspopup]')
  const menus = [...document.querySelectorAll('[role=menu]')]
  const focused = document.activeElement
  return {
    active: Object.fromEntries(
      menus.map((menu) => {
        const named = menu.getAttribute('aria-activedescendant')
        return [
          menu.getAttribute('aria-label') ?? '',
          named === null ? undefined : (document.querySelector(`#${CSS.escape(named)}`)?.textContent ?? undefined),
        ]
      }),
    ),
    expanded: button?.getAttribute('aria-expanded') ?? undefined,
    focused:
      focused === button
        ? 'button'
        : focused instanceof HTMLElement
          ? (focused.getAttribute('aria-label') ?? undefined)
          : undefined,
    open: menus.filter((menu) => menu.matches(':popover-open')).map((menu) => menu.getAttribute('aria-label') ?? ''),
    ran: button instanceof HTMLElement ? button.dataset['ran'] : undefined,
    submenus: Object.fromEntries(
      [...document.querySelectorAll('[role=menuitem][aria-haspopup]')].map((item) => [
        item.textContent,
        item.getAttribute('aria-expanded'),
      ]),
    ),
  }
}

/**
 * Where an item is on screen, and where its menu opened, for checking the placement
 * @param {string} item - The item's text
 * @param {string} menu - The submenu's name
 * @returns {Readonly<{ itemRight: number, itemTop: number, menuLeft: number, menuTop: number }>} Their edges
 */
function placement(item, menu) {
  const found = [...document.querySelectorAll('[role=menuitem]')].find((each) => each.textContent === item)
  const at = found?.getBoundingClientRect()
  const opened = document.querySelector(`#menu-${menu}`)?.getBoundingClientRect()
  return {
    itemRight: at?.right ?? -1,
    itemTop: at?.top ?? -1,
    menuLeft: opened?.left ?? -1,
    menuTop: opened?.top ?? -1,
  }
}

export { placement, putMenu, seenMenu }
