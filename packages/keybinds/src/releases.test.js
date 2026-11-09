import { describe, expect, mock, test } from 'bun:test'

import { keybinds } from './keybinds.js'
import { listening, nothing, notes } from './test-keys.js'

const EVERY_OTHER = 2

describe('release bindings', () => {
  test('run when a pressed key comes up, once per press', () => {
    const up = mock(() => undefined)
    const keys = listening([{ keys: ['k:up'], run: up }], { releases: true })
    keys.down('k')
    expect(up).not.toHaveBeenCalled()
    keys.up('k')
    keys.up('k')
    expect(up).toHaveBeenCalledTimes(1)
    keys.stop()
  })

  test("don't run for a release whose press was never seen", () => {
    const up = mock(() => undefined)
    const keys = listening([{ keys: ['k:up'], run: up }], { releases: true })
    keys.up('k')
    expect(up).not.toHaveBeenCalled()
    keys.stop()
  })

  test('match the modifiers held when the key went down', () => {
    const up = mock(() => undefined)
    const keys = listening([{ keys: ['ctrl+k:up'], run: up }], { releases: true })
    keys.down('k', { ctrlKey: true })
    keys.up('k')
    expect(up).toHaveBeenCalledTimes(1)
    keys.down('k')
    keys.up('k', { ctrlKey: true })
    expect(up).toHaveBeenCalledTimes(1)
    keys.stop()
  })

  test('leave press bindings as they were, and stop with the rest', () => {
    const run = mock(() => undefined)
    const keys = listening([{ keys: ['k', 'k:up'], run }], { releases: true })
    keys.down('k')
    expect(run).toHaveBeenCalledTimes(1)
    keys.stop()
    keys.up('k')
    expect(run).toHaveBeenCalledTimes(1)
  })
})

describe('releases and when', () => {
  test('a release-only binding checks its own when as the key comes up', () => {
    const up = mock(() => undefined)
    let on = true
    const keys = listening([{ keys: ['k:up'], run: up, when: () => on }], { releases: true })
    keys.down('k')
    on = false
    keys.up('k')
    expect(up).not.toHaveBeenCalled()
    keys.stop()
  })

  test('a binding whose press ran always gets its release, even once its when is false', () => {
    const log = notes()
    let on = true
    const keys = listening([{ keys: ['space', 'space:up'], run: log.as('hold'), when: () => on }], {
      releases: true,
    })
    for (const [index, type] of ['keydown', 'keyup'].entries()) {
      on = index % EVERY_OTHER === 0
      keys.target.dispatchEvent(new KeyboardEvent(type, { cancelable: true, code: 'Space', key: ' ' }))
    }
    expect(log.entries).toEqual(['hold:keydown', 'hold:keyup'])
    keys.stop()
  })

  test('come even when another binding takes the release first', () => {
    const log = notes()
    const keys = listening(
      [
        { keys: ['k:up'], run: log.as('other') },
        { keys: ['k', 'k:up'], run: log.as('hold') },
      ],
      { releases: true },
    )
    keys.down('k')
    keys.up('k')
    expect(log.entries).toEqual(['hold:keydown', 'other:keyup', 'hold:keyup'])
    keys.stop()
  })

  test('come only to the binding whose press ran, not to another bound to the same release', () => {
    const log = notes()
    const keys = listening(
      [
        { keys: ['k:up'], run: log.as('off'), when: () => false },
        { keys: ['k', 'k:up'], run: log.as('hold') },
      ],
      { releases: true },
    )
    keys.down('k')
    keys.up('k')
    expect(log.entries).toEqual(['hold:keydown', 'hold:keyup'])
    keys.stop()
  })

  test('a held key repeating does not change which bindings ran', () => {
    const log = notes()
    let on = true
    const keys = listening([{ keys: ['k', 'k:up'], run: log.as('k'), when: () => on }], { releases: true })
    keys.down('k')
    on = false
    keys.down('k', { repeat: true })
    keys.up('k')
    expect(log.entries).toEqual(['k:keydown', 'k:keyup'])
    keys.stop()
  })
})

describe('releases in text fields and overlays', () => {
  test('skip text fields unless the binding runs while typing, but a press that ran still gets its release', () => {
    const plain = mock(() => undefined)
    const log = notes()
    const keys = listening(
      [
        { keys: ['j:up'], run: plain },
        { keys: ['k', 'k:up'], run: log.as('k'), typing: true },
      ],
      { releases: true },
    )
    const field = document.createElement('input')
    keys.target.append(field)
    for (const key of ['j', 'k']) {
      field.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, code: `Key${key.toUpperCase()}`, key }))
      field.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, code: `Key${key.toUpperCase()}`, key }))
    }
    expect([plain.mock.calls.length, log.entries]).toEqual([0, ['k:keydown', 'k:keyup']])
    keys.stop()
  })

  test('skip a release inside an overlay, but a press that ran still gets its release', () => {
    const log = notes()
    const keys = listening(
      [
        { keys: ['j:up'], run: log.as('j') },
        { keys: ['k', 'k:up'], run: log.as('k') },
      ],
      { releases: true },
    )
    const dialog = document.createElement('dialog')
    keys.target.append(dialog)
    keys.down('j')
    keys.down('k')
    dialog.setAttribute('open', '')
    for (const key of ['j', 'k']) {
      dialog.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, code: `Key${key.toUpperCase()}`, key }))
    }
    expect(log.entries).toEqual(['k:keydown', 'k:keyup'])
    keys.stop()
  })
})

describe('release syntax', () => {
  test('accepts ":up" in any case, but not alone, and needs the releases option', () => {
    const run = nothing
    expect(() => {
      keybinds([{ keys: ['ctrl+k:up', 'Escape:UP'], run }], { releases: true })()
    }).not.toThrow()
    expect(() => keybinds([{ keys: [':up'], run }], { releases: true })).toThrow('Invalid key binding')
    expect(() => keybinds([{ keys: ['ctrl+:up'], run }], { releases: true })).toThrow('no key (only modifiers)')
    expect(() => keybinds([{ keys: ['k:up'], run }])).toThrow('needs the releases option')
  })
})
