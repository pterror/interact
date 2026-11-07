/**
 * @import { ListPipeline } from '@interact/core/list-pipeline'
 * @import { TemplateResult } from '@interact/dom/template'
 */

import { describe, expect, test } from 'bun:test'

import { MemorySource, Store, listPipeline } from '@interact/core'
import { defaultRendering, renderToString } from '@interact/dom'

import { active } from './active-item.js'
import { listbox } from './listbox.js'
import { loadAsYouScroll } from './load-as-you-scroll.js'
import { navigation } from './navigation.js'
import { press } from './test-helpers.js'
import { windowing } from './windowing.js'

const ROWS = 5
const PAGE = 20
const AHEAD = 2

/**
 * A page of numbered items.
 * @param {number} start - The first one's number
 * @returns {string[]} The items
 */
function page(start) {
  return Array.from({ length: PAGE }, (_skip, offset) => `item ${String(start + offset)}`)
}

/**
 * How the app answers a load in a test: it adds a page and says there is more, or answers as it is told.
 * @typedef {(source: MemorySource<string>) => Promise<boolean>} Loader
 */

/**
 * Adds a page to the end of a source and says there may be more.
 * @param {MemorySource<string>} source - The source
 * @returns {Promise<boolean>} That there may be more
 */
async function addPage(source) {
  await Promise.resolve()
  source.insert(source.count(), page(source.count()))
  return true
}

/**
 * A windowed listbox that loads as it scrolls, starting with `first` items.
 * @param {Readonly<{ first?: number, load?: Loader, windowed?: boolean }>} [how] - How many items it starts with (one
 *   page by default), how the app loads, and whether it is windowed (by default it is)
 * @returns {Readonly<{
 *   store: Store,
 *   source: MemorySource<string>,
 *   list: ListPipeline<string, TemplateResult, MemorySource<string>>,
 *   current: ReturnType<typeof active<string, TemplateResult, MemorySource<string>>>,
 *   loading: ReturnType<typeof loadAsYouScroll<string, MemorySource<string>>>,
 *   windowed: ReturnType<typeof windowing<string, TemplateResult, MemorySource<string>>>,
 *   loads: () => number,
 * }>} The listbox and its parts
 */
function loaded(how = {}) {
  const source = new MemorySource(page(0).slice(0, how.first ?? PAGE), (item) => item)
  /** @type {ListPipeline<string, TemplateResult, MemorySource<string>>} */
  const list = listPipeline(source)
  const current = active(list)
  let loads = 0
  const loading = loadAsYouScroll(list, {
    ahead: AHEAD,
    load: async () => {
      loads += 1
      return (how.load ?? addPage)(source)
    },
  })
  const windowed = windowing(list, { rows: ROWS })
  const store = new Store([
    listbox(current, { id: 'x' }),
    navigation(current),
    loading,
    how.windowed === false ? [] : windowed,
    defaultRendering(list),
  ])
  return { current, list, loading, loads: () => loads, source, store, windowed }
}

/**
 * Lets loads that answer after a moment answer.
 * @returns {Promise<void>} When they have
 */
async function answered() {
  await Bun.sleep(0)
}

/**
 * What the status says now.
 * @param {ReturnType<typeof loaded>} made - The listbox
 * @returns {string} Its text
 */
function status({ list, store }) {
  const markup = renderToString(list.render(store.state))
  return /<div role="status" part="status">(?:<!--[^>]*-->)*(?<said>[^<]*)/u.exec(markup)?.groups?.['said'] ?? 'none'
}

describe('loading as the person scrolls a windowed list', () => {
  test('asks for more only once the row a little before the end shows, and only once at a time', async () => {
    const made = loaded()
    await answered()
    made.store.dispatch({ effects: made.windowed.scrollTo.of(PAGE - ROWS - AHEAD - 1) })
    expect([made.loads(), made.loading.statusIn(made.store.state)]).toEqual([0, 'idle'])
    made.store.dispatch({ effects: made.windowed.scrollTo.of(PAGE - ROWS - AHEAD) })
    made.loading.request(made.store)
    expect([made.loads(), made.loading.statusIn(made.store.state), status(made)]).toEqual([
      1,
      'loading',
      'Loading more…',
    ])
    await answered()
    expect([made.source.count(), made.loading.statusIn(made.store.state), status(made)]).toEqual([
      PAGE + PAGE,
      'idle',
      '',
    ])
  })

  test('keeps the active item and where the list is scrolled as more arrive, and the arrows go on into them', async () => {
    const made = loaded()
    press(made.store, 'End')
    const last = PAGE - 1
    expect([made.current.positionIn(made.store.state), made.loads()]).toEqual([last, 1])
    await answered()
    const { top } = made.windowed.placementIn(made.store.state)
    expect([made.current.positionIn(made.store.state), top, made.source.count()]).toEqual([
      last,
      PAGE - ROWS,
      PAGE + PAGE,
    ])
    press(made.store, 'ArrowDown')
    expect(made.current.positionIn(made.store.state)).toBe(PAGE)
  })

  test('loads an empty list at once, and stops when the app says there is no more', async () => {
    const made = loaded({
      first: 0,
      load: async (source) => {
        await addPage(source)
        return false
      },
    })
    await answered()
    await answered()
    made.store.dispatch({ effects: made.windowed.scrollTo.of(PAGE) })
    expect([made.loads(), made.source.count(), made.loading.statusIn(made.store.state)]).toEqual([1, PAGE, 'done'])
  })

  test('takes a load that brought nothing as the end, whatever it said', async () => {
    const made = loaded({
      load: async () => {
        await Promise.resolve()
        return true
      },
    })
    press(made.store, 'End')
    await answered()
    expect([made.loads(), made.loading.statusIn(made.store.state)]).toEqual([1, 'done'])
  })

  test('says a load failed, and loads again only once the app resumes', async () => {
    let fail = true
    const made = loaded({
      load: async (source) => {
        if (fail) {
          throw new Error('offline')
        }
        return addPage(source)
      },
    })
    press(made.store, 'End')
    await answered()
    expect([made.loading.statusIn(made.store.state), status(made)]).toEqual(['failed', 'Could not load more'])
    press(made.store, 'ArrowUp')
    expect(made.loads()).toBe(1)
    fail = false
    made.store.dispatch({ effects: made.loading.resume.of(undefined) })
    await answered()
    expect([made.loads(), made.source.count(), made.loading.statusIn(made.store.state)]).toEqual([
      2,
      PAGE + PAGE,
      'idle',
    ])
  })

  test('starts over with a new source, dropping the answer to a load for the old one', async () => {
    /** @type {PromiseWithResolvers<boolean>} */
    const late = Promise.withResolvers()
    const made = loaded({ load: async () => late.promise })
    press(made.store, 'End')
    const longer = Array.from({ length: PAGE * PAGE }, (_skip, at) => `other ${String(at)}`)
    made.store.dispatch({ effects: made.list.setSource.of(new MemorySource(longer, (item) => item)) })
    late.resolve(false)
    await answered()
    expect([made.loads(), made.loading.statusIn(made.store.state)]).toEqual([1, 'idle'])
  })
})

describe('loading as the person scrolls a list rendered whole', () => {
  test('leaves knowing when the end shows to the page, but loads an empty list at once', async () => {
    const made = loaded({ windowed: false })
    press(made.store, 'End')
    await answered()
    expect(made.loads()).toBe(0)
    const empty = loaded({ first: 0, windowed: false })
    await answered()
    expect(empty.loads()).toBe(1)
  })
})
