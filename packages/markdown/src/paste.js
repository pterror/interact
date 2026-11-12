/**
 * Pasted HTML as markdown. Each block of the HTML becomes markdown when the markdown shows the same visible text as
 * the HTML did, and is kept as HTML otherwise, so nothing pasted is lost to the conversion. Elements markdown has no
 * syntax for are kept as HTML; `span`, `font`, `abbr`, `time` and `label` without a style or class are left out
 * around their content. What is pasted (the markdown, the HTML or the plain text) is the app's choice.
 */

import { EditorView } from '@codemirror/view'

const BLOCKS = new Set([
  'ARTICLE',
  'BLOCKQUOTE',
  'DIV',
  'FOOTER',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'HEADER',
  'HR',
  'LI',
  'OL',
  'P',
  'PRE',
  'SECTION',
  'TABLE',
  'UL',
])
const TRANSPARENT = new Set(['ABBR', 'FONT', 'LABEL', 'SPAN', 'TIME'])
const SPECIAL = /[\\`*_[\]<~]/gu
const EDGES = /^(?<before>\s*)(?<body>[\s\S]*?)(?<after>\s*)$/u
const ADDRESS_SPECIAL = /[()\s]/gu

/**
 * What a markdown text shows: its visible text as drawn
 * @typedef {(markdown: string) => string} Shows
 */

/**
 * Text with the characters markdown reads escaped
 * @param {string} text - The text
 * @returns {string} The text, escaped
 */
function escaped(text) {
  return text.replaceAll(SPECIAL, String.raw`\$&`)
}

/**
 * Text between marks, with its surrounding space outside them, or the text alone when it is only space
 * @param {string} mark - The mark
 * @param {string} text - The text
 * @returns {string} It marked
 */
function wrapped(mark, text) {
  const groups = EDGES.exec(text)?.groups
  const body = groups?.['body'] ?? ''
  return body === '' ? text : `${groups?.['before'] ?? ''}${mark}${body}${mark}${groups?.['after'] ?? ''}`
}

/**
 * An address as markdown writes it in a link
 * @param {string} address - The address
 * @returns {string} It, with what would end it encoded
 */
function addressOf(address) {
  return address.replaceAll(ADDRESS_SPECIAL, (character) => encodeURIComponent(character))
}

/**
 * The markdown of the inline content of a node
 * @param {Node} node - The node
 * @returns {string} Its content as markdown
 */
function inlineOf(node) {
  return [...node.childNodes].map((child) => inlineNode(child)).join('')
}

/**
 * The markdown of one inline node
 * @param {Node} node - The node
 * @returns {string} It as markdown
 */
function inlineNode(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    return escaped((node.textContent ?? '').replaceAll(/\s+/gu, ' '))
  }
  if (!(node instanceof Element)) {
    return ''
  }
  switch (node.tagName) {
    case 'STRONG':
    case 'B': {
      return wrapped('**', inlineOf(node))
    }
    case 'EM':
    case 'I': {
      return wrapped('*', inlineOf(node))
    }
    case 'DEL':
    case 'S':
    case 'STRIKE': {
      return wrapped('~~', inlineOf(node))
    }
    case 'CODE': {
      const text = node.textContent
      const fence = text.includes('`') ? '``' : '`'
      return `${fence}${text}${fence}`
    }
    case 'BR': {
      return '\n'
    }
    case 'A': {
      const href = node.getAttribute('href')
      const text = inlineOf(node)
      if (href === null || href === '') {
        return text
      }
      return text === escaped(href) ? `<${href}>` : `[${text}](${addressOf(href)})`
    }
    case 'IMG': {
      const src = node.getAttribute('src')
      return src === null || src === '' ? '' : `![${escaped(node.getAttribute('alt') ?? '')}](${addressOf(src)})`
    }
    default: {
      return TRANSPARENT.has(node.tagName) && !node.hasAttribute('style') && !node.hasAttribute('class')
        ? inlineOf(node)
        : node.outerHTML
    }
  }
}

/**
 * The markdown of a block element, or none when markdown has no syntax for it
 * @param {Element} element - The element
 * @returns {string | undefined} It as markdown
 */
function blockOf(element) {
  switch (element.tagName) {
    case 'P':
    case 'DIV':
    case 'SECTION':
    case 'ARTICLE':
    case 'HEADER':
    case 'FOOTER': {
      return [...element.children].some((child) => BLOCKS.has(child.tagName))
        ? blocksOf(element)
        : inlineOf(element).trim()
    }
    case 'H1':
    case 'H2':
    case 'H3':
    case 'H4':
    case 'H5':
    case 'H6': {
      return `${'#'.repeat(Number(element.tagName[1]))} ${inlineOf(element).trim()}`
    }
    case 'BLOCKQUOTE': {
      return blocksOf(element)
        .split('\n')
        .map((line) => `> ${line}`.trimEnd())
        .join('\n')
    }
    case 'PRE': {
      const text = element.textContent.replace(/\n$/u, '')
      const fence = text.includes('```') ? '~~~' : '```'
      return `${fence}\n${text}\n${fence}`
    }
    case 'HR': {
      return '---'
    }
    case 'UL':
    case 'OL': {
      let number = Number(element.getAttribute('start') ?? 1) || 1
      return [...element.children]
        .filter((child) => child.tagName === 'LI')
        .map((item) => {
          const marker = element.tagName === 'OL' ? `${String(number)}. ` : '- '
          number += 1
          return (
            marker +
            blocksOf(item)
              .trim()
              .split('\n')
              .join(`\n${' '.repeat(marker.length)}`)
          )
        })
        .join('\n')
    }
    default: {
      return undefined
    }
  }
}

/**
 * The markdown of the blocks in a node: each block element, and each run of inline content between them
 * @param {Node} container - The node
 * @param {Shows} [shows] - What a markdown text shows; with it, a block whose markdown shows other text than its HTML
 *   is kept as HTML
 * @returns {string} The blocks as markdown, a blank line between each two
 */
function blocksOf(container, shows) {
  /** @type {string[]} */
  const blocks = []
  /** @type {Node[]} */
  let inline = []
  /**
   * Keeps a block's markdown, or its HTML where the markdown shows something else
   * @param {string | undefined} markdown - Its markdown
   * @param {readonly Node[]} nodes - What it was
   * @returns {void}
   */
  const keep = (markdown, nodes) => {
    const html = nodes
      .map((node) => (node instanceof Element ? node.outerHTML : escapedHtml(node.textContent ?? '')))
      .join('')
    const visible = nodes
      .map((node) => node.textContent ?? '')
      .join('')
      .replaceAll(/\s+/gu, '')
    const same = markdown !== undefined && (shows === undefined || shows(markdown).replaceAll(/\s+/gu, '') === visible)
    const kept = same ? markdown : html.trim()
    if (kept !== '') {
      blocks.push(kept)
    }
  }
  const flush = () => {
    if (inline.some((node) => (node.textContent ?? '').trim() !== '' || node instanceof Element)) {
      keep(
        inline
          .map((node) => inlineNode(node))
          .join('')
          .trim(),
        inline,
      )
    }
    inline = []
  }
  for (const child of container.childNodes) {
    if (child instanceof Element && BLOCKS.has(child.tagName)) {
      flush()
      keep(blockOf(child), [child])
    } else {
      inline.push(child)
    }
  }
  flush()
  return blocks.join('\n\n')
}

/**
 * Text as HTML shows it
 * @param {string} text - The text
 * @returns {string} It with `&`, `<` and `>` escaped
 */
function escapedHtml(text) {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

/**
 * HTML as markdown
 * @param {string} html - The HTML
 * @param {Shows} [shows] - What a markdown text shows (its visible text as the reader draws it); with it, each block
 *   is checked
 * @returns {string} The markdown
 */
function htmlToMarkdown(html, shows) {
  const template = document.createElement('template')
  template.innerHTML = html
  return blocksOf(template.content, shows)
}

/**
 * What a paste could insert
 * @typedef {Readonly<{ markdown: string, html: string, plain: string }>} Pasted
 */

/**
 * The markdown of a paste
 * @param {Pasted} pasted - What it could insert
 * @returns {string} The markdown
 */
function asMarkdown(pasted) {
  return pasted.markdown
}

/**
 * Pastes HTML as markdown
 * @param {Readonly<{ choose?: (pasted: Pasted) => string | undefined, shows?: Shows }>} [options] - Which text to
 *   insert (default the markdown; none leaves the paste to the editor), and what a markdown text shows
 * @returns {import('@codemirror/state').Extension} The extension
 */
function markdownPaste({ choose = asMarkdown, shows } = {}) {
  return EditorView.domEventHandlers({
    paste(event, view) {
      const html = event.clipboardData?.getData('text/html') ?? ''
      if (html === '') {
        return false
      }
      const plain = event.clipboardData?.getData('text/plain') ?? ''
      const chosen = choose({ html, markdown: htmlToMarkdown(html, shows), plain })
      if (chosen === undefined) {
        return false
      }
      event.preventDefault()
      const range = view.state.selection.main
      view.dispatch({
        changes: { from: range.from, insert: chosen, to: range.to },
        scrollIntoView: true,
        selection: { anchor: range.from + chosen.length },
        userEvent: 'input.paste',
      })
      return true
    },
  })
}

export { htmlToMarkdown, markdownPaste }
