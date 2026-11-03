import type { KeybindCheatsheet, KeybindSettings, RadialMenu } from './index.js'

declare global {
  interface HTMLElementTagNameMap {
    'keybinds-cheatsheet': KeybindCheatsheet
    'keybinds-settings': KeybindSettings
    'keybinds-radial-menu': RadialMenu
  }
}
