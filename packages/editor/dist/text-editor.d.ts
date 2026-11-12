/**
 * A CodeMirror editor over a text that lives elsewhere (the server's state). Each edit is handed on with an id as it is
 * made. The text from elsewhere says which of this editor's edits it includes; the editor shows it with the edits it
 * doesn't include yet laid over it (rebased, as `@codemirror/collab` does), so an echo of an earlier edit, or someone
 * else's edit, never undoes what was typed since. Everything else it does is composed in by the app: the grammar
 * (`grammarLanguage`), the Look (`lookDecorations`), the text class it shares with the reader, keys, overlays.
 */
import { EditorView } from '@codemirror/view';
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
    extensions?: readonly import('@codemirror/state').Extension[];
}>;
/**
 * An editor over a text
 * @param {TextEditorOptions} options - Where it goes, the text and where its edits go, and what the app composes in
 * @returns {Readonly<{ view: EditorView, stop: () => void }>} The view, and stopping, which destroys it
 */
declare function textEditor({ edit, extensions, parent, text }: TextEditorOptions): Readonly<{
    view: EditorView;
    stop: () => void;
}>;
export { textEditor };
