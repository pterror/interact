/** @import { Span } from '@interact/core/memory-source' */
/** @import { Source } from '@interact/core/source' */
/** @import { Numbered, Range } from './test-helpers.js' */

import { describe, expect, test } from 'bun:test'

import { MemorySource } from '@interact/core'

import { Listbox } from './listbox.js'
import { TEN_BILLION, numberText, numbers } from './test-helpers.js'
import { WAIT } from './typeahead.js'

const FIVE_BILLION = 5_000_000_000
const ROWS = 10
const START = 0
const ONE = 1
const TWO = 2
const THREE = 3
const FOUR = 4
const QUICK = 100
const FOUND = 123
const PLAIN = { shift: false, toggle: false }
const SHIFT = { shift: true, toggle: false }
const TOGGLE_SHIFT = { shift: true, toggle: true }

/**
 * A clock that moves only when told.
 * @returns {Readonly<{ now: () => number, pass: (milliseconds: number) => void }>} It, and a way to move it on
 */
function clock() {
  let time = START
  return {
    now: () => time,
    pass: (milliseconds) => {
      time += milliseconds
    },
  }
}

/**
 * A listbox over a few fruit, focused on the first, timed by a clock the test moves.
 * @returns {Readonly<{ listbox: Listbox<string, Span>, time: ReturnType<typeof clock> }>} The listbox and its clock
 */
function fruit() {
  const time = clock()
  const source = new MemorySource(['apple', 'banana', 'blueberry', 'cherry', 'blackberry'], (item) => item)
  const listbox = new Listbox({ now: time.now, rows: ROWS, source })
  listbox.focus()
  return { listbox, time }
}

/**
 * A multiple-selection listbox over items with spaces in them, focused on the first, timed by a clock the test moves.
 * @returns {Readonly<{ listbox: Listbox<string, Span>, time: ReturnType<typeof clock> }>} The listbox and its clock
 */
function spaced() {
  const time = clock()
  const source = new MemorySource(['a fig', 'a b', 'a c'], (item) => item)
  const listbox = new Listbox({ mode: 'multiple', now: time.now, rows: ROWS, source })
  listbox.focus()
  return { listbox, time }
}

/**
 * Lets what a key started (a search, say) finish.
 * @returns {Promise<void>} When it has
 */
async function settled() {
  await Bun.sleep(START)
}

/**
 * Types letters one after another, quickly, noting where each left the active item.
 * @param {ReturnType<typeof fruit>} typing - The listbox and its clock
 * @param {readonly string[]} letters - What to type
 * @param {readonly (number | undefined)[]} seen - Where the letters so far left it
 * @returns {Promise<readonly (number | undefined)[]>} Where each left it
 */
async function typeEach(typing, letters, seen) {
  const [letter, ...rest] = letters
  if (letter === undefined) {
    return seen
  }
  await typing.listbox.type(letter)
  typing.time.pass(QUICK)
  return typeEach(typing, rest, [...seen, typing.listbox.active.get()])
}

/**
 * A source of ten billion numbered items that can search, which finds something only from the start, noting what it
 * was asked.
 * @returns {Readonly<{ source: Source<Numbered, Range>, asked: [string, number][] }>} The source, and what it was asked
 */
function searching() {
  /** @type {[string, number][]} */
  const asked = []
  return {
    asked,
    source: {
      ...numbers(TEN_BILLION).source,
      findPrefix: (text, from) => {
        asked.push([text, from])
        return from === START ? FOUND : undefined
      },
    },
  }
}

describe('typing', () => {
  test('goes to the next item starting with a letter, on through them as it is typed again, and round', async () => {
    expect(await typeEach(fruit(), ['b', 'b', 'b', 'b'], [])).toEqual([ONE, TWO, FOUR, ONE])
  })

  test('goes to the item starting with a word typed quickly, which the active item may already be', async () => {
    const { listbox, time } = fruit()
    await listbox.type('b')
    time.pass(QUICK)
    await listbox.type('l')
    expect(listbox.active.get()).toBe(TWO)
    time.pass(QUICK)
    await listbox.type('a')
    expect(listbox.active.get()).toBe(FOUR)
  })

  test('starts over after a pause, and stays put when nothing starts so', async () => {
    const { listbox, time } = fruit()
    await listbox.type('c')
    time.pass(WAIT)
    await listbox.type('b')
    expect(listbox.active.get()).toBe(FOUR)
    await listbox.type('z')
    expect(listbox.active.get()).toBe(FOUR)
  })

  test('takes a space as part of what is typed while typing goes on', async () => {
    const { listbox } = spaced()
    listbox.key('a', PLAIN)
    listbox.key(' ', PLAIN)
    listbox.key('c', PLAIN)
    await settled()
    expect([listbox.active.get(), await listbox.choose.count()]).toEqual([TWO, START])
  })

  test('takes a space as a toggle once typing has paused', async () => {
    const { listbox, time } = spaced()
    listbox.key('a', PLAIN)
    time.pass(WAIT)
    listbox.key(' ', PLAIN)
    expect(await listbox.choose.count()).toBe(ONE)
  })
})

describe('typing in a listbox over a source', () => {
  test('asks a source that can search, from after the active item and then from the start', async () => {
    const { asked, source } = searching()
    const listbox = new Listbox({ rows: ROWS, source, text: numberText, top: FIVE_BILLION })
    listbox.focus()
    await listbox.type('x')
    expect(asked).toEqual([
      ['x', FIVE_BILLION + ONE],
      ['x', START],
    ])
    expect(listbox.active.get()).toBe(FOUND)
  })

  test('looks only among the items read when the source cannot search', async () => {
    const listbox = new Listbox({ rows: ROWS, source: numbers(TEN_BILLION).source, text: numberText })
    listbox.focus()
    await listbox.type('i')
    expect(listbox.active.get()).toBe(ONE)
    await listbox.type('z')
    expect(listbox.active.get()).toBe(ONE)
  })
})

describe('selecting with keys in multiple mode', () => {
  test('selects through from the anchor with Shift and Space', async () => {
    const listbox = new Listbox({ mode: 'multiple', rows: ROWS, source: numbers(TEN_BILLION).source })
    listbox.choose.press(TWO, PLAIN)
    listbox.key('ArrowDown', PLAIN)
    listbox.key('ArrowDown', PLAIN)
    listbox.key(' ', SHIFT)
    expect(await listbox.choose.count()).toBe(THREE)
  })

  test('selects from the active item to the last or first, going there', async () => {
    const listbox = new Listbox({ mode: 'multiple', rows: ROWS, source: numbers(TEN_BILLION).source })
    listbox.goTo(FIVE_BILLION)
    listbox.key('End', TOGGLE_SHIFT)
    expect([listbox.active.get(), await listbox.choose.count()]).toEqual([TEN_BILLION - ONE, FIVE_BILLION])
    listbox.key('Home', TOGGLE_SHIFT)
    expect([listbox.active.get(), await listbox.choose.count()]).toEqual([START, TEN_BILLION])
  })
})

describe('focus entering', () => {
  test('brings the active item back into view when it was scrolled away', () => {
    const listbox = new Listbox({ rows: ROWS, source: numbers(TEN_BILLION).source })
    listbox.goTo(THREE)
    listbox.scroll.scrollTo(FIVE_BILLION)
    listbox.focus()
    expect(listbox.scroll.top.get()).toBe(THREE)
  })

  test('makes the item last chosen active when nothing is', () => {
    const listbox = new Listbox({ mode: 'multiple', rows: ROWS, source: numbers(TEN_BILLION).source })
    listbox.choose.press(FOUR, PLAIN)
    listbox.active.set(undefined)
    listbox.focus()
    expect(listbox.active.get()).toBe(FOUR)
  })
})
