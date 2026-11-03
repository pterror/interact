/**
 * @import { Command } from './command.js'
 */

import { describe, expect, test } from 'bun:test'

import { CommandHub } from './hub.js'
import { ALL } from './test-inputs.js'

const ONCE = 1
const FIRST = 0

/**
 * A hub with three commands: save, which applies only while editing; a hidden one; and undo, in the edit menu.
 * @param {() => Readonly<{ editing: boolean }>} context - The context
 * @param {(id: string) => void} note - Notes each command run
 * @returns {CommandHub} The hub
 */
function hubWith(context, note) {
  const hub = new CommandHub({ ...ALL, context, listen: { target: document.createElement('div') }, storageKey: 's' })
  /** @type {readonly Command[]} */
  const commands = [
    {
      execute: () => {
        note('save')
      },
      id: 'save',
      keys: ['ctrl+s'],
      label: 'Save',
      when: (now) => now['editing'] === true,
    },
    {
      execute: () => {
        note('secret')
      },
      hidden: true,
      id: 'secret',
      label: 'Secret',
    },
    {
      category: 'Edit',
      execute: () => {
        note('undo')
      },
      id: 'undo',
      label: 'Undo',
      menu: ['edit'],
    },
  ]
  hub.setSource('app', () => commands)
  hub.refresh()
  return hub
}

/**
 * Counts what a subscription hears.
 * @param {(listener: () => void) => () => void} subscribe - The subscription
 * @returns {Readonly<{ count: () => number, stop: () => void }>} How many times it was heard, and a way to stop
 */
function counting(subscribe) {
  let heard = 0
  const stop = subscribe(() => {
    heard += ONCE
  })
  return { count: () => heard, stop }
}

describe('a hub as a command system', () => {
  test('lists its commands, all or a menu’s, each enabled while it applies, with its first key binding', () => {
    let editing = false
    const hub = hubWith(
      () => ({ editing }),
      () => undefined,
    )
    const system = hub.commandSystem()
    const before = system.list(undefined)
    editing = true
    expect([before, system.list(undefined).at(FIRST)?.enabled, system.list('edit')]).toEqual([
      [
        { enabled: false, id: 'save', label: 'Save', shortcut: 'Ctrl+S' },
        { category: 'Edit', enabled: true, id: 'undo', label: 'Undo' },
      ],
      true,
      [{ category: 'Edit', enabled: true, id: 'undo', label: 'Undo' }],
    ])
    hub.destroy()
  })

  test('runs a command that applies, and says its list may have changed when its context is synced', () => {
    /** @type {string[]} */
    const ran = []
    const hub = hubWith(
      () => ({ editing: true }),
      (id) => {
        ran.push(id)
      },
    )
    const system = hub.commandSystem()
    const heard = counting(system.subscribe)
    const results = [system.run('save'), system.run('missing')]
    hub.syncContext()
    heard.stop()
    hub.syncContext()
    expect([results, ran, heard.count()]).toEqual([[true, false], ['save'], ONCE])
    hub.destroy()
  })
})
