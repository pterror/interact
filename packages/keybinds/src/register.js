/**
 * Registering every component under its plain `keybinds-<kind>` name, for pages that use them in HTML.
 */

import { BasicContextMenu } from './components/basic-context-menu.js'
import { KeybindCheatsheet } from './components/cheatsheet.js'
import { ContextMenu } from './components/context-menu.js'
import { CommandPalette } from './components/palette.js'
import { RadialMenu } from './components/radial-menu.js'
import { KeybindSettings } from './components/settings.js'

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
