/**
 * A CodeMirror editor over a text that lives elsewhere (the server's state). Each edit is handed on with an id as it is
 * made. The text from elsewhere says which of this editor's edits it includes; the editor shows it with the edits it
 * doesn't include yet laid over it (rebased, as `@codemirror/collab` does), so an echo of an earlier edit, or someone
 * else's edit, never undoes what was typed since. Everything else it does is composed in by the app: the grammar
 * (`grammarLanguage`), the Look (`lookDecorations`), the text class it shares with the reader, keys, overlays.
 */
import { ChangeSet } from '@codemirror/state';
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
export type Unincluded = Readonly<{
    text: string;
    changes: ChangeSet;
}>;
/**
 * The edits the text doesn't include yet, as one change from the text they were rebased onto last: `changes` applies to
 * `text` and gives what the editor shows. A text heard and not yet shown isn't in it yet.
 * @typedef {Readonly<{ text: string, changes: ChangeSet }>} Unincluded
 */
/**
 * An editor over a text
 * @param {TextEditorOptions} options - Where it goes, the text and where its edits go, and what the app composes in
 * @returns {Readonly<{ view: EditorView, stop: () => void, unincluded: () => Unincluded, rebase: (text: string) => ChangeId | undefined }>}
 *   The view; stopping, which destroys it; the edits the text doesn't include yet; and taking `text` as the text
 *   elsewhere while showing what it shows, so the difference is one edit the text doesn't include, whose id it gives
 *   (none when they don't differ). The text's next `get` is to be `text`, including none of the editor's edits.
 */
declare function textEditor({ edit, extensions, parent, text }: TextEditorOptions): Readonly<{
    view: EditorView;
    stop: () => void;
    unincluded: () => Unincluded;
    rebase: (text: string) => ChangeId | undefined;
}>;
export { textEditor };
