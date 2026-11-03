/**
 * @import { BindingOverrides, Schema } from './command.js'
 * @import { BindingsStorage } from './bindings-storage.js'
 * @import { AnyBindingsStore } from './store.js'
 */

import { beforeEach, describe, expect, test } from 'bun:test'

import { BindingsChangeEvent } from './bindings-change.js'
import { BindingsStore, entriesOf, fromBindings, listBindings } from './store.js'

const KEY = 'test:bindings'
const EMPTY = 0
const TWICE = 2
const FIRST = 0

const SCHEMA = {
  open: { keys: ['$mod+o'], label: 'Open', mouse: ['$mod+Click'] },
  save: { keys: ['$mod+s'], label: 'Save' },
}

beforeEach(() => {
  localStorage.clear()
})

/**
 * Overrides kept in memory, which can also change from elsewhere
 * @param {BindingOverrides} [initial] - The overrides to start with
 * @returns {Readonly<{ change: (overrides: BindingOverrides) => void, storage: BindingsStorage }>} The storage, and
 *   how to change it from elsewhere
 */
function memoryStorage(initial = {}) {
  let held = initial
  /** @type {Set<(overrides: BindingOverrides) => void>} */
  const listeners = new Set()
  /**
   * Keeps overrides, and tells whoever follows
   * @param {BindingOverrides} overrides - The overrides
   * @returns {void}
   */
  function change(overrides) {
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
      subscribe: (onChange) => {
        listeners.add(onChange)
        return () => {
          listeners.delete(onChange)
        }
      },
    },
  }
}

/**
 * The overrides each change a store dispatches carries
 * @param {AnyBindingsStore} store - The store
 * @returns {BindingOverrides[]} Each change's overrides, as it comes
 */
function changes(store) {
  /** @type {BindingOverrides[]} */
  const seen = []
  store.addEventListener('change', (event) => {
    if (event instanceof BindingsChangeEvent) {
      seen.push(event.overrides)
    }
  })
  return seen
}

describe('entriesOf', () => {
  test("gives a schema's ids in order with their bindings, and a store's with its overrides", () => {
    expect(entriesOf(SCHEMA).map(({ id }) => id)).toEqual(['open', 'save'])
    const store = new BindingsStore(
      SCHEMA,
      memoryStorage({ nonexistent: { keys: ['a'] }, save: { keys: ['k'] } }).storage,
    )
    expect(entriesOf(store).map(({ binding, id }) => [id, binding.keys])).toEqual([
      ['open', ['$mod+o']],
      ['save', ['k']],
    ])
  })
})

describe('listBindings', () => {
  test('lists every binding not hidden, with its id', () => {
    const schema = { ...SCHEMA, internal: { hidden: true, keys: ['x'], label: 'Internal' } }
    expect(listBindings(schema)).toEqual([
      { binding: SCHEMA.open, id: 'open' },
      { binding: SCHEMA.save, id: 'save' },
    ])
  })
})

/**
 * A `when` that always holds
 * @returns {boolean} True
 */
function always() {
  return true
}

describe('fromBindings', () => {
  test('makes a command for each handler, with its bindings and options', () => {
    const commands = fromBindings(SCHEMA, { save: () => 'saved' }, { save: { captureInput: true, when: always } })
    expect(commands.map(({ id, keys, label }) => ({ id, keys, label }))).toEqual([
      { id: 'save', keys: ['$mod+s'], label: 'Save' },
    ])
    expect([commands[FIRST]?.when, commands[FIRST]?.captureInput]).toEqual([always, true])
  })

  test('refuses a handler with no bindings, which would never run, for a schema typed only as a schema', () => {
    /** @type {Schema} */
    const general = SCHEMA
    expect(() => fromBindings(general, { nonexistent: () => undefined })).toThrow(
      'keybinds: handler "nonexistent" has no matching binding',
    )
  })
})

describe('BindingsStore', () => {
  test('lays the overrides kept so far over the schema', () => {
    expect(new BindingsStore(SCHEMA, KEY).get('save').keys).toEqual(['$mod+s'])
    localStorage.setItem(KEY, JSON.stringify({ save: { keys: ['ctrl+s'] } }))
    expect(new BindingsStore(SCHEMA, KEY).get('save').keys).toEqual(['ctrl+s'])
  })

  test('keeps a save, and says what changed', () => {
    const store = new BindingsStore(SCHEMA, KEY)
    const details = changes(store)
    store.save({ save: { keys: ['ctrl+s'] } })
    expect([store.get('save').keys, store.get('open').keys]).toEqual([['ctrl+s'], ['$mod+o']])
    expect(store.getOverrides()).toEqual({ save: { keys: ['ctrl+s'] } })
    expect(details).toEqual([{ save: { keys: ['ctrl+s'] } }])
    expect(new BindingsStore(SCHEMA, KEY).get('save').keys).toEqual(['ctrl+s'])
  })

  test('keeps release bindings as written', () => {
    const schema = { close: { label: 'Close', mouse: ['middle:up'] }, open: { label: 'Open', mouse: ['middle'] } }
    new BindingsStore(schema, KEY).save({ close: { mouse: ['back:up'] } })
    const reloaded = new BindingsStore(schema, KEY)
    expect([reloaded.get('close').mouse, reloaded.get('open').mouse]).toEqual([['back:up'], ['middle']])
  })
})

describe('BindingsStore over storage of its own', () => {
  test('loads from and saves to it, not localStorage', () => {
    const { storage } = memoryStorage({ save: { keys: ['ctrl+s'] } })
    const store = new BindingsStore(SCHEMA, storage)
    expect(store.get('save').keys).toEqual(['ctrl+s'])
    store.save({ open: { keys: ['ctrl+o'] } })
    expect([storage.load(), localStorage.length]).toEqual([{ open: { keys: ['ctrl+o'] } }, EMPTY])
  })

  test('follows it changing from elsewhere, once per change, even when it echoes a save back', () => {
    const { change, storage } = memoryStorage()
    const store = new BindingsStore(SCHEMA, storage)
    const details = changes(store)
    change({ save: { keys: ['ctrl+shift+s'] } })
    expect(store.get('save').keys).toEqual(['ctrl+shift+s'])
    store.save({ open: { keys: ['ctrl+o'] } })
    expect(details).toHaveLength(TWICE)
  })

  test('stops following it once disposed', () => {
    const { change, storage } = memoryStorage()
    const store = new BindingsStore(SCHEMA, storage)
    store.dispose()
    change({ save: { keys: ['ctrl+shift+s'] } })
    expect(store.get('save').keys).toEqual(['$mod+s'])
  })
})
