/**
 * Suggestions while typing, one mechanism over `@codemirror/autocomplete` for every source an app has (macros after
 * `{{`, slash commands, mentions). A source reads the text around the cursor and answers, now or later, with the range
 * its options replace, or none. An answer to a question the editor has since moved past is dropped.
 */
export type EditorView = import('@codemirror/view').EditorView;
export type Option = Readonly<{
    label: string;
    detail?: string;
    apply: (view: EditorView, from: number, to: number) => void;
    info?: () => import('./later.js').Later<HTMLElement>;
}>;
export type Suggest = (read: (from: number, to: number) => string, pos: number, explicit: boolean) => import('./later.js').Later<Readonly<{
    from: number;
    to: number;
    options: readonly Option[];
}> | undefined>;
/**
 * Suggestions from sources
 * @param {readonly Suggest[]} sources - The sources, asked in order; every answer is shown
 * @returns {import('@codemirror/state').Extension} The extension that shows them
 */
declare function suggestions(sources: readonly Suggest[]): import('@codemirror/state').Extension;
export { suggestions };
