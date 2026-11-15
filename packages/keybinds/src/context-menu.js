/**
 * A ready-made right-click menu, wired from small pieces: the commands it is opened with, as a menu at a point or
 * against an element (list's menu, case 4). It opens with the first command active and focus on it; Up and Down move
 * the active command (wrapping at the ends), Home and End go to the ends, Enter, Space or a click runs it, and the
 * pointer resting on one makes it active. A command whose `when` doesn't hold is `aria-disabled` and doesn't run.
 * Running a command closes the menu first and gives focus back where it was. While open it is a manual popover, kept
 * inside the window, that has focus, so by the overlay rule the page's bindings don't fire; Escape or a press outside
 * closes it. It reads no event to open: the app opens it from a command it binds (`RightClick`, `shift+F10`).
 * Unstyled, in the light DOM: the element is `role=menu`, each item a `role=menuitem` holding the command's label and
 * its bindings as `kbd`s, the active one `data-active`. An app that wants one piece otherwise wires the rest itself:
 * list's arrayList, render, flowMount, ids, mark, activeDescendant, move, wrapStep, hoverIntent, popover, focusWhen
 * and dismiss, with cheatsheetRow(), bindingParts() and focusReturn().
 */

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
  popover,
  render,
  wrapStep,
} from '@pterror/interact-list'

import { bindingParts } from './binding-parts.js'
import { cheatsheetRow } from './cheatsheet-row.js'
import { focusReturn } from './focus-return.js'
import { keybinds } from './keybinds.js'

/**
 * A command as keybinds() binds it, with what it is called: what it does (given the press or click that chose it),
 * when it applies, and its bindings, shown beside it
 * @typedef {Readonly<{
 *   id: string,
 *   label: string,
 *   run: (event: Event) => boolean | void,
 *   when?: () => boolean,
 *   keys?: readonly string[],
 *   mouse?: readonly string[],
 *   pad?: readonly string[],
 * }>} Command
 */

/**
 * What the menu opens against: an element, or a point (`{ getBoundingClientRect: () => new DOMRect(x, y, 0, 0) }`)
 * @typedef {Readonly<{
 *   getBoundingClientRect: () => Readonly<{ left: number, top: number, right: number, bottom: number }>,
 * }>} Anchor
 */

/**
 * @typedef {Readonly<{
 *   element: HTMLElement,
 *   label?: string,
 *   layout?: Readonly<{ get: () => ReadonlyMap<string, string> | undefined }>,
 *   rest?: number,
 * }>} ContextMenuOptions
 */

/** @type {readonly string[]} */
const NONE = []

let made = 0

/**
 * Whether a command applies now
 * @param {Command} command - The command
 * @returns {boolean} Whether its `when` holds, or it has none
 */
function applies(command) {
  return command.when?.() ?? true
}

/**
 * Builds a right-click menu in an element
 * @param {ContextMenuOptions} options - Its element; its label; the person's keyboard layout (layout()), for how
 *   bindings are shown; and how long the pointer rests on a command to make it active, as for hoverIntent()
 * @returns {Readonly<{ openAt: (anchor: Anchor, commands: readonly Command[]) => void, close: () => void,
 *   open: Readonly<{ get: () => boolean, watch: (listener: () => void) => () => void }>, stop: () => void }>}
 *   Opening it with commands below a point or an element (afresh if it is open; with none, it stays closed); closing
 *   it; whether it is open; and stopping
 * @example
 * const menu = contextMenu({ element })
 * keybinds([{ mouse: ['RightClick'], run: (event) => menu.openAt(pointOf(event), messageCommands) }])
 */
function contextMenu({ element, label = 'Actions', layout, rest }) {
  made += 1
  const prefix = `keybinds-menu-${String(made)}`
  const open = cell(false)
  /** @type {Map<string, Command>} */
  const byId = new Map()
  const items = arrayList(NONE)
  /** @type {Anchor} */
  let at = element
  const active = items.hold(undefined, 'next')
  const moves = move({ from: active.get, step: wrapStep(arrayStep(items.keys)), to: active.set })
  /** @type {Map<string, number>} */
  const numbers = new Map()
  /** @type {(id: string) => string} */
  const idOf = (id) => {
    const number = numbers.get(id) ?? numbers.size
    numbers.set(id, number)
    return `${prefix}-${String(number)}`
  }
  const rendered = render({
    create() {
      const item = document.createElement('div')
      item.setAttribute('role', 'menuitem')
      return item
    },
    drawn: items,
    facets: [
      ids(idOf),
      cheatsheetRow({
        entryOf: (id) => byId.get(id),
        parts: (command) => bindingParts(command, layout?.get()),
        watch: () => () => undefined,
      }),
      activeDescendant({ active, element, idOf }),
      mark({ attribute: 'data-active', on: '', test: active }),
      mark({
        attribute: 'aria-disabled',
        on: 'true',
        test: {
          has: (/** @type {string} */ id) => {
            const command = byId.get(id)
            return command !== undefined && !applies(command)
          },
          watch: (listener) =>
            items.watch(() => {
              listener()
            }),
        },
      }),
    ],
    mount: flowMount(element),
  })
  element.setAttribute('role', 'menu')
  element.setAttribute('aria-label', label)
  element.tabIndex = -1

  /**
   * Runs a command, if it applies, closing the menu first
   * @param {string | undefined} id - The command
   * @param {Event} event - What chose it
   * @returns {void}
   */
  const choose = (id, event) => {
    const command = id === undefined ? undefined : byId.get(id)
    if (command !== undefined && applies(command)) {
      open.set(false)
      command.run(event)
    }
  }
  /**
   * @param {Event} event - A click
   * @returns {void}
   */
  const clicked = (event) => {
    const item = rendered.itemOf(event.target)
    if (item !== undefined) {
      choose(item.key, event)
    }
  }
  element.addEventListener('click', clicked)
  const anchor = {
    getBoundingClientRect: () => at.getBoundingClientRect(),
  }
  const stops = [
    rendered.stop,
    open.watch(() => {
      if (!open.get()) {
        items.set(NONE)
        byId.clear()
      }
    }),
    focusReturn({ element, open }),
    popover({ anchor, element, open, side: 'below' }),
    focusWhen({ element, when: open }),
    dismiss({ elements: [element], to: open.set }),
    hoverIntent({ element, itemOf: rendered.itemOf, to: active.set, ...(rest === undefined ? {} : { rest }) }),
    keybinds(
      [
        {
          keys: ['ArrowDown'],
          run() {
            void moves.by(1)
          },
        },
        {
          keys: ['ArrowUp'],
          run() {
            void moves.by(-1)
          },
        },
        {
          keys: ['Home'],
          run() {
            void moves.edge(1)
          },
        },
        {
          keys: ['End'],
          run() {
            void moves.edge(-1)
          },
        },
        {
          keys: ['Enter', 'Space'],
          run(event) {
            choose(active.get(), event)
          },
        },
      ],
      { target: element },
    ),
  ]
  return {
    close() {
      open.set(false)
    },
    open,
    openAt(anchorTo, commands) {
      open.set(false)
      if (commands.length === 0) {
        return
      }
      at = anchorTo
      for (const command of commands) {
        byId.set(command.id, command)
      }
      items.set(commands.map((command) => command.id))
      active.set(items.keys()[0])
      open.set(true)
    },
    stop() {
      open.set(false)
      element.removeEventListener('click', clicked)
      for (const stop of stops) {
        stop()
      }
    },
  }
}

export { contextMenu }
