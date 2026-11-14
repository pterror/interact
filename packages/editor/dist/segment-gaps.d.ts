/**
 * Where a segment of one editor would land when dragged to a point: before or after the segment drawn at the point's
 * height, by which half of it the point is in. Above the first segment is before it, below the last after it. It is a
 * Gap, as list's `gaps` is for items drawn as elements of their own: the segments of `segments` are lines of one
 * editor, which no element stands for.
 */
export type EditorView = import('@codemirror/view').EditorView;
export type Point = Readonly<{
    x: number;
    y: number;
}>;
/**
 * @typedef {import('@codemirror/view').EditorView} EditorView
 */
/**
 * A point in the viewport, in CSS pixels
 * @typedef {Readonly<{ x: number, y: number }>} Point
 */
/**
 * Gaps between an editor's segments
 * @template K
 * @param {Readonly<{
 *   view: EditorView,
 *   of: (state: import('@codemirror/state').EditorState) => readonly Readonly<{ key: K, from: number, to: number }>[],
 * }>} options - The editor, and its segments in a state, in order (`segments`' `of`)
 * @returns {(point: Point) => Readonly<{ target: K, after: boolean }> | undefined} The gap at a point, none while the
 *   editor has no segments
 */
declare function segmentGaps<K>({ of, view }: Readonly<{
    view: EditorView;
    of: (state: import('@codemirror/state').EditorState) => readonly Readonly<{
        key: K;
        from: number;
        to: number;
    }>[];
}>): (point: Point) => Readonly<{
    target: K;
    after: boolean;
}> | undefined;
export { segmentGaps };
