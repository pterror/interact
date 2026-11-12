/**
 * HTML inside markdown, a lezer markdown extension an app composes into its grammar
 * (`parser.configure([GFM, htmlInMarkdown, ...])`): HTML is parsed by `@lezer/html` inside the markdown. The HTML tags of one leaf block (a paragraph, a heading, a table) are mounted as one
 * overlay, so a tag opened and closed in it pairs into one `Element` over the markdown between, with positions in the
 * outer text; an HTML block, or one that starts with a comment, is an overlay over itself, so HTML after the comment
 * on its last line is drawn. A grammar without it ("show tags as text") reads tags as markdown does: as HTML nodes
 * with nothing mounted.
 */
export type MarkdownConfig = import('@lezer/markdown').MarkdownConfig;
export type SyntaxNode = import('@lezer/common').SyntaxNode;
/** @type {MarkdownConfig} */
declare const htmlInMarkdown: MarkdownConfig;
export { htmlInMarkdown };
