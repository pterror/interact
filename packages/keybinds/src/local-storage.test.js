import { beforeEach, describe, expect, mock, test } from 'bun:test'

import { localStorageBindings } from './local-storage.js'

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
      JSON.stringify({ open: 'x', save: { keys: ['k', NOT_A_STRING], mouse: ['click'], other: ['y'], pad: ['a'] } }),
    )
    expect(localStorageBindings(KEY).load()).toEqual({ open: {}, save: { mouse: ['click'], pad: ['a'] } })
  })

  test('hears another tab saving under its key, until stopped', () => {
    const view = new EventTarget()
    const heard = mock((/** @type {unknown} */ _overrides) => undefined)
    const stop = localStorageBindings(KEY, view).subscribe(heard)
    localStorage.setItem(KEY, JSON.stringify({ save: { keys: ['k'] } }))
    view.dispatchEvent(Object.assign(new Event('storage'), { key: 'other' }))
    view.dispatchEvent(Object.assign(new Event('storage'), { key: KEY }))
    stop()
    view.dispatchEvent(Object.assign(new Event('storage'), { key: KEY }))
    expect(heard.mock.calls).toEqual([[{ save: { keys: ['k'] } }]])
  })
})
