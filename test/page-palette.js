/**
 * The command palette and the right-click menu over one list of commands, each opened by a command bound with
 * keybinds: Ctrl/Cmd+K opens the palette, a right click on the target opens the menu at the pointer. Unstyled, in the
 * light DOM; what they show is in their aria and data attributes.
 */

import { contextMenu, keybinds, palette } from '@pterror/interact-keybinds'

/**
 * What the palette shows, and where focus is
 * @typedef {Readonly<{ open: boolean, focused: string, query: string, options: readonly string[],
 *   active: string | undefined, named: boolean, ran: readonly string[], pressed: number }>} PaletteSeen
 */

/**
 * What the menu shows, where it is, and where focus is
 * @typedef {Readonly<{ open: boolean, focused: string, items: readonly string[], disabled: readonly string[],
 *   active: string | undefined, left: number, top: number, ran: readonly string[], prevented: boolean }>} MenuSeen
 */

/** @type {string[]} */
const ran = []
let pressed = 0
let menuPrevented = false

/**
 * A command that notes it ran
 * @param {string} id - Its id
 * @param {string} label - Its label
 * @param {Readonly<{ keys?: readonly string[], when?: () => boolean }>} [more] - Its keys, and when it applies
 * @returns {import('@pterror/interact-keybinds/palette').Command} The command
 */
function noting(id, label, more = {}) {
  return {
    id,
    label,
    run() {
      ran.push(id)
    },
    ...more,
  }
}

const COMMANDS = [
  noting('copy', 'Copy', { keys: ['$mod+c'] }),
  noting('cut', 'Cut', { keys: ['$mod+x'] }),
  noting('paste', 'Paste'),
  noting('close', 'Close tab'),
  noting('never', 'Never shown', { when: () => false }),
  noting('start', 'From start', { when: () => document.activeElement?.textContent === 'Start' }),
]

/**
 * Puts a button, the target, and the palette and menu in the page, with their opening commands bound
 * @returns {void}
 */
function putPalette() {
  const start = document.createElement('button')
  start.textContent = 'Start'
  const target = document.createElement('div')
  target.id = 'target'
  target.textContent = 'Right-click here'
  target.style.cssText = 'position: fixed; left: 40px; top: 60px; width: 200px; height: 40px'
  const shownIn = document.createElement('div')
  const menuIn = document.createElement('div')
  document.body.append(start, target, shownIn, menuIn)
  const shown = palette({ commands: () => COMMANDS, element: shownIn, rest: 10 })
  const menu = contextMenu({ element: menuIn, rest: 10 })
  document.addEventListener('contextmenu', (event) => {
    menuPrevented = event.defaultPrevented
  })
  keybinds([
    {
      keys: ['$mod+k'],
      run() {
        shown.open.set(true)
      },
    },
    {
      keys: ['x'],
      run() {
        pressed += 1
      },
    },
  ])
  keybinds(
    [
      {
        mouse: ['RightClick'],
        run(event) {
          if (event instanceof MouseEvent) {
            menu.openAt(
              { getBoundingClientRect: () => new DOMRect(event.clientX, event.clientY, 0, 0) },
              COMMANDS.filter((command) => command.id !== 'close' && command.id !== 'start'),
            )
          }
        },
      },
    ],
    { target },
  )
  start.focus()
}

/**
 * The text of the element an `aria-activedescendant` names
 * @param {Element | undefined} element - The element naming it
 * @returns {string | undefined} The named element's label
 */
function named(element) {
  const id = element?.getAttribute('aria-activedescendant')
  return id === null || id === undefined
    ? undefined
    : (document.querySelector(`#${CSS.escape(id)}`)?.querySelector('span')?.textContent ?? undefined)
}

/**
 * Where focus is, by what it is
 * @returns {string} "field", "menu", a button's text, or "body"
 */
function focusedName() {
  const focused = document.activeElement
  if (focused?.getAttribute('role') === 'combobox') {
    return 'field'
  }
  if (focused?.getAttribute('role') === 'menu') {
    return 'menu'
  }
  return focused instanceof HTMLButtonElement ? focused.textContent : 'body'
}

/**
 * What the palette shows now
 * @returns {PaletteSeen} It
 */
function paletteSeen() {
  const dialog = document.querySelector('[role=dialog]')
  const field = dialog?.querySelector('[role=combobox]')
  const options = [...(dialog?.querySelectorAll('[role=option]') ?? [])]
  const active = options.find((option) => option.getAttribute('aria-selected') === 'true')
  return {
    active: active?.querySelector('span')?.textContent ?? undefined,
    focused: focusedName(),
    named: named(field ?? undefined) === (active?.querySelector('span')?.textContent ?? undefined),
    open: dialog?.matches(':popover-open') ?? false,
    options: options.map(
      (option) =>
        `${option.querySelector('span')?.textContent ?? ''}|${[...option.querySelectorAll('kbd')].map((kbd) => kbd.textContent).join('+')}`,
    ),
    pressed,
    query: field instanceof HTMLInputElement ? field.value : '',
    ran: [...ran],
  }
}

/**
 * What the menu shows now
 * @returns {MenuSeen} It
 */
function menuSeen() {
  const menu = document.querySelector('[role=menu]')
  const items = [...(menu?.querySelectorAll('[role=menuitem]') ?? [])]
  const box = menu?.getBoundingClientRect()
  return {
    active:
      items.find((item) => item instanceof HTMLElement && Object.hasOwn(item.dataset, 'active'))?.querySelector('span')
        ?.textContent ?? undefined,
    disabled: items
      .filter((item) => item.getAttribute('aria-disabled') === 'true')
      .map((item) => item.querySelector('span')?.textContent ?? ''),
    focused: focusedName(),
    items: items.map((item) => item.querySelector('span')?.textContent ?? ''),
    left: box?.left ?? -1,
    open: menu?.matches(':popover-open') ?? false,
    prevented: menuPrevented,
    ran: [...ran],
    top: box?.top ?? -1,
  }
}

export { menuSeen, paletteSeen, putPalette }
