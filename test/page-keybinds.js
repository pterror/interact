/**
 * A page where a keybinds CommandHub drives `@interact/components`' command palette, a context menu and command
 * buttons through the command bridge, for the browser test: neither package imports the other.
 * @import { DomMode } from '@interact/dom/css'
 * @import { Command } from 'keybinds/command'
 */

import {
  CommandBridge,
  Menu,
  Palette,
  bindCommandButtons,
  contextMenuElement,
  menuExtensions,
  paletteExtensions,
  openOnContextMenu,
  paletteElement,
  showCommands,
} from '@interact/components'
import { register } from '@interact/dom'
import { CommandHub, defaultScorer, keysUI } from 'keybinds'

import { note, settle } from './seen-keybinds.js'

let selection = false
/** @type {CommandHub | undefined} */
let pageHub = undefined

/**
 * The page's commands: Ctrl+K toggling the palette (hidden from it), two in the File group, and an edit menu's Cut,
 * which applies only to a selection, and Copy.
 * @param {() => void} toggle - Opens or closes the palette
 * @returns {readonly Command[]} The commands
 */
function commands(toggle) {
  return [
    { captureInput: true, execute: toggle, hidden: true, id: 'palette', keys: ['$mod+k'], label: 'Commands' },
    {
      category: 'File',
      execute: () => {
        note('open')
      },
      id: 'open',
      keys: ['$mod+o'],
      label: 'Open file',
    },
    {
      category: 'File',
      execute: () => {
        note('reopen')
      },
      id: 'reopen',
      label: 'Reopen file',
    },
    {
      execute: () => {
        note('cut')
      },
      id: 'cut',
      keys: ['$mod+x'],
      label: 'Cut',
      menu: 'edit',
      when: (now) => now['selection'] === true,
    },
    {
      execute: () => {
        note('copy')
      },
      id: 'copy',
      keys: ['$mod+c'],
      label: 'Copy',
      menu: 'edit',
    },
  ]
}

/**
 * The context the palette lists and runs commands in: every command, no menu's tag.
 * @returns {string | undefined} No tag
 */
function everyCommand() {
  return undefined
}

/**
 * The page's hub, with its commands, Ctrl+K calling `toggle`.
 * @param {() => void} toggle - Opens or closes the palette
 * @returns {CommandHub} The hub
 */
function makeHub(toggle) {
  const hub = new CommandHub({ context: () => ({ selection }), inputs: [keysUI()] })
  const page = commands(toggle)
  hub.setSource('page', () => page)
  hub.refresh()
  return hub
}

/**
 * The page's hub and its palette: the palette searches through a bridge to the hub as a command system ranking by
 * what ran recently (Reopen, just now), and the hub's Ctrl+K opens it.
 * @returns {Readonly<{ hub: CommandHub, palette: Palette<string | undefined> }>} The hub and the palette
 */
function hubAndPalette() {
  /** @type {{ palette?: Palette<string | undefined> }} */
  const held = {}
  const hub = makeHub(() => {
    if (held.palette?.layer.open.get() === true) {
      held.palette.close()
    } else {
      held.palette?.open()
    }
  })
  const scorer = defaultScorer([{ id: 'reopen', timestamp: Date.now() }])
  /** @type {CommandBridge<string | undefined>} */
  const ranked = new CommandBridge(hub.commandSystem({ scorer }))
  const palette = new Palette({
    bridge: ranked,
    context: everyCommand,
    extensions: paletteExtensions(),
    id: 'commands',
  })
  held.palette = palette
  return { hub, palette }
}

/**
 * A button that runs a command.
 * @param {string} command - Its command
 * @param {string} id - Its id
 * @returns {HTMLButtonElement} The button
 */
function commandButton(command, id) {
  const button = document.createElement('button')
  button.dataset['command'] = command
  button.id = id
  button.textContent = command
  return button
}

/**
 * The area the context menu is over, focusable.
 * @returns {HTMLElement} The area
 */
function menuArea() {
  const area = document.createElement('div')
  area.id = 'area'
  area.tabIndex = 0
  area.textContent = 'Right-click here'
  return area
}

/**
 * Puts a toolbar with a Cut button, an area that has the edit menu as its context menu, and the components in the
 * page's main landmark.
 * @returns {Readonly<{ toolbar: HTMLElement, area: HTMLElement }>} The toolbar and the area
 */
function putParts() {
  const toolbar = document.createElement('div')
  toolbar.append(commandButton('cut', 'cut-button'))
  const area = menuArea()
  const main = document.createElement('main')
  main.append(toolbar, area, document.createElement('k-command-palette'), document.createElement('k-context-menu'))
  document.body.append(main)
  return { area, toolbar }
}

/**
 * Makes the page in a DOM mode: the hub and its palette, and the edit menu over the area and the Cut button through a
 * bridge to the hub as a command system that lists in the order registered.
 * @param {DomMode} mode - Where the components live
 * @returns {Promise<void>} When they have rendered
 */
async function putPage(mode) {
  const { hub, palette } = hubAndPalette()
  pageHub = hub
  /** @type {CommandBridge<string | undefined>} */
  const bridge = new CommandBridge(hub.commandSystem())
  const menu = new Menu({ extensions: menuExtensions(), id: 'edit', label: 'Edit' })
  showCommands(menu, bridge, () => 'edit')
  register([paletteElement(() => palette), contextMenuElement(() => menu)], { mode, prefix: 'k' })
  const { area, toolbar } = putParts()
  openOnContextMenu(area, menu)
  bindCommandButtons(toolbar, bridge, () => undefined)
  await settle()
}

/**
 * Selects something, so Cut applies, and tells the hub its context changed.
 * @returns {Promise<void>} When what follows the hub has heard
 */
async function select() {
  selection = true
  pageHub?.syncContext()
  await settle()
}

/**
 * Focuses the area the context menu is over.
 * @returns {void}
 */
function focusArea() {
  const area = document.querySelector('#area')
  if (area instanceof HTMLElement) {
    area.focus()
  }
}

export { focusArea, putPage, select }
