/**
 * Registering every component under its plain `keybinds-<kind>` name, for pages that use them in HTML.
 */

import { KeybindCheatsheet } from './cheatsheet.js'
import { BasicContextMenu } from './components/basic-context-menu.js'
import { ContextMenu } from './components/context-menu.js'
import { KeybindSettings } from './components/settings.js'
import { CommandPalette } from './palette.js'
import { RadialMenu } from './radial-menu.js'

/**
 * Registers every component under its plain `keybinds-<kind>` name, for use in HTML
 * @returns {void}
 */
function registerComponents() {
  for (const component of [
    CommandPalette,
    KeybindCheatsheet,
    BasicContextMenu,
    ContextMenu,
    KeybindSettings,
    RadialMenu,
  ]) {
    const name = `keybinds-${component.kind}`
    if (customElements.get(name) === undefined) {
      customElements.define(name, component)
    }
  }
}

export { registerComponents }
