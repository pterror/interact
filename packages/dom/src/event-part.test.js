import { describe, expect, test } from 'bun:test'

import { EventPart } from './event-part.js'

describe('EventPart', () => {
  test('calls the handler it holds now, and none once cleared', () => {
    const button = document.createElement('button')
    const part = new EventPart(button, 'click')
    /** @type {string[]} */
    const heard = []
    part.set(() => {
      heard.push('a')
    })
    part.set(() => {
      heard.push('b')
    })
    button.click()
    part.set(undefined)
    button.click()
    expect(heard).toEqual(['b'])
  })
})
