import { describe, test, expect, beforeEach, mock } from 'bun:test'

import { CommandPalette } from '../components/palette.js'
import { keybinds } from '../test-helpers.js'

describe('CommandPalette source', () => {
  beforeEach(() => {
    if (!customElements.get('keybinds-command-palette')) {
      customElements.define('keybinds-command-palette', CommandPalette)
    }
  })

  const labels = (/** @type {HTMLElement} */ el) =>
    Array.from(/** @type {ShadowRoot} */ (el.shadowRoot).querySelectorAll('.palette__item-label')).map(
      (l) => l.textContent,
    )
  const type = (/** @type {HTMLInputElement} */ input) =>
    input.dispatchEvent(new /** @type {any} */ (input.ownerDocument.defaultView).Event('input'))

  test('merges what source answers for the typed query, after the delay, once', async () => {
    const el = /** @type {CommandPalette} */ (document.createElement('keybinds-command-palette'))
    document.body.appendChild(el)
    const asked = /** @type {string[]} */ ([])
    el.commands = [{ id: 'a', label: 'Alpha', execute: () => {} }]
    el.sourceDelay = 5
    el.source = async (q) => {
      asked.push(q)
      return [
        { id: 'b', label: 'Alphabet', execute: () => {} },
        { id: 'a', label: 'Alpha dup', execute: () => {} },
      ]
    }
    el.open = true
    const input = /** @type {HTMLInputElement} */ (/** @type {ShadowRoot} */ (el.shadowRoot).querySelector('input'))
    input.value = 'al'
    type(input)
    input.value = 'alp'
    type(input)
    expect(labels(el)).toEqual(['Alpha'])
    await new Promise((r) => setTimeout(r, 30))
    expect(asked).toEqual(['alp'])
    expect(labels(el).sort()).toEqual(['Alpha', 'Alphabet'])
    el.commands = [{ id: 'a', label: 'Alpha', execute: () => {} }]
    await new Promise((r) => setTimeout(r, 30))
    expect(asked).toEqual(['alp'])
    expect(labels(el).sort()).toEqual(['Alpha', 'Alphabet'])
    el.remove()
  })

  test('drops an answer for a query no longer typed', async () => {
    const el = /** @type {CommandPalette} */ (document.createElement('keybinds-command-palette'))
    document.body.appendChild(el)
    el.sourceDelay = 0
    /** @type {(x: any[]) => void} */
    let answer = () => {}
    el.source = () =>
      new Promise((r) => {
        answer = r
      })
    el.open = true
    const input = /** @type {HTMLInputElement} */ (/** @type {ShadowRoot} */ (el.shadowRoot).querySelector('input'))
    input.value = 'x'
    type(input)
    await new Promise((r) => setTimeout(r, 5))
    input.value = 'y'
    answer([{ id: 'x', label: 'Xylophone', execute: () => {} }])
    await new Promise((r) => setTimeout(r, 5))
    expect(labels(el)).toEqual([])
    el.remove()
  })

  test('what source answers runs when chosen, by click or Enter', async () => {
    const el = /** @type {CommandPalette} */ (document.createElement('keybinds-command-palette'))
    document.body.appendChild(el)
    const ran = /** @type {string[]} */ ([])
    el.sourceDelay = 0
    el.source = async () => [
      {
        id: 'b',
        label: 'Bravo',
        execute: () => {
          ran.push('b')
        },
      },
    ]
    const input = /** @type {HTMLInputElement} */ (/** @type {ShadowRoot} */ (el.shadowRoot).querySelector('input'))
    const item = () =>
      /** @type {HTMLElement} */ (/** @type {ShadowRoot} */ (el.shadowRoot).querySelector('.palette__item'))
    for (const choose of [
      () => item().click(),
      () => input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })),
    ]) {
      el.open = true
      input.value = 'br'
      type(input)
      await new Promise((r) => setTimeout(r, 5))
      choose()
    }
    expect(ran).toEqual(['b', 'b'])
    el.remove()
  })
})

describe('an open palette holds keys back', () => {
  test('does not dispatch when event target is an open keybinds-command-palette', () => {
    const fn = mock(() => {})
    const target = document.createElement('div')
    const commands = [{ execute: fn, id: 'save', keys: ['ctrl+s'], label: 'Save' }]
    const cleanup = keybinds(commands, undefined, { target })
    if (!customElements.get('keybinds-command-palette')) {
      customElements.define('keybinds-command-palette', CommandPalette)
    }
    document.body.append(target)

    const palette = document.createElement('keybinds-command-palette')
    palette.setAttribute('open', '')
    target.append(palette)

    const event = new KeyboardEvent('keydown', {
      code: 'KeyS',
      ctrlKey: true,
      key: 's',
    })
    Object.defineProperty(event, 'target', { value: palette })
    target.dispatchEvent(event)

    expect(fn).not.toHaveBeenCalled()
    cleanup()
    target.remove()
  })

  test('a palette registered under another name still holds keys back while open', () => {
    const name = 'my-own-palette'
    if (!customElements.get(name)) {
      customElements.define(name, class extends CommandPalette {})
    }
    const target = document.createElement('div')
    document.body.append(target)
    const fn = mock(() => {})
    const cleanup = keybinds([{ execute: fn, id: 's', keys: ['ctrl+s'], label: 'S' }], undefined, { target })
    const palette = document.createElement(name)
    target.append(palette)
    palette.setAttribute('open', '')
    expect(palette.dataset['keybinds']).toBe('command-palette')
    palette.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, code: 'KeyS', ctrlKey: true, key: 's' }))
    expect(fn).not.toHaveBeenCalled()
    cleanup()
    target.remove()
  })
})
