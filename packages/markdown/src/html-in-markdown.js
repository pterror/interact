/**
 * HTML inside markdown, a lezer markdown extension an app composes into its grammar
 * (`parser.configure([GFM, htmlInMarkdown, ...])`): HTML is parsed by `@lezer/html` inside the markdown. The HTML tags of one leaf block (a paragraph, a heading, a table) are mounted as one
 * overlay, so a tag opened and closed in it pairs into one `Element` over the markdown between, with positions in the
 * outer text; an HTML block, or one that starts with a comment, is an overlay over itself, so HTML after the comment
 * on its last line is drawn. A grammar without it ("show tags as text") reads tags as markdown does: as HTML nodes
 * with nothing mounted.
 */

import { parseMixed } from '@lezer/common'
import { parser as html } from '@lezer/html'

/**
 * @typedef {import('@lezer/markdown').MarkdownConfig} MarkdownConfig
 * @typedef {import('@lezer/common').SyntaxNode} SyntaxNode
 */

const NOT_HOSTS = new Set(['CodeBlock', 'FencedCode', 'HTMLBlock', 'CommentBlock', 'ProcessingInstructionBlock'])

/**
 * The ranges of the HTML tags under a node
 * @param {SyntaxNode} node - The node
 * @returns {{ from: number, to: number }[]} Their ranges, in order
 */
function tagsUnder(node) {
  /** @type {{ from: number, to: number }[]} */
  const tags = []
  for (let child = node.firstChild; child !== null; child = child.nextSibling) {
    if (child.name === 'HTMLTag') {
      tags.push({ from: child.from, to: child.to })
    } else {
      tags.push(...tagsUnder(child))
    }
  }
  return tags
}

/** @type {MarkdownConfig} */
const htmlInMarkdown = {
  wrap: parseMixed((node) => {
    if (node.name === 'HTMLBlock' || node.name === 'CommentBlock') {
      return { overlay: [{ from: node.from, to: node.to }], parser: html }
    }
    const tags = node.type.is('LeafBlock') && !NOT_HOSTS.has(node.name) ? tagsUnder(node.node) : []
    // oxlint-disable-next-line unicorn/no-null -- parseMixed takes null for a node with nothing mounted on it
    return tags.length === 0 ? null : { overlay: tags, parser: html }
  }),
}

export { htmlInMarkdown }
