import { describe, expect, test } from 'bun:test'

import { resolve } from './compose.js'
import { arraySource, host } from './host.js'
import { reorderList } from './reorder.js'
import { keydown } from './test-inputs.js'

/** @import { Key } from './contract.js' */
/** @import { Source } from './host.js' */

const ORDER = {
  dragDistance: 4,
  focusable: true,
  keyshortcuts: 'Alt+ArrowUp Alt+ArrowDown',
  label: 'Order',
  rows: 4,
  selected: null,
  shown: true,
  source: 'order',
}

/**
 * The keys a running reorderable list draws
 * @param {import('./host.js').Host} running - The list
 * @returns {readonly unknown[]} Its options' keys
 */
function drawn(running) {
  return resolve(reorderList, running.state(), ORDER).content.map((option) =>
    'target' in option ? option.target.item : null,
  )
}

/**
 * Lets queued answers arrive
 * @returns {Promise<void>} When they have
 */
async function settled() {
  await Bun.sleep(5)
}

describe('a host over a source', () => {
  test('answers asks, and hands a widget its moves in the order made, however long the first takes', async () => {
    const kept = arraySource(['a', 'b', 'c', 'd', 'e'])
    let first = true
    /** @type {Source} */
    const slowFirst = {
      move: async (item, target, after) => {
        if (first) {
          first = false
          await Bun.sleep(3)
        }
        return kept.move(item, target, after)
      },
      read: kept.read,
      watch: kept.watch,
    }
    const running = host({ props: ORDER, sources: { order: slowFirst }, widget: reorderList })
    running.begin()
    await settled()
    running.dispatch([], keydown('root', 'ArrowDown'))
    running.dispatch([], keydown('root', 'ArrowDown', { altKey: true }))
    running.dispatch([], keydown('root', 'ArrowDown', { altKey: true }))
    expect(drawn(running)).toEqual(['b', 'c', 'a', 'd'])
    await settled()
    await settled()
    expect([kept.keys(), drawn(running)]).toEqual([
      ['b', 'c', 'a', 'd', 'e'],
      ['b', 'c', 'a', 'd'],
    ])
    running.stop()
  })

  test('undoes a move its source refuses, on the screen as well as in the widget', async () => {
    const kept = arraySource(['a', 'b', 'c'])
    /** @type {Source} */
    const refusing = { move: () => false, read: kept.read, watch: kept.watch }
    /** @type {Key[]} */
    const said = []
    const running = host({
      effect: (out) => {
        const { effect } = out
        if (
          typeof effect === 'object' &&
          effect !== null &&
          'message' in effect &&
          typeof effect.message === 'string'
        ) {
          said.push(effect.message)
        }
      },
      props: { ...ORDER, source: 'order' },
      sources: { order: refusing },
      widget: reorderList,
    })
    running.begin()
    await settled()
    running.dispatch([], keydown('root', 'ArrowDown'))
    running.dispatch([], keydown('root', 'ArrowDown', { altKey: true }))
    expect(drawn(running)).toEqual(['b', 'a', 'c'])
    await settled()
    expect([drawn(running), said]).toEqual([
      ['a', 'b', 'c'],
      ['moved', 'refused'],
    ])
    running.stop()
  })
})
