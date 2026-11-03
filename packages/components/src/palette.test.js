/**
 * @import { BridgeCommand, CommandSystem } from './command-bridge.js'
 * @import { FoundCommand } from './command-match.js'
 */

import { describe, expect, test } from 'bun:test'

import { Listeners } from '@interact/core'

import { CommandBridge } from './command-bridge.js'
import { Palette } from './palette.js'

const SETTLED = 0

/**
 * Commands, the first that can't run now.
 * @type {readonly BridgeCommand[]}
 */
const COMMANDS = [
  { enabled: false, id: 'undo', label: 'Undo' },
  { enabled: true, id: 'open', label: 'Open file' },
  { enabled: true, id: 'save', label: 'Save' },
  { enabled: true, id: 'reopen', label: 'Reopen file' },
]

/**
 * A command system listing `COMMANDS` until told otherwise, noting what it runs and where, and saying when its list
 * changes.
 * @param {Partial<CommandSystem<string>>} [over] - What it does differently
 * @returns {Readonly<{ system: CommandSystem<string>, ran: string[], set: (next: readonly BridgeCommand[]) => void }>}
 *   The system, what it ran, and a way to change its list
 */
function system(over = {}) {
  let list = COMMANDS
  /** @type {string[]} */
  const ran = []
  /** @type {Listeners<undefined>} */
  const changes = new Listeners()
  return {
    ran,
    set: (next) => {
      list = next
      changes.emit(undefined)
    },
    system: {
      list: () => list,
      run: (id, context) => {
        ran.push(`${id} in ${context}`)
        return true
      },
      subscribe: (listener) => changes.add(listener),
      ...over,
    },
  }
}

/**
 * A palette over a system, in the "editor" context.
 * @param {Partial<CommandSystem<string>>} [over] - What the system does differently
 * @param {'show' | 'hide'} [inactive] - What it does with commands that can't run
 * @returns {Readonly<{ palette: Palette<string>, ran: string[], set: (next: readonly BridgeCommand[]) => void }>} The
 *   palette, what its system ran, and a way to change the system's list
 */
function palette(over = {}, inactive = 'show') {
  const made = system(over)
  return {
    ...made,
    palette: new Palette({ bridge: new CommandBridge(made.system), context: () => 'editor', inactive }),
  }
}

/**
 * Waits for searches answered at once to be shown.
 * @returns {Promise<void>} When they are
 */
async function settle() {
  await Bun.sleep(SETTLED)
}

/**
 * What the palette shows: each command's label, the active one marked.
 * @param {Palette<string>} shown - The palette
 * @returns {string[]} The labels
 */
function results(shown) {
  const { items } = shown.list
  return Array.from({ length: items.count }, (_unused, position) => {
    const label = items.item(position)?.label ?? '?'
    return shown.list.active.get() === position ? `[${label}]` : label
  })
}

describe('a command palette', () => {
  test('opens on every command, the first that can run active, and finds commands by what is typed', async () => {
    const { palette: shown } = palette()
    shown.open()
    await settle()
    const opened = results(shown)
    shown.type('file')
    await settle()
    expect([opened, results(shown)]).toEqual([
      ['Undo', '[Open file]', 'Save', 'Reopen file'],
      ['[Open file]', 'Reopen file'],
    ])
  })

  test('moves the active command with the arrows, passing those that cannot run, and leaves Home to the field', async () => {
    const { palette: shown } = palette()
    shown.open()
    await settle()
    const keys = ['ArrowDown', 'ArrowUp', 'ArrowUp', 'Home'].map((key) => shown.key(key))
    expect([keys, results(shown)]).toEqual([
      [true, true, true, false],
      ['Undo', '[Open file]', 'Save', 'Reopen file'],
    ])
  })
})

describe('a command palette running and leaving out commands', () => {
  test('runs the active command on Enter in the context it opened in, once it has gone', async () => {
    const { palette: shown, ran } = palette()
    shown.open()
    await settle()
    shown.layer.shown.set(true)
    shown.key('ArrowDown')
    shown.key('Enter')
    const whileShown = [...ran]
    shown.layer.shown.set(false)
    expect([whileShown, ran, shown.layer.open.get()]).toEqual([[], ['save in editor'], false])
  })

  test('runs nothing that cannot run', async () => {
    const { palette: shown, ran } = palette()
    shown.open()
    await settle()
    expect([shown.run(SETTLED), ran, shown.layer.open.get()]).toEqual([false, [], true])
  })

  test('leaves out commands that cannot run when told to', async () => {
    const { palette: shown } = palette({}, 'hide')
    shown.open()
    await settle()
    expect(results(shown)).toEqual(['[Open file]', 'Save', 'Reopen file'])
  })

  test('finds again when the system says its commands changed while it is open', async () => {
    const { palette: shown, set } = palette()
    shown.open()
    await settle()
    set([{ enabled: true, id: 'quit', label: 'Quit' }])
    await settle()
    expect(results(shown)).toEqual(['[Quit]'])
  })
})

describe("a command palette over a system's own search", () => {
  test('shows what it answers for the query typed last, dropping a slower answer to an earlier one', async () => {
    /** @type {Map<string, PromiseWithResolvers<readonly FoundCommand[]>>} */
    const asked = new Map()
    const { palette: shown } = palette({
      search: async (query) => {
        /** @type {PromiseWithResolvers<readonly FoundCommand[]>} */
        const answer = Promise.withResolvers()
        asked.set(query, answer)
        return answer.promise
      },
    })
    shown.open()
    shown.type('s')
    asked.get('s')?.resolve([{ enabled: true, id: 'save', label: 'Save' }])
    asked.get('')?.resolve(COMMANDS)
    await settle()
    expect([...asked.keys(), ...results(shown)]).toEqual(['', 's', '[Save]'])
  })
})
