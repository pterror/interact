/**
 * The markdown grammar: lezer markdown with GFM (tables, task lists, strikethrough, autolinks), and HTML parsed by
 * `@lezer/html` inside it. The HTML tags of one leaf block (a paragraph, a heading, a table) are mounted as one
 * overlay, so a tag opened and closed in it pairs into one `Element` over the markdown between, with positions in the
 * outer text; an HTML block is an overlay over itself. Removing the HTML nodes (`remove: ['HTMLBlock', 'HTMLTag']`, an
 * app's "show tags as text") leaves nothing to mount.
 */

import { parseMixed } from '@lezer/common'
import { parser as html } from '@lezer/html'
import { GFM, parser } from '@lezer/markdown'

/**
 * @typedef {import('@lezer/markdown').MarkdownConfig} MarkdownConfig
 * @typedef {import('@lezer/markdown').MarkdownParser} MarkdownParser
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
const htmlInside = {
  wrap: parseMixed((node) => {
    if (node.name === 'HTMLBlock') {
      return { overlay: [{ from: node.from, to: node.to }], parser: html }
    }
    const tags = node.type.is('LeafBlock') && !NOT_HOSTS.has(node.name) ? tagsUnder(node.node) : []
    // oxlint-disable-next-line unicorn/no-null -- parseMixed takes null for a node with nothing mounted on it
    return tags.length === 0 ? null : { overlay: tags, parser: html }
  }),
}

/**
 * The markdown grammar with an app's own syntax
 * @param {readonly MarkdownConfig[]} [extensions] - The app's extensions (macros, its own marks), after GFM and HTML
 * @returns {MarkdownParser} The grammar
 */
function markdownGrammar(extensions = []) {
  return parser.configure([GFM, htmlInside, ...extensions])
}

export { markdownGrammar }
