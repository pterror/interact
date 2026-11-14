/**
 * A value kept with each segment of one editor (`segments`), by its key: a block's type, whether a to-do is done, a
 * row's state. It goes where its segment goes (moved, joined into another and brought back by undo), a segment that
 * Enter splits off another starts with what the app derives from the other's, and changing it is a change like any
 * other: one the person makes is in the same transaction as the text changed with it, and one from elsewhere is kept
 * out of undo.
 */
import { StateEffect, Transaction } from '@codemirror/state';
export type EditorState = import('@codemirror/state').EditorState;
export type EditorView = import('@codemirror/view').EditorView;
export type Segment = Readonly<{
    key: string;
    from: number;
    to: number;
}>;
/**
 * Values kept with segments
 * @template T
 * @param {Readonly<{
 *   of: (state: EditorState) => readonly Segment[],
 *   initial: readonly Readonly<{ key: string, value: T }>[],
 *   split: (value: T) => T,
 * }>} options - The segments in a state, in order (`segments`' `of`); the values the app's segments start with; and
 *   the value a segment split off another starts with, from the other's
 * @returns {Readonly<{
 *   extension: import('@codemirror/state').Extension,
 *   get: (state: EditorState, key: string) => T | undefined,
 *   change: (key: string, value: T | undefined) => StateEffect<Readonly<{ key: string, value: T | undefined }>>,
 *   put: (view: EditorView, key: string, value: T | undefined) => void,
 *   inverse: (transaction: Transaction) => readonly StateEffect<unknown>[],
 *   changed: (transaction: Transaction) => readonly string[],
 * }>} The extension; a segment's value in a state (none until it has one); the effect that changes one, for the
 *   app's own transactions; changing one as a change from elsewhere, which undo doesn't reach (before `segments`'
 *   `insert`, for the segment it lays in); the effects undoing a transaction's changes, for the history the app
 *   composes in (CodeMirror's `invertedEffects.of(inverse)`); and the keys whose values a transaction changed other
 *   than by `put`, for the app to save
 */
declare function segmentData<T>({ initial, of, split }: Readonly<{
    of: (state: EditorState) => readonly Segment[];
    initial: readonly Readonly<{
        key: string;
        value: T;
    }>[];
    split: (value: T) => T;
}>): Readonly<{
    extension: import('@codemirror/state').Extension;
    get: (state: EditorState, key: string) => T | undefined;
    change: (key: string, value: T | undefined) => StateEffect<Readonly<{
        key: string;
        value: T | undefined;
    }>>;
    put: (view: EditorView, key: string, value: T | undefined) => void;
    inverse: (transaction: Transaction) => readonly StateEffect<unknown>[];
    changed: (transaction: Transaction) => readonly string[];
}>;
export { segmentData };
