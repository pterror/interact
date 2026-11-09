/**
 * @import { Overrides } from './binding-store.js'
 */

import { describe, expect, mock, test } from 'bun:test'

import { bindingStore } from './binding-store.js'

/**
 * Overrides kept in memory, which can also change from elsewhere
 * @param {Overrides} [initial] - The overrides to start with
 * @returns {Readonly<{ change: (overrides: Overrides) => void, storage: Parameters<typeof bindingStore>[0] }>} The
 *   storage, and changing it from elsewhere
 */
function memoryStorage(initial = {}) {
  let held = initial
  /** @type {Set<(overrides: Overrides) => void>} */
  const listeners = new Set()
  /**
   * Keeps overrides, and tells whoever follows
   * @param {Overrides} overrides - The overrides
   * @returns {void}
   */
  const change = (overrides) => {
    held = overrides
    for (const listener of listeners) {
      listener(overrides)
    }
  }
  return {
    change,
    storage: {
      load: () => held,
      save: change,
      subscribe(listener) {
        listeners.add(listener)
        return () => {
          listeners.delete(listener)
        }
      },
    },
  }
}

describe('bindingStore', () => {
  test('starts from what the storage has, and saves what is set to it', () => {
    const { storage } = memoryStorage({ save: { keys: ['ctrl+s'] } })
    const store = bindingStore(storage)
    expect(store.get()).toEqual({ save: { keys: ['ctrl+s'] } })
    store.set({ open: { keys: ['ctrl+o'] } })
    expect([store.get(), storage.load()]).toEqual([{ open: { keys: ['ctrl+o'] } }, { open: { keys: ['ctrl+o'] } }])
  })

  test('is heard changing once per change, from here or elsewhere, even when the storage echoes a save back', () => {
    const { change, storage } = memoryStorage()
    const store = bindingStore(storage)
    const heard = mock(() => undefined)
    store.watch(heard)
    change({ save: { keys: ['ctrl+shift+s'] } })
    expect(store.get()).toEqual({ save: { keys: ['ctrl+shift+s'] } })
    store.set({ open: { keys: ['ctrl+o'] } })
    expect(heard).toHaveBeenCalledTimes(2)
  })

  test('keeps release bindings as written', () => {
    const store = bindingStore(memoryStorage().storage)
    store.set({ close: { mouse: ['back:up'] } })
    expect(store.get()).toEqual({ close: { mouse: ['back:up'] } })
  })

  test('stops following the storage once stopped, and works over a storage that cannot say', () => {
    const { change, storage } = memoryStorage()
    const store = bindingStore(storage)
    store.stop()
    change({ save: { keys: ['ctrl+shift+s'] } })
    expect(store.get()).toEqual({})
    const plain = bindingStore({ load: () => ({}), save: () => undefined })
    plain.set({ a: { keys: ['a'] } })
    expect(plain.get()).toEqual({ a: { keys: ['a'] } })
  })
})
