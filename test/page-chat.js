/**
 * A chat: messages counted from the bottom, the newest (rank 0) lowest, windowed in a scroller that starts at the
 * bottom, with what is on screen kept in place and the view kept at the bottom while it is there. Wired by hand from
 * `@pterror/interact-list`, for the browser tests of `stickToBottom`.
 */

import {
  arrayCount,
  arrayKeysAt,
  arrayList,
  arrayLocate,
  cell,
  flowMount,
  keepInPlace,
  place,
  render,
  rows,
  sizer,
  stickToBottom,
  topIn,
  viewFrom,
  viewport,
  visibleRanks,
  windowing,
} from '@pterror/interact-list'

const ROW_HEIGHT = 24
const VIEW_HEIGHT = 240
const FIRST = 50

/**
 * What the chat shows now
 * @typedef {Readonly<{ atBottom: boolean, fromBottom: number, lowest: string | undefined }>} ChatSeen
 */

/** @type {Readonly<{ scroller: HTMLElement, list: ReturnType<typeof arrayList<string>> }> | undefined} */
let chat = undefined
let said = FIRST

/**
 * A message
 * @param {string} key - Its key
 * @returns {Element} Its element
 */
function create(key) {
  const message = document.createElement('div')
  message.dataset['message'] = key
  message.textContent = key
  return message
}

/**
 * Puts a chat of fifty messages, scrolled to its bottom
 * @returns {void}
 */
function putChat() {
  document.body.style.margin = '0'
  const scroller = document.createElement('div')
  scroller.style.cssText = `height: ${String(VIEW_HEIGHT)}px; overflow: auto`
  const box = document.createElement('div')
  box.style.position = 'relative'
  scroller.append(box)
  document.body.append(scroller)
  const list = arrayList(Array.from({ length: FIRST }, (_, index) => `m${String(FIRST - 1 - index)}`))
  const layout = rows(ROW_HEIGHT)
  const count = arrayCount(list)
  const view = viewFrom({ edge: 'bottom', top: topIn(box, scroller, 'bottom'), visible: viewport(scroller) })
  /** @type {typeof cell<readonly string[]>} */
  const keysCell = cell
  const kept = keysCell([])
  const drawn = windowing({
    keep: kept,
    keysAt: arrayKeysAt(list),
    locate: async (key) => arrayLocate(list.keys)(key),
    ranks: visibleRanks({ count, layout, visible: view }),
  })
  sizer({ count, element: box, layout })
  render({ create, drawn, facets: [place({ edge: 'bottom', layout, rank: drawn })], mount: flowMount(box) })
  scroller.scrollTop = scroller.scrollHeight
  keepInPlace({
    drawn,
    hold: (key) => {
      kept.set(key === undefined ? [] : [key])
    },
    layout,
    prefer: () => undefined,
    scrollBy: view.scrollBy,
    visible: view,
  })
  stickToBottom({ drawn, element: scroller, layout, scrollBy: view.scrollBy, visible: view })
  chat = { list, scroller }
}

/**
 * A new message, the newest
 * @returns {void}
 */
function say() {
  if (chat !== undefined) {
    chat.list.set([`m${String(said)}`, ...chat.list.keys()])
    said += 1
  }
}

/**
 * Scrolls the chat up
 * @param {number} px - How far
 * @returns {void}
 */
function scrollUp(px) {
  if (chat !== undefined) {
    chat.scroller.scrollTop -= px
  }
}

/**
 * What the chat shows now
 * @returns {ChatSeen} What shows
 */
function seenChat() {
  if (chat === undefined) {
    throw new Error('putChat first')
  }
  const { scroller } = chat
  const fromBottom = scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop
  const bottom = scroller.getBoundingClientRect().bottom
  const lowest = [...scroller.querySelectorAll('[data-message]')]
    .filter((element) => element instanceof HTMLElement)
    .find((element) => Math.abs(element.getBoundingClientRect().bottom - bottom) < 1)
  return { atBottom: fromBottom < 1, fromBottom: Math.round(fromBottom), lowest: lowest?.dataset['message'] }
}

export { putChat, say, scrollUp, seenChat }
