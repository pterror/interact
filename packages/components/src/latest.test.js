import { describe, expect, test } from 'bun:test'

import { Latest } from './latest.js'

describe('the latest of answers asked for', () => {
  test('is kept, and an answer to something asked before it is dropped, however late it comes', async () => {
    const latest = new Latest()
    /** @type {PromiseWithResolvers<string>} */
    const slow = Promise.withResolvers()
    const first = latest.ask(async () => slow.promise)
    const second = latest.ask(() => 'second')
    slow.resolve('first')
    expect([await first, await second]).toEqual([undefined, { answer: 'second' }])
  })

  test('is dropped too once everything still to come is', async () => {
    const latest = new Latest()
    const asked = latest.ask(() => 'answer')
    latest.drop()
    expect(await asked).toBeUndefined()
  })

  test('counts even when it is nothing', async () => {
    const latest = new Latest()
    expect(await latest.ask(() => undefined)).toEqual({ answer: undefined })
  })
})
