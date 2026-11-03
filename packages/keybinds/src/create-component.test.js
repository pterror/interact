import { describe, expect, test } from 'bun:test'

import { createComponent } from './create-component.js'
import { CommandPalette } from './palette.js'
import { RadialMenu } from './radial-menu.js'
import { defineOnce } from './test-components.js'

describe('createComponent', () => {
  test('uses the usual name', () => {
    expect(createComponent(CommandPalette).tagName.toLowerCase()).toBe('keybinds-command-palette')
  })

  test('uses a name of its own when another copy of the library took the usual one', () => {
    defineOnce('keybinds-radial-menu', class extends HTMLElement {})
    const radial = createComponent(RadialMenu)
    expect(radial).toBeInstanceOf(RadialMenu)
    expect(radial.tagName.toLowerCase()).toMatch(/^keybinds-radial-menu-\d+$/u)
    document.body.append(radial)
    expect(radial.dataset['keybinds']).toBe('radial-menu')
    radial.remove()
  })
})
