import { afterEach, describe, expect, mock, test } from 'bun:test'

import { textsOf } from './test-components.js'
import { kbd, keybinds } from './test-helpers.js'
import { clickPart, openPanel, partsNamed, removePanels } from './test-settings.js'

const ONCE = 1

afterEach(removePanels)

const SCHEMA = {
  delete: { category: 'Edit', keys: ['backspace'], label: 'Delete' },
  hidden: { hidden: true, keys: ['h'], label: 'Hidden' },
  open: { category: 'File', keys: ['$mod+o'], label: 'Open' },
  save: { category: 'File', keys: ['$mod+s'], label: 'Save' },
}

/**
 * Notes the details of the events of one type that an element dispatches
 * @param {EventTarget} target - The element
 * @param {string} type - The event type
 * @returns {readonly unknown[]} The details, as they come
 */
function detailsOf(target, type) {
  /** @type {unknown[]} */
  const details = []
  target.addEventListener(type, (event) => {
    details.push(event instanceof CustomEvent ? event.detail : undefined)
  })
  return details
}

describe('an open settings panel', () => {
  test('groups the commands that are not hidden by category, with their bindings', () => {
    const { panel } = openPanel(SCHEMA)
    expect(textsOf(panel, '.settings__group-title')).toEqual(['Edit', 'File'])
    expect(textsOf(panel, '.settings__item-label')).toEqual(['Delete', 'Open', 'Save'])
    expect(textsOf(panel, '.settings__binding-key').length).toBeGreaterThan(ONCE)
  })

  test('removes a binding, keeping the override when the rest differ from the defaults, and says which changed', () => {
    const { panel, store } = openPanel(SCHEMA)
    const changes = detailsOf(panel, 'change')
    clickPart(panel, 'binding-remove')
    expect(store.get('delete').keys).toEqual([])
    expect(store.getOverrides()['delete']).toEqual({ keys: [] })
    expect(changes).toMatchObject([{ commandId: 'delete' }])
  })

  test('resets one command to its defaults, or all of them, and says so', () => {
    const { panel, store } = openPanel(SCHEMA)
    const resets = detailsOf(panel, 'reset')
    store.save({ delete: { keys: ['ctrl+shift+d'] }, open: { keys: ['ctrl+p'] } })
    clickPart(panel, 'item-reset')
    expect(store.get('delete').keys).toEqual(['backspace'])
    expect(store.get('open').keys).toEqual(['ctrl+p'])
    clickPart(panel, 'reset-all')
    expect(store.getOverrides()).toEqual({})
    expect(resets).toEqual([{ commandId: 'delete' }, {}])
  })
})

describe('a settings panel in the page', () => {
  test('closes from its backdrop, and says so', () => {
    const { panel } = openPanel(SCHEMA)
    const closes = detailsOf(panel, 'close')
    clickPart(panel, 'backdrop')
    expect(closes).toHaveLength(ONCE)
    expect(panel.open).toBe(false)
  })

  test('shows the bindings again when the store changes', () => {
    const { panel, store } = openPanel(SCHEMA)
    store.save({ save: { keys: ['ctrl+shift+s'] } })
    expect(textsOf(panel, '.settings__binding-key')).toContain('Shift')
  })

  test('keeps the bindings of the page from firing inside it', () => {
    const target = document.createElement('div')
    document.body.append(target)
    const execute = mock(() => undefined)
    const stop = keybinds([{ execute, id: 'save', keys: ['ctrl+s'], label: 'Save' }], undefined, { target })
    const { panel } = openPanel(SCHEMA)
    target.append(panel)
    panel.dispatchEvent(kbd('keydown', { code: 'KeyS', ctrlKey: true, key: 's' }))
    expect(execute).not.toHaveBeenCalled()
    stop()
    target.remove()
  })

  test('shows sequences as steps, and holds as what they wait for', () => {
    const { panel, store } = openPanel({ go: { keys: ['space'], label: 'Go', mouse: ['scrollup'] } }, { holds: true })
    store.save({ go: { keys: ['ctrl+k ctrl+s', 'k:hold'] } })
    const chips = partsNamed(panel, 'binding-keys').map((chip) =>
      Array.from(chip.querySelectorAll('kbd'), (key) => key.textContent),
    )
    expect(chips).toEqual([['Ctrl', 'K', 'then', 'Ctrl', 'S'], ['K', 'Hold'], ['Scroll ↑']])
  })
})
