import { describe, expect, test } from 'bun:test'

import { move } from './move.js'

/**
 * A key, with a step through numbers that answers when told to
 * @returns {Readonly<{ key: () => number | undefined, set: (key: number | undefined) => void,
 *   step: (from: number | undefined, by: number) => Promise<number | undefined>, answer: () => void }>} It
 */
function later() {
  /** @type {number | undefined} */
  let key = 0
  /** @type {(() => void)[]} */
  const waiting = []
  return {
    answer() {
      waiting.shift()?.()
    },
    key: () => key,
    set(next) {
      key = next
    },
    step: async (from, by) => {
      /** @type {PromiseWithResolvers<number | undefined>} */
      const answer = Promise.withResolvers()
      waiting.push(() => {
        answer.resolve(Math.max((from ?? -1) + by, 0))
      })
      return answer.promise
    },
  }
}

/** @returns {Promise<void>} When pending promises have run */
async function settle() {
  await Bun.sleep(0)
}

/**
 * Answers each step asked, once pending promises have run
 * @param {Readonly<{ answer: () => void }>} it - What answers
 * @param {number} times - How many
 * @returns {Promise<void>} When answered
 */
async function answerEach(it, times) {
  if (times > 0) {
    await settle()
    it.answer()
    await answerEach(it, times - 1)
  }
}

describe('move', () => {
  test('moves by steps and from an edge', async () => {
    const it = later()
    const moves = move({ from: it.key, step: it.step, to: it.set })
    const first = moves.by(2)
    await settle()
    it.answer()
    await first
    expect(it.key()).toBe(2)
    const second = moves.edge(1)
    await settle()
    it.answer()
    await second
    expect(it.key()).toBe(0)
  })

  test('queues moves made while one is under way, each from the one before', async () => {
    const it = later()
    const moves = move({ from: it.key, step: it.step, to: it.set })
    const all = Promise.all([moves.by(1), moves.by(1), moves.by(1)])
    await answerEach(it, 3)
    await all
    expect(it.key()).toBe(3)
  })

  test('drops what is queued when the key changes from elsewhere', async () => {
    const it = later()
    const moves = move({ from: it.key, step: it.step, to: it.set })
    const all = Promise.all([moves.by(1), moves.by(1)])
    await settle()
    it.set(7)
    it.answer()
    await all
    expect(it.key()).toBe(7)
  })

  test('rejects a move whose step fails, and drops what is queued after it', async () => {
    let key = 0
    const moves = move({
      from: () => key,
      step: () => Promise.reject(new Error('offline')),
      to: (next) => {
        key = next ?? -1
      },
    })
    const failed = moves.by(1)
    const after = moves.by(1)
    expect(failed).rejects.toThrow('offline')
    await after
    expect(key).toBe(0)
  })
})
