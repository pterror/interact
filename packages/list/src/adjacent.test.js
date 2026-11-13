import { describe, expect, test } from 'bun:test'

import { adjacent } from './adjacent.js'

/** @returns {Promise<void>} When pending answers have come */
async function settle() {
  await Bun.sleep(0)
}

/**
 * A Step over a list whose answers wait until let go, in any order
 * @param {readonly string[]} keys - The list
 * @returns {{
 *   step: import('./adjacent.js').Step<string>,
 *   changes: import('./adjacent.js').Changes<string>,
 *   set: (next: readonly string[], changed?: readonly string[]) => void,
 *   waiting: Readonly<{ key: string, answer: () => void }>[],
 * }} The Step, its changes, an edit, and the answers not yet given
 */
function source(keys) {
  let list = keys
  /** @type {Readonly<{ key: string, answer: () => void }>[]} */
  const waiting = []
  /** @type {Set<(keys?: readonly string[]) => void>} */
  const listeners = new Set()
  return {
    changes: {
      watch(listener) {
        listeners.add(listener)
        return () => {
          listeners.delete(listener)
        }
      },
    },
    set(next, changed) {
      list = next
      for (const listener of listeners) {
        listener(changed)
      }
    },
    step: {
      step(key, by) {
        const at = list.indexOf(key)
        const answer = list[Math.min(Math.max(at + by, 0), list.length - 1)]
        const { promise, resolve } = Promise.withResolvers()
        waiting.push({
          answer: () => {
            resolve(answer)
          },
          key,
        })
        return promise.then(() => answer)
      },
    },
    waiting,
  }
}

describe('adjacent', () => {
  test('asks for a key the first time it is wanted, and knows none at the edge', async () => {
    const served = source(['a', 'b', 'c'])
    const before = adjacent({ by: -1, changes: served.changes, step: served.step })
    /** @type {(readonly string[] | undefined)[]} */
    const heard = []
    before.watch((keys) => {
      heard.push(keys)
    })
    expect([before.of('b'), before.of('a'), before.of('b')]).toEqual([undefined, undefined, undefined])
    expect(served.waiting.map((each) => each.key)).toEqual(['b', 'a'])
    for (const each of served.waiting.splice(0).toReversed()) {
      each.answer()
    }
    await settle()
    expect([before.of('b'), before.of('a')]).toEqual([{ key: 'a' }, { key: undefined }])
    expect(heard).toEqual([['a'], ['b']])
    expect(served.waiting).toHaveLength(0)
  })

  test("keeps a key's last answer after a change until the new one comes, and takes only the latest question's", async () => {
    const served = source(['a', 'b', 'c'])
    const before = adjacent({ by: -1, changes: served.changes, step: served.step })
    before.of('c')
    served.waiting.splice(0)[0]?.answer()
    await settle()
    /** @type {(readonly string[] | undefined)[]} */
    const heard = []
    before.watch((keys) => {
      heard.push(keys)
    })
    served.set(['a', 'x', 'c'], ['c'])
    expect(before.of('c')).toEqual({ key: 'b' })
    served.set(['a', 'x', 'y', 'c'], ['c'])
    expect(before.of('c')).toEqual({ key: 'b' })
    const [early, late] = served.waiting.splice(0)
    late?.answer()
    await settle()
    early?.answer()
    await settle()
    expect(before.of('c')).toEqual({ key: 'y' })
    expect(heard).toEqual([['c'], ['c'], ['c']])
  })

  test('asks again for every key on a change that names none', async () => {
    const served = source(['a', 'b'])
    const after = adjacent({ by: 1, changes: served.changes, step: served.step })
    after.of('a')
    served.waiting.splice(0)[0]?.answer()
    await settle()
    expect(after.of('a')).toEqual({ key: 'b' })
    served.set(['a', 'c', 'b'])
    after.of('a')
    expect(served.waiting.map((each) => each.key)).toEqual(['a'])
  })
})

describe('adjacent, when a question fails', () => {
  test('knows nothing new and asks again the next time the key is wanted', async () => {
    let fail = true
    let asked = 0
    const before = adjacent({
      by: -1,
      changes: { watch: () => () => undefined },
      step: {
        step(key) {
          asked += 1
          return fail ? Promise.reject(new Error('offline')) : Promise.resolve(key === 'b' ? 'a' : key)
        },
      },
    })
    expect(before.of('b')).toBeUndefined()
    await settle()
    fail = false
    expect(before.of('b')).toBeUndefined()
    await settle()
    expect([before.of('b'), asked]).toEqual([{ key: 'a' }, 2])
  })
})
