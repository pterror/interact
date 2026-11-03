import type { BasicContextMenu, CommandPalette, ContextMenu, KeybindCheatsheet, KeybindSettings } from './index.js'

declare global {
  interface HTMLElementTagNameMap {
    'keybinds-command-palette': CommandPalette
    'keybinds-cheatsheet': KeybindCheatsheet
    'keybinds-settings': KeybindSettings
    'keybinds-basic-context-menu': BasicContextMenu
    'keybinds-context-menu': ContextMenu
  }
}
