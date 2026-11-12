/**
 * A CodeMirror editor over a text that lives elsewhere (the server's state). Each edit is handed on with an id as it is
 * made. The text from elsewhere says which of this editor's edits it includes; the editor shows it with the edits it
 * doesn't include yet laid over it (rebased, as `@codemirror/collab` does), so an echo of an earlier edit, or someone
 * else's edit, never undoes what was typed since. The content takes the same text class as the reader, so one set of
 * styles draws both.
 */
import { EditorView } from '@codemirror/view';
export type Look = import('./look.js').Look;
export type ChangeId = string;
export type Text = Readonly<{
    get: () => Readonly<{
        text: string;
        includes: ChangeId | undefined;
    }>;
    watch: (listener: () => void) => () => void;
}>;
export type Edit = (changes: readonly Readonly<{
    from: number;
    to: number;
    insert: string;
}>[], id: ChangeId) => void;
export type TextEditorOptions = Readonly<{
    parent: Element | DocumentFragment;
    text: Text;
    edit: Edit;
    grammar: import('@lezer/common').Parser;
    look: Look;
    textClass: string;
    extensions?: readonly import('@codemirror/state').Extension[];
}>;
/**
 * An editor over a text
 * @param {TextEditorOptions} options - Where it goes, the text and where its edits go, the grammar and look it draws
 *   with, the class its content takes, and the app's own CodeMirror extensions
 * @returns {Readonly<{ view: EditorView, stop: () => void }>} The view, and stopping, which destroys it
 */
declare function textEditor({ edit, extensions, grammar, look, parent, text, textClass }: TextEditorOptions): Readonly<{
    view: EditorView;
    stop: () => void;
}>;
export { textEditor };
