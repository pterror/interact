/**
 * @import { Command } from './command.js'
 * @import { CommandSystemOptions } from './command-system.js'
 */

import { describe, expect, test } from 'bun:test'

import { CommandHub } from './hub.js'
import { defaultScorer } from './scorer.js'
import { ALL } from './test-inputs.js'

const ONCE = 1
const FIRST = 0
const SHORT_PAUSE = 5

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

/**
 * A hub with an Open and a Reopen command in the File group and a Paste in the edit menu, as a command system, with
 * what ran.
 * @param {CommandSystemOptions} [options] - How the system searches and ranks
 * @returns {Readonly<{ system: ReturnType<CommandHub['commandSystem']>, ran: string[] }>} The system, and what ran
 */
function fileSystem(options = {}) {
  /** @type {string[]} */
  const ran = []
  const hub = new CommandHub({ ...ALL, context: () => ({}), listen: { target: document.createElement('div') } })
  /** @type {readonly Command[]} */
  const commands = [
    { category: 'File', execute: () => ran.push('open'), id: 'open', keys: ['ctrl+o'], label: 'Open file' },
    { category: 'File', execute: () => ran.push('reopen'), id: 'reopen', label: 'Reopen file' },
    { execute: () => ran.push('paste'), id: 'clipboard-paste', label: 'Paste', menu: 'edit' },
  ]
  hub.setSource('app', () => commands)
  hub.refresh()
  return { ran, system: hub.commandSystem(options) }
}

/**
 * The ids of what a search found.
 * @param {readonly Readonly<{ id: string }>[]} found - What was found
 * @returns {string[]} Their ids
 */
function ids(found) {
  return found.map(({ id }) => id)
}

describe("a hub's command system searching", () => {
  test("ranks by keybinds' scorer: one run just now comes before an equal match", async () => {
    const plain = fileSystem().system
    const ranked = fileSystem({ scorer: defaultScorer([{ id: 'reopen', timestamp: Date.now() }]) }).system
    expect([ids(await plain.search('file', undefined)), ids(await ranked.search('file', undefined))]).toEqual([
      ['open', 'reopen'],
      ['reopen', 'open'],
    ])
  })

  test("lists for nothing typed, keeps to a menu's commands, and marks only the label's matched letters", async () => {
    const { system } = fileSystem()
    const [byId] = await system.search('clipboard', 'edit')
    const [byLabel] = await system.search('open', undefined)
    expect([
      ids(await system.search('', undefined)),
      ids(await system.search('p', 'edit')),
      byId?.positions,
      byLabel?.positions?.map((at) => byLabel.label.charAt(at)).join(''),
    ]).toEqual([['open', 'reopen', 'clipboard-paste'], ['clipboard-paste'], undefined, 'Open'])
  })
})

describe("a hub's command system with a source of further commands", () => {
  test('asks it once typing pauses, finds and runs what it answers, and asks nothing for a search typing passed', async () => {
    /** @type {string[]} */
    const asked = []
    /** @type {string[]} */
    const remote = []
    /** @type {Command} */
    const share = { execute: () => remote.push('share'), id: 'share', label: 'Share file' }
    const { system } = fileSystem({
      source: (query) => {
        asked.push(query)
        return [share]
      },
      sourceDelay: SHORT_PAUSE,
    })
    const [passed, last] = await Promise.all([system.search('fil', undefined), system.search('file', undefined)])
    expect([asked, ids(passed), ids(last), system.run('share'), remote]).toEqual([
      ['file'],
      ['open', 'reopen'],
      ['open', 'reopen', 'share'],
      true,
      ['share'],
    ])
  })

  test('finds the hub’s own commands when the source fails', async () => {
    const { system } = fileSystem({
      source: () => {
        throw new Error('offline')
      },
      sourceDelay: SHORT_PAUSE,
    })
    expect(ids(await system.search('file', undefined))).toEqual(['open', 'reopen'])
  })
})
