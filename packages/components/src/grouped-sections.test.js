/**
 * @import { ListPipeline } from '@interact/core/list-pipeline'
 * @import { ItemSource } from '@interact/core/source'
 * @import { TemplateResult } from '@interact/dom/template'
 */

import { describe, expect, test } from 'bun:test'

import { MemorySource, Store, listPipeline } from '@interact/core'
import { defaultRendering } from '@interact/dom'

import { active, readNow } from './active-item.js'
import { groupStarts, groupedSections } from './grouped-sections.js'
import { listbox } from './listbox.js'
import { navigation } from './navigation.js'
import { press } from './test-helpers.js'
import { typeahead } from './typeahead.js'
import { windowing } from './windowing.js'

/**
 * An item of the list: a food in its group, or a group's heading.
 * @typedef {Readonly<{ text: string, group: string, heading: boolean }>} Food
 */

/**
 * A food in a group.
 * @param {string} group - Its group
 * @param {string} text - What it is called
 * @returns {Food} The food
 */
function food(group, text) {
  return { group, heading: false, text }
}

const FOODS = [
  food('Fruit', 'Apple'),
  food('Fruit', 'Banana'),
  food('Fruit', 'Cherry'),
  food('Vegetable', 'Carrot'),
  food('Vegetable', 'Leek'),
  food('Grain', 'Rice'),
]
const LISTED = ['# Fruit', 'Apple', 'Banana', 'Cherry', '# Vegetable', 'Carrot', 'Leek', '# Grain', 'Rice']

/**
 * A source of foods answering `groupStarts` itself, and reading nothing to answer it.
 * @param {MemorySource<Food>} foods - The foods
 * @returns {ItemSource<Food>} The source
 */
function answering(foods) {
  return {
    ask: (question) => {
      if (groupStarts.input(question) === undefined) {
        return undefined
      }
      const all = foods.read(0, foods.count())
      return groupStarts.answer(
        all.flatMap((each, at) => (all[at - 1]?.group === each.group ? [] : [{ group: each.group, start: at }])),
      )
    },
    count: () => foods.count(),
    key: (item) => foods.key(item),
    read: (start, end) => foods.read(start, end),
    subscribe: (listener) => foods.subscribe(listener),
  }
}

/**
 * A listbox of foods in sections, with navigation and typeahead, windowed or not.
 * @param {Readonly<{ rows?: number | undefined, answers?: boolean, foods?: readonly Food[] }>} [how] - How many rows
 *   a window shows, if windowed; whether the source says where groups start itself; the foods
 * @returns {Readonly<{
 *   store: Store,
 *   foods: MemorySource<Food>,
 *   list: ListPipeline<Food, TemplateResult, ItemSource<Food>>,
 *   current: ReturnType<typeof active<Food, TemplateResult, ItemSource<Food>>>,
 *   windowed: ReturnType<typeof windowing<Food, TemplateResult, ItemSource<Food>>> | undefined,
 * }>} The listbox and its parts
 */
function sections(how = {}) {
  const foods = new MemorySource(
    how.foods ?? FOODS,
    (item) => item.text,
    (item) => item.text,
  )
  /** @type {ListPipeline<Food, TemplateResult, ItemSource<Food>>} */
  const list = listPipeline(how.answers === true ? answering(foods) : foods)
  const current = active(list)
  const windowed = how.rows === undefined ? undefined : windowing(list, { rows: how.rows })
  const grouping = groupedSections(current, {
    heading: (group) => ({ group, heading: true, text: group }),
    ...(how.answers === true ? {} : { groupOf: (item) => item.group }),
  })
  const store = new Store([
    listbox(current, { id: 'x' }),
    navigation(current),
    typeahead(current, { now: () => 0 }),
    grouping,
    windowed ?? [],
    list.text.of((item) => item.text),
    defaultRendering(list),
  ])
  return { current, foods, list, store, windowed }
}

/**
 * The list's entries as text, headings marked.
 * @param {ReturnType<typeof sections>} made - The listbox
 * @returns {string[]} The entries
 */
function listed({ list, store }) {
  const shown = list.listOf(store.state)
  const all = shown.read(0, shown.count())
  return all instanceof Promise ? [] : all.map((each) => (each.heading ? `# ${each.text}` : each.text))
}

/**
 * What the active item is.
 * @param {ReturnType<typeof sections>} made - The listbox
 * @returns {string | undefined} Its text
 */
function activeText({ current, list, store }) {
  const at = current.positionIn(store.state)
  return at === undefined ? undefined : readNow(list.listOf(store.state), at)?.item.text
}

/**
 * The attributes the row at a position has.
 * @param {ReturnType<typeof sections>} made - The listbox
 * @param {number} position - Where it is
 * @returns {Readonly<Record<string, string | number | boolean | undefined>>} Its attributes
 */
function attributesAt({ list, store }, position) {
  const shown = list.listOf(store.state)
  const item = readNow(shown, position)?.item
  return list.attributesOf(
    { item, key: item === undefined ? '' : shown.key(item), kind: 'item', position },
    store.state,
  )
}

describe.each([
  ['not windowed', undefined],
  ['windowed', 4],
])('grouped sections, %s', (_how, rows) => {
  test("put each group's heading before its items", () => {
    const made = sections({ rows })
    expect(listed(made)).toEqual(LISTED)
    const shown = made.list.listOf(made.store.state)
    expect(shown.positionOf?.('Carrot')).toBe(LISTED.indexOf('Carrot'))
    expect(shown.positionOf?.(shown.key({ group: 'Grain', heading: true, text: 'Grain' }))).toBeUndefined()
  })

  test('are passed over by the arrows, Home and End, which land on items', () => {
    const made = sections({ rows })
    press(made.store, 'Home')
    expect(activeText(made)).toBe('Apple')
    press(made.store, 'ArrowDown')
    press(made.store, 'ArrowDown')
    press(made.store, 'ArrowDown')
    expect(activeText(made)).toBe('Carrot')
    press(made.store, 'ArrowUp')
    expect(activeText(made)).toBe('Cherry')
    press(made.store, 'End')
    expect(activeText(made)).toBe('Rice')
  })

  test('are found by typing only through their items', () => {
    const made = sections({ rows })
    press(made.store, 'l')
    expect(activeText(made)).toBe('Leek')
    press(made.store, 'g')
    expect(activeText(made)).toBe('Leek')
  })

  test('do nothing when pressed', () => {
    const made = sections({ rows })
    const pressed = { count: 1, shift: false, toggle: false }
    made.store.handle(made.list.press.of({ ...pressed, position: LISTED.indexOf('# Vegetable') }))
    expect(made.current.positionIn(made.store.state)).toBeUndefined()
    made.store.handle(made.list.press.of({ ...pressed, position: LISTED.indexOf('Leek') }))
    expect(activeText(made)).toBe('Leek')
  })

  test('are presentation, and options are numbered among options alone, the active one described by its heading', () => {
    const made = sections({ rows })
    const heading = attributesAt(made, LISTED.indexOf('# Vegetable'))
    expect([heading['role'], heading['part'], heading['aria-posinset']]).toEqual([
      'presentation',
      'heading option row',
      false,
    ])
    made.store.dispatch({ effects: made.current.go(LISTED.indexOf('Carrot')) })
    const carrot = attributesAt(made, LISTED.indexOf('Carrot'))
    const rice = attributesAt(made, LISTED.indexOf('Rice'))
    expect([carrot['aria-posinset'], carrot['aria-setsize'], carrot['aria-describedby']]).toEqual([4, 6, 'x-4'])
    expect([rice['aria-posinset'], rice['aria-describedby']]).toEqual([6, undefined])
  })

  test("keep the active item, and its group's heading rendered, as items come and go", () => {
    const made = sections({ rows })
    made.store.dispatch({ effects: made.current.go(LISTED.indexOf('Leek')) })
    made.foods.insert(1, [food('Fruit', 'Apricot')])
    made.foods.remove(0, 1)
    made.foods.insert(made.foods.count(), [food('Grain', 'Oats'), food('Nut', 'Pecan')])
    expect(listed(made)).toEqual([
      '# Fruit',
      'Apricot',
      'Banana',
      'Cherry',
      '# Vegetable',
      'Carrot',
      'Leek',
      '# Grain',
      'Rice',
      'Oats',
      '# Nut',
      'Pecan',
    ])
    expect(activeText(made)).toBe('Leek')
  })
})

describe('grouped sections, windowed', () => {
  test("keep the active item's heading rendered when the window has scrolled past it", () => {
    const many = ['Fruit', 'Vegetable', 'Grain'].flatMap((group) =>
      Array.from({ length: 20 }, (_skip, at) => food(group, `${group} ${String(at)}`)),
    )
    const made = sections({ foods: many, rows: 4 })
    const last = many.findLastIndex((each) => each.group === 'Vegetable') + 2
    made.store.dispatch({ effects: made.current.go(last) })
    if (made.windowed !== undefined) {
      made.store.dispatch({ effects: made.windowed.scrollTo.of(last - 3) })
    }
    const rendered = made.list.rowsIn(made.store.state)
    const positions = new Set(
      Array.from({ length: rendered.length }, (_skip, at) => rendered.at(at)).flatMap((row) =>
        row?.kind === 'item' ? [row.position] : [],
      ),
    )
    const heading = many.findIndex((each) => each.group === 'Vegetable') + 1
    expect([activeText(made), positions.has(heading), positions.has(heading + 1)]).toEqual([
      'Vegetable 19',
      true,
      false,
    ])
    expect(attributesAt(made, last)['aria-describedby']).toBe(`x-${String(heading)}`)
  })
})

describe('grouped sections', () => {
  test('follow every kind of change their source makes, a group ending or starting with it', () => {
    const made = sections()
    made.store.dispatch({ effects: made.current.go(LISTED.indexOf('Rice')) })
    made.foods.remove(2, 4)
    expect(listed(made)).toEqual(['# Fruit', 'Apple', 'Banana', '# Vegetable', 'Leek', '# Grain', 'Rice'])
    made.foods.insert(2, [food('Vegetable', 'Bean')])
    expect(listed(made)).toEqual(['# Fruit', 'Apple', 'Banana', '# Vegetable', 'Bean', 'Leek', '# Grain', 'Rice'])
    made.foods.insert(2, [food('Fruit', 'Date')])
    expect(listed(made)).toEqual([
      '# Fruit',
      'Apple',
      'Banana',
      'Date',
      '# Vegetable',
      'Bean',
      'Leek',
      '# Grain',
      'Rice',
    ])
    made.foods.replace(3, [food('Fruit', 'Fig')])
    made.foods.remove(3, 5)
    expect(listed(made)).toEqual(['# Fruit', 'Apple', 'Banana', 'Date', '# Grain', 'Rice'])
    expect(activeText(made)).toBe('Rice')
  })

  test('ask a source that knows where its groups start, and read nothing to place them', () => {
    const made = sections({ answers: true, rows: 4 })
    expect(listed(made)).toEqual(LISTED)
    press(made.store, 'End')
    expect(activeText(made)).toBe('Rice')
  })

  test('need a group to keep together', () => {
    const foods = new MemorySource([...FOODS, food('Fruit', 'Lime')], (item) => item.text)
    /** @type {ListPipeline<Food, TemplateResult, MemorySource<Food>>} */
    const list = listPipeline(foods)
    const grouping = groupedSections(active(list), {
      groupOf: (item) => item.group,
      heading: (group) => ({ group, heading: true, text: group }),
    })
    expect(() => new Store([grouping, defaultRendering(list)])).toThrow('comes again')
  })
})
