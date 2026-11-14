/**
 * A strip of tabs dragged into a new order, as a browser's tab strip is: the dragged tab follows the pointer, the tabs
 * it passes move aside, its place is taken by its leading edge, and a dropped tab slides into its place. The strip
 * scrolls across, and its reorder can answer at once, late, or refuse. Wired by hand from `@pterror/interact-list`,
 * for the browser tests.
 */

import {
  arrayList,
  arrayRank,
  arrayReorder,
  cell,
  drag,
  flowMount,
  follow,
  leadingGaps,
  makeRoom,
  mark,
  render,
} from '@pterror/interact-list'

/** How long, in ms, a dropped tab slides into its place */
const SETTLE_MS = 400
/** How long, in ms, tabs slide aside */
const ROOM_MS = 250
/** How long, in ms, a late or refused reorder takes to answer */
const LATE_MS = 300
const TAB_WIDTH = 100
const TAB_GAP = 10
const STRIP_WIDTH = 300

/**
 * What the strip shows now
 * @typedef {Readonly<{ order: readonly string[], dragging: readonly string[], settling: readonly string[],
 *   tabs: readonly Readonly<{ key: string, left: number, shift: number, sliding: boolean }>[] }>} TabsSeen
 */

/** @type {Readonly<{ strip: HTMLElement, list: ReturnType<typeof arrayList<string>> }> | undefined} */
let tabs = undefined

/**
 * A tab
 * @param {string} key - The key
 * @returns {Element} The tab
 */
function create(key) {
  const tab = document.createElement('div')
  tab.setAttribute('role', 'tab')
  tab.dataset['tab'] = key
  tab.textContent = key
  tab.style.inlineSize = `${String(TAB_WIDTH)}px`
  tab.style.flex = 'none'
  tab.style.userSelect = 'none'
  tab.style.touchAction = 'none'
  return tab
}

/**
 * Puts a strip of four tabs, a to d, at the page's top left
 * @param {'now' | 'late' | 'refused'} [answers] - How its reorder answers (left out: at once)
 * @returns {void}
 */
function putTabs(answers = 'now') {
  document.body.style.margin = '0'
  const strip = document.createElement('div')
  strip.setAttribute('role', 'tablist')
  strip.style.display = 'flex'
  strip.style.columnGap = `${String(TAB_GAP)}px`
  strip.style.inlineSize = `${String(STRIP_WIDTH)}px`
  strip.style.overflowX = 'auto'
  document.body.append(strip)
  const list = arrayList(['a', 'b', 'c', 'd'])
  /** @type {typeof cell<string | undefined>} */
  const keyCell = cell
  const dragged = keyCell(undefined)
  const followed = follow({ axis: 'x', duration: SETTLE_MS })
  const room = makeRoom({ axis: 'x', duration: ROOM_MS, rank: arrayRank(list).rank })
  const rendered = render({
    create,
    drawn: list,
    facets: [followed, room, mark({ attribute: 'data-dragging', on: '', test: dragged })],
    mount: flowMount(strip),
  })
  const now = arrayReorder(list)
  /**
   * Moves a tab, as the strip's reorder answers
   * @param {string} key - The tab
   * @param {string} target - Next to which
   * @param {boolean} after - After it
   * @returns {Promise<boolean> | undefined} Whether it will, when it isn't at once
   */
  const reorder = (key, target, after) => {
    if (answers === 'now') {
      now(key, target, after)
      return undefined
    }
    /** @type {PromiseWithResolvers<boolean>} */
    const answered = Promise.withResolvers()
    setTimeout(() => {
      if (answers === 'late') {
        now(key, target, after)
      }
      answered.resolve(answers === 'late')
    }, LATE_MS)
    return answered.promise
  }
  drag({
    drawn: list,
    element: strip,
    held: list.hold(undefined, 'none'),
    gap: leadingGaps({ axis: 'x', element: strip, itemOf: rendered.itemOf }),
    itemOf: rendered.itemOf,
    reorder,
    showing: (at, motion) => {
      dragged.set(motion.phase === 'moving' ? motion.key : undefined)
      followed.show(at, motion)
      room.show(at, motion)
    },
  })
  tabs = { list, strip }
}

/**
 * What the strip shows now
 * @returns {TabsSeen} What shows
 */
function seenTabs() {
  if (tabs === undefined) {
    throw new Error('putTabs first')
  }
  const elements = [...tabs.strip.querySelectorAll('[data-tab]')].filter((element) => element instanceof HTMLElement)
  return {
    settling: elements
      .filter((element) => 'settling' in element.dataset)
      .map((element) => element.dataset['tab'] ?? ''),
    dragging: elements
      .filter((element) => 'dragging' in element.dataset)
      .map((element) => element.dataset['tab'] ?? ''),
    order: tabs.list.keys(),
    tabs: elements.map((element) => ({
      key: element.dataset['tab'] ?? '',
      left: Math.round(element.getBoundingClientRect().left),
      sliding: element
        .getAnimations()
        .some((/** @type {Readonly<Animation>} */ animation) => animation.playState === 'running'),
      shift: Math.round(Number(element.style.translate.split(' ')[0]?.replace(/px$/u, '')) || 0),
    })),
  }
}

/**
 * Puts other tabs in the strip
 * @param {readonly string[]} keys - The tabs, in order
 * @returns {void}
 */
function setTabs(keys) {
  tabs?.list.set(keys)
}

/**
 * Scrolls the strip across
 * @param {number} px - How far from its start
 * @returns {void}
 */
function scrollTabs(px) {
  if (tabs !== undefined) {
    tabs.strip.scrollLeft = px
  }
}

export { LATE_MS, ROOM_MS, SETTLE_MS, putTabs, scrollTabs, seenTabs, setTabs }
