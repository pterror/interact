import { describe, expect, test } from 'bun:test'

import { EditorView } from '@codemirror/view'

import { segmentGaps } from './segment-gaps.js'
import { segments } from './segments.js'

/**
 * An editor over segments, and where each line is drawn
 * @param {readonly Readonly<{ key: string, text: string }>[]} initial - The segments
 * @returns {{ view: EditorView, s: ReturnType<typeof segments>, line: (n: number) => { top: number, bottom: number } }}
 *   The editor, and the viewport's top and bottom of a line (from 1)
 */
function over(initial) {
  const s = segments({ initial })
  const view = new EditorView({ doc: s.doc, extensions: [s.extension], parent: document.createElement('div') })
  const line = (/** @type {number} */ n) => {
    const block = view.lineBlockAt(view.state.doc.line(n).from)
    return { bottom: view.documentTop + block.bottom, top: view.documentTop + block.top }
  }
  return { line, s, view }
}

describe('segmentGaps', () => {
  test('before or after the segment at the point, by which half of it the point is in', () => {
    const e = over([
      { key: 'a', text: 'one' },
      { key: 'b', text: 'two\nlines' },
      { key: 'c', text: 'three' },
    ])
    const gap = segmentGaps({ of: e.s.of, view: e.view })
    expect(gap({ x: 0, y: e.line(1).top + 1 })).toEqual({ after: false, target: 'a' })
    expect(gap({ x: 0, y: e.line(1).bottom - 1 })).toEqual({ after: true, target: 'a' })
    expect(gap({ x: 0, y: e.line(2).top + 1 })).toEqual({ after: false, target: 'b' })
    expect(gap({ x: 0, y: e.line(3).bottom - 1 })).toEqual({ after: true, target: 'b' })
    expect(gap({ x: 0, y: e.line(4).top + 1 })).toEqual({ after: false, target: 'c' })
    e.view.destroy()
  })

  test('above the first segment is before it, below the last after it', () => {
    const e = over([
      { key: 'a', text: 'one' },
      { key: 'b', text: 'two' },
    ])
    const gap = segmentGaps({ of: e.s.of, view: e.view })
    expect(gap({ x: 0, y: e.line(1).top - 100 })).toEqual({ after: false, target: 'a' })
    expect(gap({ x: 0, y: e.line(2).bottom + 100 })).toEqual({ after: true, target: 'b' })
    e.view.destroy()
  })

  test('the gaps follow the segments as they change', () => {
    const e = over([
      { key: 'a', text: 'one' },
      { key: 'b', text: 'two' },
    ])
    const gap = segmentGaps({ of: e.s.of, view: e.view })
    e.s.move(e.view, 'b', 'a', false)
    expect(gap({ x: 0, y: e.line(1).top + 1 })).toEqual({ after: false, target: 'b' })
    e.view.destroy()
  })
})
