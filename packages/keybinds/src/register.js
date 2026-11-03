/**
 * Registering every component under its plain `keybinds-<kind>` name, for pages that use them in HTML.
 */

import { KeybindCheatsheet } from './cheatsheet.js'
import { RadialMenu } from './radial-menu.js'
import { KeybindSettings } from './settings.js'

/**
 * Registers every component under its plain `keybinds-<kind>` name, for use in HTML
 * @returns {void}
 */
function registerComponents() {
  for (const component of [KeybindCheatsheet, KeybindSettings, RadialMenu]) {
    const name = `keybinds-${component.kind}`
    if (customElements.get(name) === undefined) {
      customElements.define(name, component)
    }
  }
}

export { registerComponents }
