/**
 * @import { Numbered, Range } from './test-helpers.js'
 */

import { describe, expect, test } from 'bun:test'

import { spanning, toggle } from '@interact/core'

import { Listbox } from './listbox.js'
import { numberText, numbers } from './test-helpers.js'

const TEN_BILLION = 10_000_000_000
const FIVE_BILLION = 5_000_000_000
const ROWS = 10
const START = 0
const ONE = 1
const TWO = 2
const THREE = 3
const FOUR = 4
const PLAIN = { shift: false, toggle: false }

/**
 * A listbox over ten billion numbered items whose source can place them, or not.
 * @param {boolean} places - Whether the source can place items
 * @returns {Listbox<Numbered, Range>} The listbox
 */
function tenBillion(places) {
  return new Listbox({ mode: 'multiple', rows: ROWS, source: numbers(TEN_BILLION, places).source, text: numberText })
}

/**
 * Selects ten items from five billion on, then deselects the first of them.
 * @param {Listbox<Numbered, Range>} listbox - The listbox
 * @returns {void}
 */
function selectFromFiveBillion(listbox) {
  const { source } = listbox.items
  if (source === undefined) {
    throw new Error('The listbox has no source')
  }
  const span = spanning(source, FIVE_BILLION, FIVE_BILLION + ROWS)
  listbox.selection.set(toggle(span, source, { id: FIVE_BILLION }))
}

/**
 * Lets an answer the source gave at once reach the listbox.
 * @returns {Promise<void>} When it has
 */
async function answered() {
  await Bun.sleep(START)
}

describe('focus entering a listbox with nothing active', () => {
  test('goes to the first selected item, and shows it, when the source can place items', async () => {
    const listbox = tenBillion(true)
    selectFromFiveBillion(listbox)
    listbox.focus()
    await answered()
    expect(listbox.active.get()).toBe(FIVE_BILLION + ONE)
    const { end, start } = listbox.scroll.window()
    expect(start).toBeLessThanOrEqual(FIVE_BILLION + ONE)
    expect(end).toBeGreaterThan(FIVE_BILLION + ONE)
  })

  test('goes to the top item when the source cannot place items', async () => {
    const listbox = tenBillion(false)
    selectFromFiveBillion(listbox)
    listbox.focus()
    expect(listbox.active.get()).toBe(START)
    await answered()
    expect(listbox.active.get()).toBe(START)
  })

  test('goes to the top item at once when nothing is selected', () => {
    const listbox = tenBillion(true)
    listbox.scroll.scrollTo(TWO)
    listbox.focus()
    expect(listbox.active.get()).toBe(TWO)
  })

  test('drops an answer that comes after a key made an item active', async () => {
    const listbox = tenBillion(true)
    selectFromFiveBillion(listbox)
    listbox.focus()
    listbox.key('ArrowDown', PLAIN)
    await answered()
    expect(listbox.active.get()).toBe(ONE)
  })
})

describe('focus entering a listbox, besides the first selected item', () => {
  test('brings the active item back into view when it was scrolled away', () => {
    const listbox = tenBillion(true)
    listbox.goTo(THREE)
    listbox.scroll.scrollTo(FIVE_BILLION)
    listbox.focus()
    expect(listbox.scroll.top.get()).toBe(THREE)
  })

  test('makes the item last chosen active when nothing is, if the source cannot place items', () => {
    const listbox = tenBillion(false)
    listbox.choose.press(FOUR, PLAIN)
    listbox.active.set(undefined)
    listbox.focus()
    expect(listbox.active.get()).toBe(FOUR)
  })
})
