/**
 * How markdown is drawn. Every mark (`#`, `*`, `[`, a link's URL, a table's pipes) is a `mark`; emphasis, strong,
 * strikethrough, code and links are elements; headings, quotes, lists and code blocks are blocks; tables are drawn as
 * tables by the reader only, since a table can't be drawn over the editor's lines. Images are pieces beside their
 * source. A rule line, an escape, an entity, a hard break and a task's box are drawn by the reader as what they stand
 * for, and as their source in the editor.
 *
 * Every element with attributes from the text (an HTML tag, a link, an image) goes through the app's policy,
 * `html(name, attributes, content)`: what is allowed, and how classes and styles are rewritten. It answers the
 * element to draw, or none to draw the source as text. `content` is the text of an element whose content is raw text
 * (`style`, `script`, `textarea`, `title`). The editor can't put a block element inside a line, so it draws only
 * phrasing HTML elements, and the reader draws the rest. A close tag that closes nothing is hidden, as browsers ignore
 * it.
 */
export type SyntaxNode = import('@lezer/common').SyntaxNode;
export type Look = import('@pterror/interact-editor/look').Look;
export type Piece = import('@pterror/interact-editor/look').Piece;
export type Read = import('@pterror/interact-editor/look').Read;
export type Rule = import('@pterror/interact-editor/look').Rule;
export type HtmlElement = Readonly<{
    name: string;
    attributes: Readonly<Record<string, string>>;
    content?: string;
}>;
export type Html = (name: string, attributes: Readonly<Record<string, string>>, content: string | undefined) => HtmlElement | undefined;
/**
 * The definition a reference link or image refers to: by its label (`[text][label]`), or by its text (`[text][]`,
 * `[text]`). A link or image with its own URL refers to none.
 * @param {SyntaxNode} node - The link or image
 * @param {Read} read - The source
 * @returns {SyntaxNode | undefined} The link reference definition, or none when nothing defines it
 */
declare function definitionOf(node: SyntaxNode, read: Read): SyntaxNode | undefined;
/**
 * The markdown look
 * @param {Html} html - The app's policy for elements whose attributes come from the text
 * @returns {Look} The look
 */
declare function markdownLook(html: Html): Look;
export { definitionOf, markdownLook };
