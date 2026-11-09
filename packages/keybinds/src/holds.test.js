import { describe, expect, mock, test } from 'bun:test'

import { holds } from './holds.js'
import { keybinds } from './keybinds.js'
import { presses } from './presses.js'
import { listening, notes } from './test-keys.js'

const DELAY = 30
const LONG = 60

describe('holds', () => {
  test('a hold binding runs once the key has been held long enough', async () => {
    const run = mock(() => undefined)
    const keys = listening([{ keys: ['k:hold'], run }], { holds: { delay: DELAY } })
    keys.down('k')
    expect(run).not.toHaveBeenCalled()
    await Bun.sleep(LONG)
    expect(run).toHaveBeenCalledTimes(1)
    keys.up('k')
    keys.stop()
  })

  test('a key let go before then is a tap, not a hold', async () => {
    const hold = mock(() => undefined)
    const tap = mock(() => undefined)
    const keys = listening(
      [
        { keys: ['k:hold'], run: hold },
        { keys: ['k:tap'], run: tap },
      ],
      { holds: { delay: DELAY } },
    )
    keys.tap('k')
    await Bun.sleep(LONG)
    expect([hold.mock.calls.length, tap.mock.calls.length]).toEqual([0, 1])
    keys.down('k')
    await Bun.sleep(LONG)
    keys.up('k')
    expect([hold.mock.calls.length, tap.mock.calls.length]).toEqual([1, 1])
    keys.stop()
  })

  test("a press stopped before its hold doesn't run it", async () => {
    const run = mock(() => undefined)
    const keys = listening([{ keys: ['k:hold'], run }], { holds: { delay: DELAY } })
    keys.down('k')
    keys.stop()
    await Bun.sleep(LONG)
    expect(run).not.toHaveBeenCalled()
  })

  test('a hold binding is held until its press comes up', async () => {
    const pressing = presses(() => [])
    const charge = { run: () => undefined }
    const holding = holds({ delay: DELAY, hold: () => [charge], tap: () => [], to: pressing })
    holding.down({ event: new Event('keydown'), id: 'KeyK', query: [], repeat: false, typing: false })
    await Bun.sleep(LONG)
    expect([holding.held.has(charge), holding.took('KeyK')]).toEqual([true, [charge]])
    holding.up({ blocked: false, event: new Event('keyup'), id: 'KeyK', typing: false })
    expect(holding.held.has(charge)).toBe(false)
  })

  test('a binding whose hold ran gets its release, even once its when is false', async () => {
    const log = notes()
    let on = true
    const keys = listening([{ keys: ['k:hold', 'k:up'], run: log.as('charge'), when: () => on }], {
      holds: { delay: DELAY },
      releases: true,
    })
    keys.down('k')
    await Bun.sleep(LONG)
    on = false
    keys.up('k')
    expect(log.entries).toEqual(['charge:keydown', 'charge:keyup'])
    keys.stop()
  })

  test('holding and tapping need the holds option', () => {
    for (const binding of ['k:hold', 'k:tap']) {
      expect(() => keybinds([{ keys: [binding], run: () => undefined }])).toThrow('needs the holds option')
    }
  })
})
