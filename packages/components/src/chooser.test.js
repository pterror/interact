/** @import { Selection } from '@interact/core/selection' */
/** @import { Numbered, Range } from './test-helpers.js' */

import { describe, expect, test } from 'bun:test'

import { Controllable, countSelected, nothing } from '@interact/core'

import { Chooser } from './chooser.js'
import { TEN_BILLION, numbers } from './test-helpers.js'

const START = 0
const ONE = 1
const TWO = 2
const FIVE = 5
const PLAIN = { shift: false, toggle: false }
const SHIFT = { shift: true, toggle: false }
const TOGGLE = { shift: false, toggle: true }

/**
 * A chooser over ten billion numbered items, all read, with what it asked for.
 * @param {'single' | 'multiple' | 'none'} mode - How it selects
 * @returns {Readonly<{ chooser: Chooser<Numbered, Range>, selection: Controllable<Selection<Range>>, actives: number[] }>}
 *   The chooser, the selection it changes, and the active items it asked for
 */
function choosing(mode) {
  const { source } = numbers(TEN_BILLION)
  /** @type {Selection<Range>} */
  const none = nothing()
  const selection = new Controllable(none, false)
  /** @type {number[]} */
  const actives = []
  const chooser = new Chooser(
    {
      count: () => TEN_BILLION,
      item: (position) => ({ id: position }),
      requestActive: (position) => {
        actives.push(position)
      },
      requestSelection: (next) => {
        selection.request(next)
      },
      selection: () => selection.get(),
      source: () => source,
    },
    mode,
  )
  return { actives, chooser, selection }
}

describe('Chooser', () => {
  test('selects a pressed item alone, and makes it active', async () => {
    const { actives, chooser, selection } = choosing('multiple')
    chooser.press(TWO, PLAIN)
    expect(actives).toEqual([TWO])
    expect(await countSelected(selection.get(), numbers(TEN_BILLION).source)).toBe(ONE)
    expect([chooser.isSelected(TWO), chooser.isSelected(ONE)]).toEqual([true, false])
  })

  test('selects through from the anchor with Shift, and toggles with the toggle modifier', async () => {
    const { chooser } = choosing('multiple')
    chooser.press(ONE, PLAIN)
    chooser.press(FIVE, SHIFT)
    expect(await chooser.count()).toBe(FIVE)
    chooser.press(TWO, TOGGLE)
    expect(await chooser.count()).toBe(FIVE - ONE)
  })

  test('follows the active item in single mode, and selects all only as one filter', async () => {
    const { chooser } = choosing('single')
    chooser.moved(FIVE, true)
    expect([chooser.isSelected(FIVE), await chooser.count()]).toEqual([true, ONE])
    chooser.all()
    expect(await chooser.count()).toBe(TEN_BILLION)
  })
})

describe('Chooser in multiple mode', () => {
  test('keeps its anchor while moving in multiple mode, extending from where the move started before any choice', async () => {
    const { chooser } = choosing('multiple')
    chooser.moved(TWO, true, ONE)
    expect([chooser.anchor, await chooser.count()]).toEqual([ONE, TWO])
    chooser.press(FIVE, PLAIN)
    chooser.moved(START, false)
    expect(chooser.anchor).toBe(FIVE)
  })

  test('selects a span in multiple mode only', async () => {
    const multiple = choosing('multiple').chooser
    multiple.span(FIVE, ONE)
    expect(await multiple.count()).toBe(FIVE)
    const single = choosing('single').chooser
    single.span(FIVE, ONE)
    expect(await single.count()).toBe(START)
  })

  test('forgets its anchor on reset', async () => {
    const { chooser } = choosing('multiple')
    chooser.press(FIVE, PLAIN)
    chooser.reset()
    chooser.press(START, SHIFT)
    expect(await chooser.count()).toBe(ONE)
  })
})

describe('Chooser with no selection', () => {
  test('makes what is pressed or moved to active, and selects nothing', async () => {
    const { actives, chooser, selection } = choosing('none')
    chooser.press(FIVE, SHIFT)
    chooser.press(TWO, TOGGLE)
    chooser.moved(ONE, true, FIVE)
    chooser.toggle(ONE)
    chooser.span(START, FIVE)
    chooser.all()
    expect(actives).toEqual([FIVE, TWO])
    expect(selection.get()).toEqual(nothing())
    expect(await chooser.count()).toBe(START)
  })
})
