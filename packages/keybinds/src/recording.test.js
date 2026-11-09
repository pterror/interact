import { describe, expect, mock, test } from 'bun:test'

import { recording } from './recording.js'

const PAUSE = 20
const LONGER = 40

/**
 * A recording of string slots, noting what it records
 * @param {Partial<Parameters<typeof recording<string>>[0]>} [options] - More options
 * @returns {Readonly<{ done: ReturnType<typeof mock<(slot: string, binding: string) => void>>,
 *   rec: ReturnType<typeof recording<string>> }>} The recording, and what it recorded
 */
function recorded(options = {}) {
  const done = mock((/** @type {string} */ _slot, /** @type {string} */ _binding) => undefined)
  return { done, rec: recording({ done, pause: PAUSE, ...options }) }
}

describe('recording', () => {
  test('records a press into the slot started, then ends; heard while not recording is nothing', () => {
    const { done, rec } = recorded()
    rec.heard('k')
    rec.start('save')
    expect(rec.get()).toEqual({ slot: 'save', suffix: '' })
    rec.heard('ctrl+s')
    expect([done.mock.calls, rec.get()]).toEqual([[['save', 'ctrl+s']], undefined])
  })

  test('captures a hold or a tap with its suffix, a release as the recorder writes it, and back to a press', () => {
    const { done, rec } = recorded()
    rec.start('a')
    rec.capture(':hold')
    rec.heard('k')
    rec.start('b')
    rec.capture(':up')
    rec.heard('k:up')
    rec.start('c')
    rec.capture(':tap')
    rec.capture(':tap')
    rec.heard('k')
    expect(done.mock.calls).toEqual([
      ['a', 'k:hold'],
      ['b', 'k:up'],
      ['c', 'k'],
    ])
  })

  test("leaves out what can't take the suffix captured (a scroll)", () => {
    const { done, rec } = recorded({ takesSuffix: (_slot, binding) => !binding.startsWith('scroll') })
    rec.start('a')
    rec.capture(':hold')
    rec.heard('scrollup')
    rec.heard('middle')
    expect(done.mock.calls).toEqual([['a', 'middle:hold']])
  })

  test('takes steps one after another until finished, and steps and a suffix never go together', () => {
    const { done, rec } = recorded()
    rec.start('a')
    rec.capture(':up')
    rec.toggleSteps()
    expect(rec.get()).toEqual({ slot: 'a', steps: [], suffix: '' })
    rec.finish()
    rec.heard('g')
    rec.heard('i')
    expect(rec.get()).toEqual({ slot: 'a', steps: ['g', 'i'], suffix: '' })
    rec.finish()
    expect(done.mock.calls).toEqual([['a', 'g i']])
    rec.start('b')
    rec.toggleSteps()
    rec.capture(':hold')
    expect(rec.get()).toEqual({ slot: 'b', suffix: ':hold' })
  })

  test('takes the steps so far after a pause, and not once stopped', async () => {
    const { done, rec } = recorded()
    rec.start('a')
    rec.toggleSteps()
    rec.heard('g')
    await Bun.sleep(LONGER)
    rec.start('b')
    rec.toggleSteps()
    rec.heard('h')
    rec.stop()
    await Bun.sleep(LONGER)
    expect(done.mock.calls).toEqual([['a', 'g']])
  })

  test('is heard at each change', () => {
    const { rec } = recorded()
    const heard = mock(() => undefined)
    const stop = rec.watch(heard)
    rec.start('a')
    rec.capture(':tap')
    stop()
    rec.stop()
    expect(heard).toHaveBeenCalledTimes(2)
  })
})
