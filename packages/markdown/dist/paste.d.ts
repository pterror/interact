/**
 * Pasted HTML as markdown. Each block of the HTML becomes markdown when the markdown shows the same visible text as
 * the HTML did, and is kept as HTML otherwise, so nothing pasted is lost to the conversion. Elements markdown has no
 * syntax for are kept as HTML; `span`, `font`, `abbr`, `time` and `label` without a style or class are left out
 * around their content. What is pasted (the markdown, the HTML or the plain text) is the app's choice.
 */
export type Shows = (markdown: string) => string;
/**
 * HTML as markdown
 * @param {string} html - The HTML
 * @param {Shows} [shows] - What a markdown text shows (its visible text as the reader draws it); with it, each block
 *   is checked
 * @returns {string} The markdown
 */
declare function htmlToMarkdown(html: string, shows?: Shows): string;
export type Pasted = Readonly<{
    markdown: string;
    html: string;
    plain: string;
}>;
/**
 * Pastes HTML as markdown
 * @param {Readonly<{ choose?: (pasted: Pasted) => string | undefined, shows?: Shows }>} [options] - Which text to
 *   insert (default the markdown; none leaves the paste to the editor), and what a markdown text shows
 * @returns {import('@codemirror/state').Extension} The extension
 */
declare function markdownPaste({ choose, shows }?: Readonly<{
    choose?: (pasted: Pasted) => string | undefined;
    shows?: Shows;
}>): import('@codemirror/state').Extension;
export { htmlToMarkdown, markdownPaste };
