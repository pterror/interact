import { beforeEach, describe, expect, test } from 'bun:test'

import { localStorageBindings } from './bindings-storage.js'

const KEY = 'test:bindings-storage'
const NOT_A_STRING = 1

beforeEach(() => {
  localStorage.clear()
})

describe('localStorageBindings', () => {
  test('keeps overrides under its key', () => {
    localStorageBindings(KEY).save({ save: { keys: ['$mod+shift+s'] } })
    expect(localStorage.getItem(KEY)).toBe(JSON.stringify({ save: { keys: ['$mod+shift+s'] } }))
    expect(localStorageBindings(KEY).load()).toEqual({ save: { keys: ['$mod+shift+s'] } })
  })

  test('reads what is not JSON as no overrides, and leaves out what is not a list of bindings', () => {
    localStorage.setItem(KEY, 'not json')
    expect(localStorageBindings(KEY).load()).toEqual({})
    localStorage.setItem(
      KEY,
      JSON.stringify({ open: 'x', save: { keys: ['k', NOT_A_STRING], mouse: ['click'], other: ['y'] } }),
    )
    expect(localStorageBindings(KEY).load()).toEqual({ open: {}, save: { mouse: ['click'] } })
  })
})
