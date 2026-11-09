/**
 * The keybinds package's ready-made UI in a page, for what only a browser shows: the radial menu and the cheatsheet
 * as popovers in the top layer, focus moving into them and back, and the settings panel recording a real key.
 * Unstyled, in the light DOM; what it shows is in its aria and data attributes. A page binding on the window (`x`)
 * counts its presses in the body's `data-pressed`.
 */

import { bindingStore, cheatsheet, keybinds, radialMenu, rebindKeys, settings } from '@pterror/interact-keybinds'

/** The point the radial menu opens on */
const POINT = { x: 200, y: 150 }

/** How long the cheatsheet's modifier is held before it opens, kept short for the test */
const HOLD_MS = 50

/** The directions round the radial menu, from the top, clockwise */
const DIRECTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']

/**
 * What the radial menu shows: whether it is open, where focus is, its box's centre, each slot's centre from the centre
 * of the box that holds the slots (its width, from its padding edge; rounded), whether each slot is what the page shows at its centre, and what ran
 * @typedef {Readonly<{ open: boolean, focused: string | undefined, centre: Readonly<{ x: number, y: number }>,
 *   slots: readonly (readonly [number, number])[], onTop: readonly boolean[], ran: string | undefined,
 *   pressed: number }>} RadialSeen
 */

/**
 * What the cheatsheet shows: whether it is open, where focus is, and its rows' text
 * @typedef {Readonly<{ open: boolean, focused: string | undefined, rows: readonly string[] }>} CheatsheetSeen
 */

/**
 * The page's own binding, and a button that has focus, as an app's page has
 * @returns {HTMLButtonElement} The button
 */
function putPage() {
  const button = document.createElement('button')
  button.textContent = 'Start'
  document.body.append(button)
  document.body.dataset['pressed'] = '0'
  keybinds([
    {
      keys: ['x'],
      run: () => {
        document.body.dataset['pressed'] = String(Number(document.body.dataset['pressed']) + 1)
      },
    },
  ])
  button.focus()
  return button
}

/**
 * Where focus is
 * @returns {string | undefined} The focused element's `data-name`, or its text
 */
function focusedName() {
  const focused = document.activeElement
  return focused instanceof HTMLElement ? (focused.dataset['name'] ?? focused.textContent) : undefined
}

/**
 * Puts the page and a radial menu of eight items, under an element covering the page, and opens it on the point
 * @returns {void}
 */
function putRadial() {
  putPage()
  const cover = document.createElement('div')
  cover.style.cssText = 'position: fixed; inset: 0; z-index: 2147483647'
  const element = document.createElement('div')
  element.dataset['name'] = 'menu'
  element.setAttribute('aria-label', 'Directions')
  document.body.append(cover, element)
  const items = DIRECTIONS.map((label) => ({
    label,
    run: () => {
      document.body.dataset['ran'] = label
    },
  }))
  radialMenu({ element, items: () => items }).openAt(POINT)
}

/**
 * What the radial menu shows now
 * @returns {RadialSeen} What it shows
 */
function radialSeen() {
  const menu = document.querySelector('[role=menu]')
  const box = menu?.getBoundingClientRect()
  const extent = menu instanceof HTMLElement ? Number(menu.style.width.slice(0, -'px'.length)) : 0
  const middle = {
    x: (box?.left ?? 0) + (menu?.clientLeft ?? 0) + extent / 2,
    y: (box?.top ?? 0) + (menu?.clientTop ?? 0) + extent / 2,
  }
  const elements = [...document.querySelectorAll('[role=menuitem]')]
  /** @type {readonly Readonly<{ x: number, y: number }>[]} */
  const centres = elements.map((slot) => {
    const at = slot.getBoundingClientRect()
    return { x: (at.left + at.right) / 2, y: (at.top + at.bottom) / 2 }
  })
  return {
    centre: {
      x: box === undefined ? -1 : (box.left + box.right) / 2,
      y: box === undefined ? -1 : (box.top + box.bottom) / 2,
    },
    focused: focusedName(),
    onTop: centres.map(({ x, y }, index) => document.elementFromPoint(x, y) === elements[index]),
    open: menu?.matches(':popover-open') ?? false,
    pressed: Number(document.body.dataset['pressed']),
    ran: document.body.dataset['ran'],
    slots: centres.map(({ x, y }) => [Math.round(x - middle.x), Math.round(y - middle.y)]),
  }
}

/**
 * Puts the page and a cheatsheet opened by holding Shift
 * @returns {void}
 */
function putCheatsheet() {
  putPage()
  const element = document.createElement('div')
  element.dataset['name'] = 'cheatsheet'
  element.setAttribute('aria-label', 'Shortcuts')
  document.body.append(element)
  cheatsheet({
    delay: HOLD_MS,
    element,
    modifier: 'Shift',
    schema: {
      open: { category: 'File', keys: ['ctrl+o'], label: 'Open' },
      save: { category: 'File', keys: ['ctrl+s'], label: 'Save' },
    },
  })
}

/**
 * What the cheatsheet shows now
 * @returns {CheatsheetSeen} What it shows
 */
function cheatsheetSeen() {
  const sheet = document.querySelector('[data-name=cheatsheet]')
  return {
    focused: focusedName(),
    open: sheet?.matches(':popover-open') ?? false,
    rows: [...(sheet?.querySelectorAll('[role=group] > *') ?? [])].map((row) => row.textContent),
  }
}

/**
 * Puts a settings panel of one command, its overrides kept in memory
 * @returns {void}
 */
function putSettings() {
  const element = document.createElement('div')
  document.body.append(element)
  settings({
    element,
    inputs: [rebindKeys()],
    overrides: bindingStore({ load: () => ({}), save: () => undefined }),
    schema: { remove: { keys: ['Delete'], label: 'Remove' } },
  })
}

/**
 * Each key binding the settings panel shows, as its parts
 * @returns {readonly (readonly string[])[]} The parts of each
 */
function settingsChips() {
  return [...document.querySelectorAll('[data-keybinds=keys]')].map((chip) =>
    Array.from(chip.querySelectorAll('kbd'), (part) => part.textContent),
  )
}

export { cheatsheetSeen, putCheatsheet, putRadial, putSettings, radialSeen, settingsChips }
