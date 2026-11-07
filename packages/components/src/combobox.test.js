/**
 * @import { MemorySource } from '@interact/core'
 * @import { ComboboxModifiers } from './combobox.js'
 */

import { describe, expect, test } from 'bun:test'

import { controlled } from '@interact/core'

import { comboboxExtensions } from './combobox-extensions.js'
import { Combobox } from './combobox.js'
import { fruitSearch, fruitSelect, fruitSource, numberSelect } from './test-comboboxes.js'
import { TEN_BILLION } from './test-helpers.js'

const SETTLED = 0
const ONE = 1
const FIVE_BILLION = 5_000_000_000
const LAST = TEN_BILLION - ONE
const FIRST_FRUIT = 0
const LAST_FRUIT = 5
/** @type {ComboboxModifiers} */
const PLAIN = { alt: false, shift: false, toggle: false }
/** @type {ComboboxModifiers} */
const ALT = { alt: true, shift: false, toggle: false }

/**
 * Waits for what is found and landed at once to be shown.
 * @returns {Promise<void>} When it is
 */
async function settle() {
  await Bun.sleep(SETTLED)
}

/**
 * Presses keys in a combobox's field one after another, letting each settle.
 * @template T
 * @param {Combobox<T>} box - The combobox
 * @param {readonly string[]} keys - The keys
 * @param {ComboboxModifiers} [modifiers] - What is held
 * @returns {Promise<boolean[]>} Whether each was used
 */
async function press(box, keys, modifiers = PLAIN) {
  const [key, ...rest] = keys
  if (key === undefined) {
    return []
  }
  const used = box.key(key, modifiers)
  await settle()
  return [used, ...(await press(box, rest, modifiers))]
}

/**
 * Where each key opens a closed combobox's list: the active option once it opens, closing it again after.
 * @template T
 * @param {Combobox<T>} box - The combobox
 * @param {readonly string[]} keys - The keys
 * @returns {Promise<(number | undefined)[]>} Where each opened it
 */
async function openings(box, keys) {
  const [key, ...rest] = keys
  if (key === undefined) {
    return []
  }
  await press(box, [key])
  const landed = box.active
  box.close()
  return [landed, ...(await openings(box, rest))]
}

/**
 * The options showing, the active one in brackets.
 * @param {Combobox<string>} box - The combobox
 * @returns {string[]} The options
 */
function options(box) {
  return Array.from({ length: box.count }, (_unused, position) => {
    const text = box.option(position) ?? '?'
    return box.active === position ? `[${text}]` : text
  })
}

/**
 * What a combobox's state is: whether its list is open, and what is chosen.
 * @template T
 * @param {Combobox<T>} box - The combobox
 * @returns {readonly [boolean, T | undefined]} The state
 */
function state(box) {
  return [box.layer.open.get(), box.value]
}

describe('a select-only combobox', () => {
  test('opens on the fruit chosen with Down, moves with the arrows, and chooses with Enter', async () => {
    const box = fruitSelect('Banana')
    await press(box, ['ArrowDown'])
    const opened = options(box)
    await press(box, ['ArrowDown', 'Enter'])
    expect([opened, ...state(box)]).toEqual([
      ['Apple', 'Apricot', '[Banana]', 'Blueberry', 'Cherry', 'Date'],
      false,
      'Blueberry',
    ])
  })

  test('with nothing chosen, opens on the first with Enter, the first with Up and Home, the last with End', async () => {
    const landed = await openings(fruitSelect(), ['Enter', 'ArrowUp', 'Home', 'End'])
    expect(landed).toEqual([FIRST_FRUIT, FIRST_FRUIT, FIRST_FRUIT, LAST_FRUIT])
  })

  test('goes to the fruit what is typed starts, opening if it was closed, the whole of what was typed first', async () => {
    const box = fruitSelect()
    await press(box, ['a'])
    const first = options(box).find((text) => text.startsWith('['))
    await press(box, ['p', 'r'])
    expect([first, options(box).find((text) => text.startsWith('['))]).toEqual(['[Apple]', '[Apricot]'])
  })
})

describe('a select-only combobox closing', () => {
  test('closes on Escape keeping what was chosen, but chooses the active fruit when it is left', async () => {
    const box = fruitSelect('Apple')
    await press(box, ['ArrowDown', 'ArrowDown', 'Escape'])
    const escaped = state(box)
    await press(box, ['ArrowDown', 'ArrowDown'])
    box.layer.dismiss('focus-outside')
    expect([escaped, state(box)]).toEqual([
      [false, 'Apple'],
      [false, 'Apricot'],
    ])
  })

  test('opens without moving with Alt+Down, and chooses with Alt+Up', async () => {
    const box = fruitSelect()
    await press(box, ['ArrowDown'], ALT)
    const opened = [box.layer.open.get(), box.active]
    await press(box, ['ArrowDown', 'ArrowDown'])
    await press(box, ['ArrowUp'], ALT)
    expect([opened, state(box)]).toEqual([
      [true, undefined],
      [false, 'Apricot'],
    ])
  })

  test('asks the app for its choice when the app owns it, which decides', async () => {
    /** @type {(string | undefined)[]} */
    const asked = []
    const box = new Combobox({
      extensions: (core) => [
        comboboxExtensions()(core),
        controlled(core.chosen, (next) => {
          asked.push(next)
        }),
      ],
      kind: 'select-only',
      source: fruitSource(),
      value: 'Apple',
    })
    await press(box, ['ArrowDown', 'ArrowDown', 'Enter'])
    expect([asked, box.value]).toEqual([['Apricot'], 'Apple'])
  })
})

describe('a select-only combobox over ten billion options', () => {
  test('opens on the one chosen, and goes to the last with End', async () => {
    const box = numberSelect(FIVE_BILLION)
    await press(box, ['ArrowDown'])
    const opened = box.active
    await press(box, ['End', 'Enter'])
    expect([opened, box.value]).toEqual([FIVE_BILLION, { id: LAST }])
  })
})

describe('an editable combobox with list autocomplete', () => {
  test('suggests by what is typed, opening with nothing active, and Down and Enter choose', async () => {
    const box = fruitSearch('list')
    box.type('b')
    await settle()
    const typed = [box.layer.open.get(), options(box)]
    await press(box, ['ArrowDown', 'Enter'])
    expect([typed, state(box), box.text]).toEqual([[true, ['Banana', 'Blueberry']], [false, 'Banana'], 'Banana'])
  })
})

describe('an editable combobox with list autocomplete, closing and selecting', () => {
  test('closes when nothing matches or the field is emptied, and keeps the typed text when it is left', async () => {
    const box = fruitSearch('list')
    box.type('zz')
    await settle()
    const nothing = box.layer.open.get()
    box.type('ch')
    await settle()
    box.layer.dismiss('focus-outside')
    expect([nothing, state(box), box.text]).toEqual([false, [false, undefined], 'ch'])
  })

  test('with automatic selection makes the first active, and chooses it when it is left', async () => {
    const box = fruitSearch('list', 'automatic')
    box.type('b')
    await settle()
    const typed = options(box)
    box.layer.dismiss('outside')
    expect([typed, state(box), box.text]).toEqual([['[Banana]', 'Blueberry'], [false, 'Banana'], 'Banana'])
  })

  test('with the list open, gives Home, End and the side arrows back to the field, no option active', async () => {
    const box = fruitSearch('list', 'automatic')
    box.type('a')
    await settle()
    const used = await press(box, ['Home', 'End', 'ArrowLeft', 'ArrowRight'])
    expect([used, box.active, box.layer.open.get()]).toEqual([[false, false, false, false], undefined, true])
  })
})

describe('an editable combobox with list autocomplete, opening by key', () => {
  test('opens on every suggestion with Down, and on the last with Up', async () => {
    const box = fruitSearch('list')
    box.type('a')
    await settle()
    box.close()
    await press(box, ['ArrowUp'])
    expect(options(box)).toEqual(['Apple', '[Apricot]'])
  })

  test('closes with Escape, then empties the field with a second Escape', async () => {
    const box = fruitSearch('list')
    box.type('b')
    await settle()
    const used = await press(box, ['Escape', 'Escape', 'Escape'])
    expect([used, box.layer.open.get(), box.text]).toEqual([[true, true, false], false, ''])
  })

  test("shows only what's found for the text typed last, however late an earlier answer comes", async () => {
    /** @type {Map<string, PromiseWithResolvers<MemorySource<string>>>} */
    const asked = new Map()
    const box = new Combobox({
      autocomplete: 'list',
      extensions: comboboxExtensions(),
      kind: 'editable',
      suggest: async (text) => {
        /** @type {PromiseWithResolvers<MemorySource<string>>} */
        const answer = Promise.withResolvers()
        asked.set(text, answer)
        return answer.promise
      },
    })
    box.type('a')
    box.type('b')
    asked.get('b')?.resolve(fruitSource(['Banana']))
    asked.get('a')?.resolve(fruitSource(['Apple']))
    await settle()
    expect(options(box)).toEqual(['Banana'])
  })
})

describe('an editable combobox without autocomplete', () => {
  test('keeps its options whatever is typed, opens on the first with Down, and fills the field with the choice', async () => {
    const box = new Combobox({
      clearOnEscape: false,
      extensions: comboboxExtensions(),
      kind: 'editable',
      source: fruitSource(),
    })
    box.type('zz')
    await settle()
    const typed = box.layer.open.get()
    await press(box, ['ArrowDown', 'ArrowDown', 'Enter'])
    const chosen = [box.text, box.value]
    const kept = await press(box, ['Escape'])
    expect([typed, chosen, kept, box.text]).toEqual([false, ['Apricot', 'Apricot'], [false], 'Apricot'])
  })
})

describe('an editable combobox with inline autocomplete', () => {
  test('completes the field with the first fruit found, but not while deleting', async () => {
    const box = fruitSearch('both')
    box.type('bl')
    await settle()
    const completed = box.completion
    box.type('b', true)
    await settle()
    expect([completed, box.completion, options(box)]).toEqual(['blueberry', undefined, ['[Banana]', 'Blueberry']])
  })

  test('keeps the completion as typed text when the cursor moves into it, and chooses it with Enter', async () => {
    const box = fruitSearch('both')
    box.type('ch')
    await settle()
    await press(box, ['ArrowRight'])
    const kept = [box.text, box.active, box.value]
    box.type('che')
    await settle()
    await press(box, ['Enter'])
    expect([kept, box.text, box.value]).toEqual([['cherry', undefined, undefined], 'Cherry', 'Cherry'])
  })
})
