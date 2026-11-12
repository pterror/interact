/**
 * Hearing every update of an editor made elsewhere, until stopped
 */
import { EditorView } from '@codemirror/view';
/**
 * Hears each update of a view
 * @param {EditorView} view - The view
 * @param {(update: import('@codemirror/view').ViewUpdate) => void} listener - Hears each update
 * @returns {() => void} Stops hearing them
 */
declare function viewUpdates(view: EditorView, listener: (update: import('@codemirror/view').ViewUpdate) => void): () => void;
export { viewUpdates };
