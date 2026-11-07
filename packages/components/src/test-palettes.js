/**
 * Palettes for the tests: a command system with a handful of commands, one that can't run, noting what it runs, and a
 * palette over it, the same on the server and in the page.
 * @import { BridgeCommand, CommandSystem } from './command-bridge.js'
 */

import { CommandBridge } from './command-bridge.js'
import { paletteExtensions } from './palette-extensions.js'
import { Palette } from './palette.js'

/** @type {readonly BridgeCommand[]} */
const EDITOR_COMMANDS = [
  { category: 'File', enabled: true, id: 'open', label: 'Open file', shortcut: 'Ctrl+O' },
  { category: 'File', enabled: true, id: 'save', label: 'Save', shortcut: 'Ctrl+S' },
  { category: 'Edit', enabled: false, id: 'undo', label: 'Undo', shortcut: 'Ctrl+Z' },
  { category: 'File', description: 'From the list of recent files', enabled: true, id: 'reopen', label: 'Reopen file' },
  { category: 'View', enabled: true, id: 'zoom', label: 'Zoom in' },
]

/**
 * The editor's command system, calling `ran` with each command it runs.
 * @param {(id: string) => void} ran - Hears what runs
 * @returns {CommandSystem<string>} The system
 */
function editorSystem(ran) {
  return {
    list: () => EDITOR_COMMANDS,
    run: (id) => {
      ran(id)
      return true
    },
  }
}

/**
 * A palette over the editor's commands.
 * @param {(id: string) => void} ran - Hears what runs
 * @returns {Palette<string>} The palette
 */
function editorPalette(ran) {
  return new Palette({
    bridge: new CommandBridge(editorSystem(ran)),
    context: () => 'editor',
    extensions: paletteExtensions(),
    id: 'commands',
  })
}

export { EDITOR_COMMANDS, editorPalette }
