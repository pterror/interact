/**
 * One editor over many texts that live apart (a page's blocks, a thread's messages, a table's cells), as one document:
 * the texts in order, each a segment with a key, one line break between two. Each segment's text comes through a port
 * of its own, as `textEditor`'s one text does: its Text says which of the edits made to it here it includes, a text
 * heard from elsewhere is laid in with the edits it doesn't include yet over it (so an echo, or someone else's edit,
 * never undoes what was typed since), and each edit made to it here is handed on with its key and an id, positions in
 * its text.
 *
 * Segments are tracked through every change. `split` splits one; deleting the line break between two joins them, and
 * undoing or redoing that brings the joined segment back with its key. A segment moved keeps its key and its text; the
 * person's move is undone like any other change of theirs.
 */
import { EditorState, StateEffect, Transaction } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
export type Text = import('./rebase.js').Text;
export type Pending = import('./rebase.js').Pending;
export type Segment<K> = Readonly<{
    key: K;
    from: number;
    to: number;
}>;
export type Mark<K> = Readonly<{
    key: K;
    at: number;
}>;
export type Made<K> = Readonly<{
    key: K;
    from: K | undefined;
}>;
export type SegmentEdit<K> = (key: K, changes: readonly Readonly<{
    from: number;
    to: number;
    insert: string;
}>[], id: string) => void;
export type SegmentsOptions<K> = Readonly<{
    parent: Element | DocumentFragment;
    initial: readonly K[];
    key: () => K;
    text: (key: K) => Text;
    edit: SegmentEdit<K>;
    extensions?: readonly import('@codemirror/state').Extension[];
}>;
export type Segments<K> = Readonly<{
    view: EditorView;
    stop: () => void;
    of: (state: EditorState) => Segment<K>[];
    split: import('@codemirror/view').Command;
    made: (transaction: Transaction) => readonly Made<K>[];
    inverse: (transaction: Transaction) => readonly StateEffect<unknown>[];
    insert: (after: K | undefined, key: K) => void;
    remove: (key: K) => void;
    move: (key: K, target: K, after: boolean) => void;
    reorder: (key: K, target: K, after: boolean) => boolean;
}>;
/**
 * Segments over one editor
 * @template K
 * @param {SegmentsOptions<K>} options - Where the editor goes; the keys of the segments it starts with, in order; making
 *   a key for a segment a split makes, in the app's key space; each segment's text as it is elsewhere, asked once when
 *   the segment comes in (a split's is the app's text for a new segment, empty until it is saved); where each edit goes;
 *   and what the app composes in
 * @returns {Segments<K>} The view; stopping, which destroys it; the segments in a state, in order; the command that
 *   splits the segment at the cursor (at the start of a non-empty segment the new, empty one goes before it, so the
 *   text keeps its key), for the app to bind; the segments a transaction made; the effects undoing a person's move,
 *   for the history the app composes in (CodeMirror's `invertedEffects.of(inverse)`); laying a segment in after
 *   another (first, with none), taking one out and moving one before or after another, each from elsewhere and kept
 *   out of undo; and the person's move (a drag's Reorder), undone like their other changes, answering whether it moved
 */
declare function segments<K>({ edit, extensions, initial, key: keyOf, parent, text }: SegmentsOptions<K>): Segments<K>;
export { segments };
