import { describe, expect, test } from 'bun:test'

import { reader } from './reader.js'
import { counted, testGrammar, testLook } from './test-look.js'

/**
 * A reader over the test look
 * @param {readonly import('./reader.js').Overlay[]} [overlays] - Its overlays
 * @returns {Readonly<{
 *   shown: import('./reader.js').Reader,
 *   total: () => Readonly<{ drawn: number, dropped: number }>,
 * }>} The reader, and how many pieces it drew and dropped
 */
function made(overlays = []) {
  const { counts, total } = counted()
  return { shown: reader({ grammar: testGrammar, look: testLook(counts), overlays, textClass: 'text' }), total }
}

/**
 * An overlay that answers with the ranges it is given
 * @param {() => import('./later.js').Later<readonly import('./reader.js').Range[]>} answer - Its answer to each question
 * @returns {import('./reader.js').Overlay & { change: () => void }} The overlay, and saying it changed
 */
function overlayOf(answer) {
  /** @type {Set<() => void>} */
  const listeners = new Set()
  return {
    change() {
      for (const listener of listeners) {
        listener()
      }
    },
    ranges: () => answer(),
    watch(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

describe('reader', () => {
  test('draws elements from the tree and leaves the marks out', () => {
    const { shown } = made()
    shown.show('a *b* **c**\n\n# Title\n\n> one\n> two')
    expect(shown.element.className).toBe('text')
    expect(shown.element.innerHTML).toBe(
      '<p>a <em>b</em> <strong>c</strong></p><h1>Title</h1><blockquote><p>one\ntwo</p></blockquote>',
    )
  })

  test('keeps a single line break, as written', () => {
    const { shown } = made()
    shown.show('one\ntwo')
    expect(shown.element.innerHTML).toBe('<p>one\ntwo</p>')
  })

  test('gives the source position of a place in what it drew', () => {
    const { shown } = made()
    shown.show('a *bc* d')
    const em = shown.element.querySelector('em')
    const inside = em?.firstChild
    expect(inside?.textContent).toBe('bc')
    expect(inside === null || inside === undefined ? undefined : shown.positionAt(inside, 1)).toBe(4)
    expect(em === null ? undefined : shown.positionAt(em, 1)).toBe(5)
    expect(shown.positionAt(shown.element, 0)).toBe(0)
  })

  test('redraws from the first part that changed, keeping the parts before it', () => {
    const { shown } = made()
    shown.show('first\n\nsecond')
    const [first, second] = shown.element.querySelectorAll('p')
    shown.show('first\n\nsecond and more')
    const [firstAfter, secondAfter] = shown.element.querySelectorAll('p')
    expect(firstAfter).toBe(first)
    expect(secondAfter).not.toBe(second)
    expect(secondAfter?.textContent).toBe('second and more')
  })

  test('draws a replaced piece for its source, and drops it when it is no longer drawn', () => {
    const { shown, total } = made()
    shown.show('see `code` here')
    expect(shown.element.innerHTML).toBe('<p>see <span data-piece="CODE">CODE</span> here</p>')
    const piece = shown.element.querySelector('span')
    expect(piece === null ? undefined : shown.positionAt(piece, 0)).toBe(4)
    shown.show('see nothing')
    expect(total()).toEqual({ drawn: 1, dropped: 1 })
  })

  test('draws an overlay inside the elements it crosses', () => {
    const { shown } = made([overlayOf(() => [{ class: 'match', from: 1, to: 5 }])])
    shown.show('ab *cd* e')
    expect(shown.element.innerHTML).toBe(
      '<p>a<span class="match">b </span><em><span class="match">c</span>d</em> e</p>',
    )
  })

  test('asks an overlay with the source and tree of the text it is drawn on', () => {
    /** @type {import('./reader.js').Overlay} */
    const emphasis = {
      ranges(_from, _to, { read, tree }) {
        /** @type {import('./reader.js').Range[]} */
        const found = []
        tree.iterate({
          enter(node) {
            if (node.name === 'Emphasis') {
              found.push({ class: read(node.from + 1, node.to - 1), from: node.from, to: node.to })
            }
          },
        })
        return found
      },
      watch: () => () => undefined,
    }
    const { shown } = made([emphasis])
    shown.show('a *hot* b')
    expect(shown.element.innerHTML).toBe('<p>a <em><span class="hot">hot</span></em> b</p>')
  })

  test('draws only the answer to the latest question', async () => {
    /** @type {((ranges: readonly import('./reader.js').Range[]) => void)[]} */
    const answers = []
    const overlay = overlayOf(() => {
      /** @type {PromiseWithResolvers<readonly import('./reader.js').Range[]>} */
      const answer = Promise.withResolvers()
      answers.push(answer.resolve)
      return answer.promise
    })
    const { shown } = made([overlay])
    shown.show('abc')
    overlay.change()
    answers[1]?.([{ class: 'new', from: 0, to: 1 }])
    answers[0]?.([{ class: 'old', from: 1, to: 2 }])
    await Promise.resolve()
    await Promise.resolve()
    expect(shown.element.innerHTML).toBe('<p><span class="new">a</span>bc</p>')
  })

  test('stopping takes everything out and drops the pieces', () => {
    const { shown, total } = made()
    shown.show('`a` and `b`')
    shown.stop()
    expect(shown.element.innerHTML).toBe('')
    expect(total().dropped).toBe(2)
  })
})
