/**
 * A value kept with each segment of one editor (`segments`), by its key: a block's type, whether a to-do is done, a
 * row's state. It goes where its segment goes (moved, joined into another and brought back by undo); a segment split
 * off another starts with what the app derives from the other's, and one laid in from elsewhere with none (until
 * `put` gives it one); and changing it is a change like any other: one the person makes is in the same transaction as
 * the text changed with it, and one from elsewhere is kept out of undo.
 */
import { StateEffect, Transaction } from '@codemirror/state';
export type EditorState = import('@codemirror/state').EditorState;
export type EditorView = import('@codemirror/view').EditorView;
export type Made<K> = Readonly<{
    key: K;
    from: K | undefined;
}>;
export type SegmentDataOptions<K, T> = Readonly<{
    made: (transaction: Transaction) => readonly Made<K>[];
    initial: readonly Readonly<{
        key: K;
        value: T;
    }>[];
    splitOff: (value: T) => T;
}>;
/**
 * @typedef {import('@codemirror/state').EditorState} EditorState
 * @typedef {import('@codemirror/view').EditorView} EditorView
 */
/**
 * A segment a transaction made: split off `from`, or laid in from elsewhere (`from` none); `segments`' Made
 * @template K
 * @typedef {Readonly<{ key: K, from: K | undefined }>} Made
 */
/**
 * @template K, T
 * @typedef {Readonly<{
 *   made: (transaction: Transaction) => readonly Made<K>[],
 *   initial: readonly Readonly<{ key: K, value: T }>[],
 *   splitOff: (value: T) => T,
 * }>} SegmentDataOptions
 */
/**
 * Values kept with segments
 * @template K, T
 * @param {SegmentDataOptions<K, T>} options - The segments each transaction made (`segments`' `made`); the values the
 *   app's segments start with; and the value a segment split off another starts with, from the other's
 * @returns {Readonly<{
 *   extension: import('@codemirror/state').Extension,
 *   get: (state: EditorState, key: K) => T | undefined,
 *   change: (key: K, value: T | undefined) => StateEffect<Readonly<{ key: K, value: T | undefined }>>,
 *   put: (view: EditorView, key: K, value: T | undefined) => void,
 *   inverse: (transaction: Transaction) => readonly StateEffect<unknown>[],
 *   changed: (transaction: Transaction) => readonly K[],
 * }>} The extension; a segment's value in a state (none until it has one); the effect that changes one, for the
 *   app's own transactions; changing one as a change from elsewhere, which undo doesn't reach (before `segments`'
 *   `insert`, for the segment it lays in); the effects undoing a transaction's changes, for the history the app
 *   composes in (CodeMirror's `invertedEffects.of(inverse)`); and the keys whose values a transaction changed other
 *   than by `put`, for the app to save
 */
declare function segmentData<K, T>({ initial, made, splitOff }: SegmentDataOptions<K, T>): Readonly<{
    extension: import('@codemirror/state').Extension;
    get: (state: EditorState, key: K) => T | undefined;
    change: (key: K, value: T | undefined) => StateEffect<Readonly<{
        key: K;
        value: T | undefined;
    }>>;
    put: (view: EditorView, key: K, value: T | undefined) => void;
    inverse: (transaction: Transaction) => readonly StateEffect<unknown>[];
    changed: (transaction: Transaction) => readonly K[];
}>;
export { segmentData };
