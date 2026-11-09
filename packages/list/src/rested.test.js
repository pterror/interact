import { describe, expect, test } from 'bun:test'

import { cell } from './cell.js'
import { rested } from './rested.js'

const REST = 10
const LONGER = 40

describe('rested', () => {
  test('hands a value on once it stops changing, once for many changes', async () => {
    const typed = cell('')
    /** @type {string[]} */
    const handed = []
    const resting = rested({
      rest: REST,
      to: (value) => {
        handed.push(value)
      },
      value: typed,
    })
    typed.set('I')
    typed.set('Il')
    typed.set('Ils')
    expect([handed, resting.waiting()]).toEqual([[], true])
    await Bun.sleep(LONGER)
    expect([handed, resting.waiting()]).toEqual([['Ils'], false])
    resting.stop()
  })

  test('flush hands on a waiting change now and nothing when none waits; stop drops it', async () => {
    const typed = cell('')
    /** @type {string[]} */
    const handed = []
    const resting = rested({
      rest: REST,
      to: (value) => {
        handed.push(value)
      },
      value: typed,
    })
    resting.flush()
    typed.set('Ilse')
    resting.flush()
    expect([handed, resting.waiting()]).toEqual([['Ilse'], false])
    await Bun.sleep(LONGER)
    expect(handed).toEqual(['Ilse'])
    typed.set('Ilse V')
    resting.stop()
    typed.set('Ilse Va')
    await Bun.sleep(LONGER)
    expect([handed, resting.waiting()]).toEqual([['Ilse'], false])
  })
})
