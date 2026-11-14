/**
 * One editor over many texts: the document is the texts in order, each a segment with a key, one line break between
 * two. Segments are tracked through every change, so the app can save each text where it lives (a block, a message, a
 * cell) and lay a change made elsewhere into the segment it belongs to. Enter splits a segment; deleting the line
 * break between two joins them, and undoing or redoing that brings the joined segment back with its key.
 */
import { Transaction } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
export type SegmentKey = string;
export type Segment = Readonly<{
    key: SegmentKey;
    from: number;
    to: number;
}>;
export type Mark = Readonly<{
    key: SegmentKey;
    at: number;
}>;
/**
 * Whether a transaction came from `insert`, `remove` or `replace` (a text from elsewhere), not from typing
 * @param {Transaction} transaction - The transaction
 * @returns {boolean} Whether it did
 */
declare function fromElsewhere(transaction: Transaction): boolean;
/**
 * Segments over a document
 * @param {Readonly<{ initial: readonly Readonly<{ key: SegmentKey, text: string }>[] }>} options - The texts it starts
 *   with, in order
 * @returns {Readonly<{
 *   doc: string,
 *   extension: import('@codemirror/state').Extension,
 *   of: (state: import('@codemirror/state').EditorState) => Segment[],
 *   split: import('@codemirror/view').Command,
 *   insert: (view: EditorView, after: SegmentKey | undefined, key: SegmentKey, text: string) => void,
 *   remove: (view: EditorView, key: SegmentKey) => void,
 *   replace: (view: EditorView, key: SegmentKey, changes: readonly Readonly<{ from: number, to: number, insert: string }>[]) => void,
 * }>} The document to start the editor with; the extension; the segments in a state, in order; Enter's command; and,
 *   each as a text from elsewhere that undo doesn't reach: laying a segment in after another (first, with none), taking
 *   one out, and changing one's text (positions in its text)
 */
declare function segments({ initial }: Readonly<{
    initial: readonly Readonly<{
        key: SegmentKey;
        text: string;
    }>[];
}>): Readonly<{
    doc: string;
    extension: import('@codemirror/state').Extension;
    of: (state: import('@codemirror/state').EditorState) => Segment[];
    split: import('@codemirror/view').Command;
    insert: (view: EditorView, after: SegmentKey | undefined, key: SegmentKey, text: string) => void;
    remove: (view: EditorView, key: SegmentKey) => void;
    replace: (view: EditorView, key: SegmentKey, changes: readonly Readonly<{
        from: number;
        to: number;
        insert: string;
    }>[]) => void;
}>;
export { fromElsewhere, segments };
