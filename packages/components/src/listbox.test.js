import { describe, expect, test } from 'bun:test'

import { MemorySource } from '@interact/core'

import { Listbox } from './listbox.js'
import { numberText, numbers } from './test-helpers.js'

const TEN_BILLION = 10_000_000_000
const FIVE_BILLION = 5_000_000_000
const ROWS = 10
const OVERSCAN = 5
const START = 0
const ONE = 1
const TWO = 2
const JUMPS = 200
const BLOCKS = 16
const PLAIN = { shift: false, toggle: false }
const SHIFT = { shift: true, toggle: false }
const TOGGLE = { shift: false, toggle: true }

/**
 * A listbox over ten billion numbered items.
 * @param {'single' | 'multiple'} mode - How it selects
 * @returns {Listbox<import('./test-helpers.js').Numbered, import('./test-helpers.js').Range>} The listbox
 */
function tenBillion(mode) {
  return new Listbox({ mode, rows: ROWS, source: numbers(TEN_BILLION).source, text: numberText })
}

describe('what a listbox renders', () => {
  test('is the rows showing and a few either side, ten billion items in', () => {
    const listbox = tenBillion('single')
    listbox.scroll.scrollTo(FIVE_BILLION)
    expect(listbox.scroll.window()).toEqual({ end: FIVE_BILLION + ROWS + OVERSCAN, start: FIVE_BILLION - OVERSCAN })
    expect(listbox.items.item(FIVE_BILLION)).toEqual({ id: FIVE_BILLION })
  })

  test('keeps the active item rendered when it is scrolled away', () => {
    const listbox = tenBillion('single')
    listbox.choose.press(TWO, PLAIN)
    listbox.scroll.scrollTo(FIVE_BILLION)
    expect(listbox.positions().at(-ONE)).toBe(TWO)
    expect(listbox.items.item(TWO)).toEqual({ id: TWO })
  })

  test('scrolls no further than shows the last item in the last row', () => {
    const listbox = tenBillion('single')
    listbox.scroll.scrollTo(TEN_BILLION)
    expect(listbox.scroll.top.get()).toBe(TEN_BILLION - ROWS)
  })

  test('holds a bounded number of blocks however far it jumps', () => {
    const listbox = tenBillion('single')
    for (let jump = START; jump < JUMPS; jump += ONE) {
      listbox.scroll.scrollTo(Math.floor((TEN_BILLION / JUMPS) * jump))
    }
    expect(listbox.items.blocks).toBeLessThanOrEqual(BLOCKS)
  })
})

describe('keys', () => {
  test('move the active item, scrolling just enough to show it', () => {
    const listbox = tenBillion('single')
    listbox.focus()
    expect(listbox.active.get()).toBe(START)
    for (let step = START; step < ROWS; step += ONE) {
      listbox.key('ArrowDown', PLAIN)
    }
    expect([listbox.active.get(), listbox.scroll.top.get()]).toEqual([ROWS, ONE])
  })

  test('go to either end', () => {
    const listbox = tenBillion('single')
    listbox.focus()
    listbox.key('End', PLAIN)
    expect([listbox.active.get(), listbox.scroll.top.get()]).toEqual([TEN_BILLION - ONE, TEN_BILLION - ROWS])
    listbox.key('Home', PLAIN)
    expect([listbox.active.get(), listbox.scroll.top.get()]).toEqual([START, START])
  })

  test('select the active item in single mode, as they move', () => {
    const listbox = tenBillion('single')
    listbox.focus()
    listbox.key('ArrowDown', PLAIN)
    expect([listbox.choose.isSelected(START), listbox.choose.isSelected(ONE)]).toEqual([false, true])
  })

  test('toggle, extend and select everything in multiple mode', async () => {
    const listbox = tenBillion('multiple')
    listbox.focus()
    listbox.key(' ', PLAIN)
    listbox.key('ArrowDown', SHIFT)
    listbox.key('ArrowDown', SHIFT)
    expect(await listbox.choose.count()).toBe(TWO + ONE)
    listbox.key('a', TOGGLE)
    expect(await listbox.choose.count()).toBe(TEN_BILLION)
  })

  test('activate the active item with Enter', () => {
    const listbox = tenBillion('single')
    /** @type {number[]} */
    const activated = []
    listbox.onActivate((position) => {
      activated.push(position)
    })
    listbox.focus()
    listbox.key('Enter', PLAIN)
    expect(activated).toEqual([START])
  })
})

describe('keys, besides moving', () => {
  test('mean nothing in an empty listbox', () => {
    expect(new Listbox().key('ArrowDown', PLAIN)).toBe(false)
  })
})

describe('selection', () => {
  test('of everything but one counts ten billion less one, reading only what shows', async () => {
    const numbered = numbers(TEN_BILLION)
    const listbox = new Listbox({ mode: 'multiple', rows: ROWS, source: numbered.source })
    listbox.choose.all()
    listbox.choose.press(TWO, TOGGLE)
    expect(await listbox.choose.count()).toBe(TEN_BILLION - ONE)
    expect(listbox.choose.isSelected(TWO)).toBe(false)
    expect(listbox.choose.isSelected(ONE)).toBe(true)
    expect(numbered.reads()).toBeLessThanOrEqual(ROWS * ROWS)
  })

  test('through from the anchor with Shift, either way round', async () => {
    const listbox = tenBillion('multiple')
    listbox.choose.press(ROWS, PLAIN)
    listbox.choose.press(TWO, SHIFT)
    expect(await listbox.choose.count()).toBe(ROWS - TWO + ONE)
  })

  test('waits for the app when controlled, which hears what was asked', async () => {
    const listbox = tenBillion('multiple')
    listbox.selection.control(true)
    /** @type {number[]} */
    const asked = []
    listbox.selection.onRequest(() => {
      asked.push(ONE)
    })
    listbox.choose.all()
    expect(asked).toEqual([ONE])
    expect(await listbox.choose.count()).toBe(START)
  })
})

describe('following the source', () => {
  test('keeps the active item active as items are inserted before it', () => {
    const source = new MemorySource(['a', 'b', 'c'], (item) => item)
    const listbox = new Listbox({ rows: ROWS, source })
    listbox.choose.press(TWO, PLAIN)
    source.insert(START, ['z'])
    expect(listbox.active.get()).toBe(TWO + ONE)
    expect(listbox.items.item(TWO + ONE)).toBe('c')
  })

  test('reports a failed read', async () => {
    const failing = numbers(TEN_BILLION).source
    /** @type {unknown[]} */
    const errors = []
    const listbox = new Listbox({
      source: {
        ...failing,
        read: async () => {
          await Promise.resolve()
          throw new Error('offline')
        },
      },
    })
    listbox.items.onError((problem) => {
      errors.push(problem)
    })
    listbox.scroll.scrollTo(ONE)
    await Bun.sleep(ONE)
    expect(errors.length).toBeGreaterThan(START)
  })
})

describe('the source', () => {
  test('is state like the rest: a new one starts over, the top kept as far as the new items reach', async () => {
    const listbox = tenBillion('multiple')
    listbox.scroll.scrollTo(FIVE_BILLION)
    listbox.goTo(FIVE_BILLION + ONE)
    listbox.key(' ', PLAIN)
    listbox.source.set(numbers(ROWS * TWO).source)
    expect([listbox.items.count, listbox.active.get(), await listbox.choose.count()]).toEqual([
      ROWS * TWO,
      undefined,
      START,
    ])
    expect(listbox.scroll.top.get()).toBe(ROWS)
  })
})
