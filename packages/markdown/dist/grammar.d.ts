/**
 * The markdown grammar: lezer markdown with GFM (tables, task lists, strikethrough, autolinks), and HTML parsed by
 * `@lezer/html` inside it. The HTML tags of one leaf block (a paragraph, a heading, a table) are mounted as one
 * overlay, so a tag opened and closed in it pairs into one `Element` over the markdown between, with positions in the
 * outer text; an HTML block, or one that starts with a comment, is an overlay over itself, so HTML after the comment
 * on its last line is drawn. Removing the HTML nodes (`remove: ['HTMLBlock', 'HTMLTag']`, an app's "show tags as
 * text") leaves nothing to mount.
 */
export type MarkdownConfig = import('@lezer/markdown').MarkdownConfig;
export type MarkdownParser = import('@lezer/markdown').MarkdownParser;
export type SyntaxNode = import('@lezer/common').SyntaxNode;
/**
 * The markdown grammar with an app's own syntax
 * @param {readonly MarkdownConfig[]} [extensions] - The app's extensions (macros, its own marks), after GFM and HTML
 * @returns {MarkdownParser} The grammar
 */
declare function markdownGrammar(extensions?: readonly MarkdownConfig[]): MarkdownParser;
export { markdownGrammar };
