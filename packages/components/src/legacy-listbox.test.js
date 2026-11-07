// Legacy: tests of a module the menu, palette and combobox still run on until they are rebuilt (docs/design.md).
/**
 * @import { Span } from '@interact/core/memory-source'
 * @import { Source } from '@interact/core/source'
 * @import { Numbered, Range } from './test-helpers.js'
 */

import { describe, expect, test } from 'bun:test'

import { MemorySource, spanning, toggle } from '@interact/core'

import { Listbox } from './legacy-listbox.js'
import { WAIT } from './legacy-typeahead.js'
import { TEN_BILLION, numberText, numbers } from './test-helpers.js'

const FIVE_BILLION = 5_000_000_000
const ROWS = 10
const OVERSCAN = 5
const NONE = 0
const START = 0
const ONE = 1
const TWO = 2
const THREE = 3
const FOUR = 4
const FIVE = 5
const JUMPS = 200
const BLOCKS = 16
const QUICK = 100
const FOUND = 123
const SEPARATOR = '—'
const PLAIN = { shift: false, toggle: false }
const SHIFT = { shift: true, toggle: false }
const TOGGLE = { shift: false, toggle: true }
const TOGGLE_SHIFT = { shift: true, toggle: true }

/** @typedef {Readonly<{ id: number, label: string }>} Labelled */

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
 * A listbox over some names, focused on the first, timed by a clock the test moves.
 * @param {readonly string[]} names - The names
 * @returns {Readonly<{ listbox: Listbox<string, Span>, time: ReturnType<typeof clock> }>} The listbox and its clock
 */
function named(names) {
  const time = clock()
  const listbox = new Listbox({ now: time.now, rows: ROWS, source: new MemorySource(names, (item) => item) })
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

describe('typing a letter twice', () => {
  test('goes to an item starting with a letter typed twice when there is one, such as "Aaron"', async () => {
    expect(await typeEach(named(['Abe', 'Adam', 'Ann', 'Aaron']), ['a', 'a'], [])).toEqual([ONE, THREE])
  })

  test('goes on to the next item starting with a letter typed twice when none starts with it twice', async () => {
    expect(await typeEach(named(['Abe', 'Adam', 'Ann', 'Bob']), ['a', 'a'], [])).toEqual([ONE, TWO])
  })
})

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

/**
 * A listbox over ten billion numbered items whose source can place them, or not.
 * @param {boolean} places - Whether the source can place items
 * @returns {Listbox<Numbered, Range>} The listbox
 */
function tenBillionPlaced(places) {
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
    const listbox = tenBillionPlaced(true)
    selectFromFiveBillion(listbox)
    listbox.focus()
    await answered()
    expect(listbox.active.get()).toBe(FIVE_BILLION + ONE)
    const { end, start } = listbox.scroll.window()
    expect(start).toBeLessThanOrEqual(FIVE_BILLION + ONE)
    expect(end).toBeGreaterThan(FIVE_BILLION + ONE)
  })

  test('goes to the top item when the source cannot place items', async () => {
    const listbox = tenBillionPlaced(false)
    selectFromFiveBillion(listbox)
    listbox.focus()
    expect(listbox.active.get()).toBe(START)
    await answered()
    expect(listbox.active.get()).toBe(START)
  })

  test('goes to the top item at once when nothing is selected', () => {
    const listbox = tenBillionPlaced(true)
    listbox.scroll.scrollTo(TWO)
    listbox.focus()
    expect(listbox.active.get()).toBe(TWO)
  })

  test('drops an answer that comes after a key made an item active', async () => {
    const listbox = tenBillionPlaced(true)
    selectFromFiveBillion(listbox)
    listbox.focus()
    listbox.key('ArrowDown', PLAIN)
    await answered()
    expect(listbox.active.get()).toBe(ONE)
  })
})

describe('focus entering a listbox, besides the first selected item', () => {
  test('brings the active item back into view when it was scrolled away', () => {
    const listbox = tenBillionPlaced(true)
    listbox.goTo(THREE)
    listbox.scroll.scrollTo(FIVE_BILLION)
    listbox.focus()
    expect(listbox.scroll.top.get()).toBe(THREE)
  })

  test('makes the item last chosen active when nothing is, if the source cannot place items', () => {
    const listbox = tenBillionPlaced(false)
    listbox.choose.press(FOUR, PLAIN)
    listbox.active.set(undefined)
    listbox.focus()
    expect(listbox.active.get()).toBe(FOUR)
  })
})

/**
 * A listbox over labels with separators in them, which focus passes over, focused.
 * @param {readonly string[]} labels - The labels
 * @returns {Listbox<Labelled, Span>} The listbox
 */
function withSeparators(labels) {
  /** @type {readonly Labelled[]} */
  const items = labels.map((label, id) => ({ id, label }))
  const listbox = new Listbox({
    mode: 'none',
    rows: ROWS,
    skip: (item) => item.label === SEPARATOR,
    source: new MemorySource(items, (item) => item.id),
    text: (item) => (item.label === SEPARATOR ? '' : item.label),
  })
  listbox.focus()
  return listbox
}

/**
 * Presses keys in turn, noting where each left the active item.
 * @param {Listbox<Labelled, Span>} listbox - The listbox
 * @param {readonly string[]} keys - The keys
 * @returns {(number | undefined)[]} Where each left it
 */
function pressing(listbox, keys) {
  return keys.map((key) => {
    listbox.key(key, PLAIN)
    return listbox.active.get()
  })
}

describe('a listbox whose separators focus passes over', () => {
  test('enters past a separator at the top', () => {
    expect(withSeparators([SEPARATOR, 'Cut', 'Copy']).active.get()).toBe(ONE)
  })

  test('steps over separators with the arrows, Home and End', () => {
    const listbox = withSeparators(['Cut', SEPARATOR, 'Copy', 'Paste', SEPARATOR, 'Undo', SEPARATOR])
    const keys = ['ArrowDown', 'ArrowDown', 'ArrowDown', 'End', 'ArrowDown', 'Home', 'ArrowUp']
    expect(pressing(listbox, keys)).toEqual([TWO, THREE, FIVE, FIVE, FIVE, NONE, NONE])
  })

  test('selects nothing as focus moves, with no selection', () => {
    const listbox = withSeparators(['Cut', 'Copy', 'Paste'])
    pressing(listbox, ['ArrowDown', ' ', 'End'])
    expect([listbox.choose.isSelected(ONE), listbox.selection.get().filter, listbox.active.get()]).toEqual([
      false,
      undefined,
      TWO,
    ])
  })
})

describe('a listbox whose items change in place', () => {
  test('shows the new items, read again, with the active item where it was', () => {
    const source = new MemorySource(['apple', 'banana'], (item) => item)
    /** @type {Listbox<string, Span>} */
    const listbox = new Listbox({ source })
    listbox.goTo(ONE)
    source.replace(NONE, ['cherry', 'damson'])
    expect([listbox.items.item(NONE), listbox.items.item(ONE), listbox.active.get()]).toEqual(['cherry', 'damson', ONE])
  })
})
