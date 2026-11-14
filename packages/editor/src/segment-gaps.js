/**
 * Where a segment of one editor would land when dragged to a point: before or after the segment drawn at the point's
 * height, by which half of it the point is in. Above the first segment is before it, below the last after it. It is a
 * Gap, as list's `gaps` is for items drawn as elements of their own: the segments of `segments` are lines of one
 * editor, which no element stands for.
 */

/**
 * @typedef {import('@codemirror/view').EditorView} EditorView
 */

/**
 * A point in the viewport, in CSS pixels
 * @typedef {Readonly<{ x: number, y: number }>} Point
 */

/**
 * Gaps between an editor's segments
 * @param {Readonly<{
 *   view: EditorView,
 *   of: (state: import('@codemirror/state').EditorState) => readonly Readonly<{ key: string, from: number, to: number }>[],
 * }>} options - The editor, and its segments in a state, in order (`segments`' `of`)
 * @returns {(point: Point) => Readonly<{ target: string, after: boolean }> | undefined} The gap at a point, none
 *   while the editor has no segments
 */
function segmentGaps({ of, view }) {
  return (point) => {
    const all = of(view.state)
    const top = view.documentTop
    /** @type {Readonly<{ target: string, after: boolean }> | undefined} */
    let found = undefined
    for (const segment of all) {
      const from = top + view.lineBlockAt(segment.from).top
      const to = top + view.lineBlockAt(segment.to).bottom
      if (found === undefined || point.y >= from) {
        found = { after: point.y >= (from + to) / 2, target: segment.key }
      }
      if (point.y < to) {
        break
      }
    }
    return found
  }
}

export { segmentGaps }
