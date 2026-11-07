/**
 * @import { Span } from '@interact/core/memory-source'
 * @import { Source } from '@interact/core/source'
 * @import { Numbered, Range } from './test-helpers.js'
 */

import { describe, expect, test } from 'bun:test'

import { MemorySource, findPrefix } from '@interact/core'

import { listboxOver, numberText, numbers, press, TEN_BILLION } from './test-helpers.js'
import { WAIT } from './typeahead.js'

const QUICK = 100
const FIVE_BILLION = 5_000_000_000
const FOUND = 123
const ROWS = 10

/**
 * A clock that moves only when told.
 * @returns {Readonly<{ now: () => number, pass: (milliseconds: number) => void }>} It, and a way to move it on
 */
function clock() {
  let time = 0
  return {
    now: () => time,
    pass: (milliseconds) => {
      time += milliseconds
    },
  }
}

/**
 * A listbox over some names, focused on the first, timed by a clock the test moves.
 * @param {readonly string[]} names - The names
 * @param {'single' | 'multiple'} [mode] - How it selects
 * @returns {Readonly<{ made: ReturnType<typeof listboxOver<string, Span, MemorySource<string>>>, time: ReturnType<typeof clock> }>}
 *   The listbox and its clock
 */
function named(names, mode = 'single') {
  const time = clock()
  const made = listboxOver(new MemorySource(names, (item) => item), { mode, now: time.now })
  made.store.dispatch({ effects: made.current.go(0, { entering: true }) })
  return { made, time }
}

/**
 * Types letters one after another, quickly, noting where each left the active item.
 * @param {ReturnType<typeof named>} typing - The listbox and its clock
 * @param {readonly string[]} letters - What to type
 * @returns {(number | undefined)[]} Where each left it
 */
function typeEach({ made, time }, letters) {
  return letters.map((letter) => {
    press(made.store, letter)
    time.pass(QUICK)
    return made.current.positionIn(made.store.state)
  })
}

const FRUIT = ['apple', 'banana', 'blueberry', 'cherry', 'blackberry']

describe('typing a letter twice', () => {
  test('goes to an item starting with a letter typed twice when there is one, such as "Aaron"', () => {
    expect(typeEach(named(['Abe', 'Adam', 'Ann', 'Aaron']), ['a', 'a'])).toEqual([1, 3])
  })

  test('goes on to the next item starting with a letter typed twice when none starts with it twice', () => {
    expect(typeEach(named(['Abe', 'Adam', 'Ann', 'Bob']), ['a', 'a'])).toEqual([1, 2])
  })
})

describe('typing', () => {
  test('goes to the next item starting with a letter, on through them as it is typed again, and round', () => {
    expect(typeEach(named(FRUIT), ['b', 'b', 'b', 'b'])).toEqual([1, 2, 4, 1])
  })

  test('goes to the item starting with a word typed quickly, which the active item may already be', () => {
    expect(typeEach(named(FRUIT), ['b', 'l', 'a'])).toEqual([1, 2, 4])
  })

  test('starts over after a pause, and stays put when nothing starts so', () => {
    const typing = named(FRUIT)
    press(typing.made.store, 'c')
    typing.time.pass(WAIT)
    expect(typeEach(typing, ['b', 'z'])).toEqual([4, 4])
  })

  test('takes a space as part of what is typed while typing goes on', async () => {
    const typing = named(['a fig', 'a b', 'a c'], 'multiple')
    expect(typeEach(typing, ['a', ' ', 'c']).at(-1)).toBe(2)
    expect(await typing.made.chosen.count(typing.made.store.state)).toBe(0)
  })

  test('leaves a space to the selection once typing has paused', async () => {
    const typing = named(['a fig', 'a b', 'a c'], 'multiple')
    press(typing.made.store, 'a')
    typing.time.pass(WAIT)
    press(typing.made.store, ' ')
    expect(await typing.made.chosen.count(typing.made.store.state)).toBe(1)
  })
})

/**
 * A source of ten billion numbered items answering `findPrefix`, which finds something only from the start, at once
 * or later, noting what it was asked.
 * @param {boolean} later - Whether it answers later
 * @returns {Readonly<{ source: Source<Numbered, Range>, asked: [string, number][] }>} The source, and what it was asked
 */
function searching(later) {
  /** @type {[string, number][]} */
  const asked = []
  return {
    asked,
    source: {
      ...numbers(TEN_BILLION).source,
      ask: (question) => {
        const input = findPrefix.input(question)?.input
        if (input === undefined) {
          return undefined
        }
        asked.push([input.text, input.from])
        const found = input.from === 0 ? FOUND + input.text.length : undefined
        return findPrefix.answer(later ? Promise.resolve(found) : found)
      },
    },
  }
}

describe('typing in a list whose source answers findPrefix', () => {
  test('asks it from after the active item and then from the start', () => {
    const { asked, source } = searching(false)
    const { current, store } = listboxOver(source, { rows: ROWS, text: numberText, top: FIVE_BILLION })
    store.dispatch({ effects: current.go(FIVE_BILLION, { entering: true }) })
    press(store, 'x')
    expect(asked).toEqual([
      ['x', FIVE_BILLION + 1],
      ['x', 0],
    ])
    expect(current.positionIn(store.state)).toBe(FOUND + 1)
  })

  test('drops an answer that comes after more was typed', async () => {
    const { source } = searching(true)
    const { current, store } = listboxOver(source, { rows: ROWS, text: numberText })
    /** @type {(number | undefined)[]} */
    const landed = []
    store.subscribe(() => {
      landed.push(current.positionIn(store.state))
    })
    press(store, 'x')
    press(store, 'y')
    await Bun.sleep(0)
    expect(landed.filter((position) => position !== undefined)).toEqual([FOUND + 2])
  })
})

describe('typing in a list whose source cannot search', () => {
  test('looks among the rows it renders', () => {
    const { current, store } = listboxOver(numbers(TEN_BILLION).source, { rows: ROWS, text: numberText })
    store.dispatch({ effects: current.go(0, { entering: true }) })
    press(store, 'i')
    expect(current.positionIn(store.state)).toBe(1)
    press(store, 'z')
    expect(current.positionIn(store.state)).toBe(1)
  })
})
