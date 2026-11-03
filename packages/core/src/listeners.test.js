import { describe, expect, test } from 'bun:test'

import { Listeners } from './listeners.js'

describe('Listeners', () => {
  test('calls each listener with what is emitted, until it is removed', () => {
    /** @type {Listeners<string>} */
    const listeners = new Listeners()
    /** @type {string[]} */
    const heard = []
    const stop = listeners.add((value) => {
      heard.push(`a:${value}`)
    })
    listeners.add((value) => {
      heard.push(`b:${value}`)
    })
    listeners.emit('one')
    stop()
    listeners.emit('two')
    expect(heard).toEqual(['a:one', 'b:one', 'b:two'])
  })

  test('skips a listener removed by one called before it', () => {
    /** @type {Listeners<string>} */
    const listeners = new Listeners()
    /** @type {string[]} */
    const heard = []
    /** @type {(() => void)[]} */
    const stops = []
    listeners.add(() => {
      for (const stop of stops) {
        stop()
      }
      heard.push('first')
    })
    stops.push(
      listeners.add(() => {
        heard.push('second')
      }),
    )
    listeners.emit('x')
    expect(heard).toEqual(['first'])
  })
})
