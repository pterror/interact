/**
 * How markdown is drawn, as three looks an app composes to match its grammar: `markdownLook` for CommonMark,
 * `gfmLook` for GFM's syntax, `htmlLook` for HTML inside markdown (`htmlInMarkdown`). Every mark (`#`, `*`, `[`, a
 * link's address, a table's pipes) is a `mark`; emphasis, strong, strikethrough, code and links are elements;
 * headings, quotes, lists and code blocks are blocks; tables are drawn as tables by the reader only, since a table
 * can't be drawn over the editor's lines. Images are pieces beside their source. A rule line, an escape, an entity, a
 * hard break and a task's box are drawn by the reader as what they stand for, and as their source in the editor.
 *
 * Every element with attributes from the text (an HTML tag, a link, an image) goes through the app's policy,
 * `html(name, attributes, content)`: what is allowed, and how classes and styles are rewritten. It answers the
 * element to draw, or none to draw the source as text. `content` is the text of an element whose content is raw text
 * (`style`, `script`, `textarea`, `title`). The editor can't put a block element inside a line, so it draws only
 * phrasing HTML elements, and the reader draws the rest. A close tag that closes nothing is hidden, as browsers ignore
 * it.
 */

/**
 * @typedef {import('@lezer/common').SyntaxNode} SyntaxNode
 * @typedef {import('@pterror/interact-editor/look').Look} Look
 * @typedef {import('@pterror/interact-editor/look').Piece} Piece
 * @typedef {import('@pterror/interact-editor/look').Read} Read
 * @typedef {import('@pterror/interact-editor/look').Rule} Rule
 */

/**
 * An element as the text writes it, or as the app's policy lets it be drawn
 * @typedef {Readonly<{ name: string, attributes: Readonly<Record<string, string>>, content?: string }>} HtmlElement
 */

/**
 * The app's policy for elements whose attributes come from the text
 * @typedef {(
 *   name: string,
 *   attributes: Readonly<Record<string, string>>,
 *   content: string | undefined,
 * ) => HtmlElement | undefined} Html
 */

const MARK = { class: 'mark', mark: true }

/** @type {import('@pterror/interact-editor/look').Surface} */
const READER = 'reader'

const PHRASING = new Set([
  'a',
  'abbr',
  'b',
  'bdi',
  'bdo',
  'big',
  'cite',
  'code',
  'data',
  'del',
  'dfn',
  'em',
  'font',
  'i',
  'ins',
  'kbd',
  'mark',
  'q',
  's',
  'samp',
  'small',
  'span',
  'strike',
  'strong',
  'sub',
  'sup',
  'time',
  'tt',
  'u',
  'var',
])

const RAW_TEXT = new Set(['ScriptText', 'StyleText', 'TextareaText'])

/**
 * Text with its character references decoded
 * @param {string} text - The text
 * @returns {string} What it reads as
 */
function decoded(text) {
  if (!text.includes('&')) {
    return text
  }
  const holder = document.createElement('textarea')
  holder.innerHTML = text
  return holder.value
}

/**
 * The tag that opens an HTML element: its open tag, or its self-closing tag
 * @param {SyntaxNode} element - The element
 * @returns {SyntaxNode | undefined} The tag
 */
function openingOf(element) {
  const first = element.firstChild
  return first !== null && (first.name === 'OpenTag' || first.name === 'SelfClosingTag') ? first : undefined
}

/**
 * An HTML element as the text writes it
 * @param {SyntaxNode} element - The element
 * @param {Read} read - The source
 * @returns {HtmlElement | undefined} Its name, attributes and raw content
 */
function writtenElement(element, read) {
  const opening = openingOf(element)
  const tagName = opening?.getChild('TagName')
  if (opening === undefined || tagName === null || tagName === undefined) {
    return undefined
  }
  /** @type {Record<string, string>} */
  const attributes = {}
  for (const attribute of opening.getChildren('Attribute')) {
    const name = attribute.getChild('AttributeName')
    if (name === null) {
      continue
    }
    const quoted = attribute.getChild('AttributeValue')
    const bare = attribute.getChild('UnquotedAttributeValue')
    const value =
      quoted === null ? (bare === null ? '' : read(bare.from, bare.to)) : read(quoted.from + 1, quoted.to - 1)
    attributes[read(name.from, name.to).toLowerCase()] = decoded(value)
  }
  let raw = element.firstChild?.nextSibling ?? undefined
  while (raw !== undefined && !RAW_TEXT.has(raw.name)) {
    raw = raw.nextSibling ?? undefined
  }
  return {
    attributes,
    name: read(tagName.from, tagName.to).toLowerCase(),
    ...(raw === undefined ? {} : { content: read(raw.from, raw.to) }),
  }
}

/**
 * A piece that draws an element
 * @param {HtmlElement} shown - The element
 * @returns {Piece} The piece
 */
function elementPiece(shown) {
  return {
    draw() {
      const made = document.createElement(shown.name)
      for (const [name, value] of Object.entries(shown.attributes)) {
        made.setAttribute(name, value)
      }
      if (shown.content !== undefined) {
        made.textContent = shown.content
      }
      return made
    },
    same: () => false,
  }
}

/**
 * A piece the reader draws for a node, standing for its source there
 * @param {(node: SyntaxNode, read: Read) => Piece | undefined} draw - The piece for a node
 * @returns {Rule} The rule: dimmed in the editor, the piece in the reader
 */
function readerPiece(draw) {
  return {
    class: 'mark',
    piece: (node, read, surface) => (surface === 'reader' ? draw(node, read) : undefined),
    source: 'replaced',
  }
}

/**
 * A piece that draws some text
 * @param {string} text - The text
 * @returns {Piece} The piece
 */
function textPiece(text) {
  return {
    draw() {
      const made = document.createElement('span')
      made.textContent = text
      return made
    },
    same: () => false,
  }
}

/**
 * The text of a child, if there is one
 * @param {SyntaxNode} node - The node
 * @param {string} name - The child's name
 * @param {Read} read - The source
 * @returns {string | undefined} Its text
 */
function childText(node, name, read) {
  const child = node.getChild(name)
  return child === null ? undefined : read(child.from, child.to)
}

/**
 * A link label as references match it: without its brackets, case-folded, its whitespace collapsed
 * @param {string} label - The label as written, with its brackets
 * @returns {string} The label matched
 */
function normalizedLabel(label) {
  return label.slice(1, -1).trim().replaceAll(/\s+/gu, ' ').toLowerCase()
}

/** @type {WeakMap<import('@lezer/common').Tree, Map<string, SyntaxNode>>} */
const definitionsByTree = new WeakMap()

/**
 * The link reference definitions of the text a node is in, by label; the first of a label wins
 * @param {SyntaxNode} node - A node of the text
 * @param {Read} read - The source
 * @returns {Map<string, SyntaxNode>} The definitions
 */
function definitionsOf(node, read) {
  let top = node
  while (top.parent !== null) {
    top = top.parent
  }
  const tree = top.tree
  const known = tree === null ? undefined : definitionsByTree.get(tree)
  if (known !== undefined) {
    return known
  }
  /** @type {Map<string, SyntaxNode>} */
  const found = new Map()
  const cursor = top.cursor()
  do {
    if (cursor.name === 'LinkReference') {
      const label = cursor.node.getChild('LinkLabel')
      const key = label === null ? '' : normalizedLabel(read(label.from, label.to))
      if (key !== '' && !found.has(key)) {
        found.set(key, cursor.node)
      }
    }
  } while (cursor.next())
  if (tree !== null) {
    definitionsByTree.set(tree, found)
  }
  return found
}

/**
 * The definition a reference link or image refers to: by its label (`[text][label]`), or by its text (`[text][]`,
 * `[text]`). A link or image with its own URL refers to none.
 * @param {SyntaxNode} node - The link or image
 * @param {Read} read - The source
 * @returns {SyntaxNode | undefined} The link reference definition, or none when nothing defines it
 */
function definitionOf(node, read) {
  if (node.getChild('URL') !== null) {
    return undefined
  }
  const label = node.getChild('LinkLabel')
  const written = label === null ? '' : read(label.from, label.to)
  /** @type {string} */
  let key = written.length > 2 ? normalizedLabel(written) : ''
  if (key === '') {
    const open = node.getChild('LinkMark')
    const close = open?.nextSibling
    key =
      open === null || close === null || close === undefined ? '' : normalizedLabel(`[${read(open.to, close.from)}]`)
  }
  return key === '' ? undefined : definitionsOf(node, read).get(key)
}

/**
 * Where a link or image points and its title: its own, or its definition's
 * @param {SyntaxNode} node - The link or image
 * @param {Read} read - The source
 * @returns {{ url: string, title?: string } | undefined} The target, or none for a reference nothing defines
 */
function targetOf(node, read) {
  const inline = node.getChildren('LinkMark').some((mark) => read(mark.from, mark.to) === '(')
  const own = childText(node, 'URL', read)
  if (own === undefined && inline) {
    return { url: '' }
  }
  const source = own === undefined ? definitionOf(node, read) : node
  const url = source === undefined ? undefined : childText(source, 'URL', read)
  if (source === undefined || url === undefined) {
    return undefined
  }
  const title = childText(source, 'LinkTitle', read)
  return { url, ...(title === undefined ? {} : { title: decoded(title.slice(1, -1)) }) }
}

/**
 * An element with attributes from the text, as the app's policy draws it
 * @param {Html} html - The policy
 * @param {string} name - Its name
 * @param {Readonly<Record<string, string>>} attributes - Its attributes
 * @returns {Rule | undefined} Its rule, or none to draw its source as text
 */
function allowed(html, name, attributes) {
  const shown = html(name, attributes, undefined)
  return shown === undefined ? undefined : { attributes: () => shown.attributes, element: shown.name }
}

/**
 * The rule for an HTML element
 * @param {Html} html - The policy
 * @param {SyntaxNode} element - The element
 * @param {Read} read - The source
 * @returns {Rule | undefined} The rule, or none to draw its source as text
 */
function elementRule(html, element, read) {
  const written = writtenElement(element, read)
  const shown = written === undefined ? undefined : html(written.name, written.attributes, written.content)
  if (written === undefined || shown === undefined) {
    return undefined
  }
  if (written.content !== undefined || openingOf(element)?.name === 'SelfClosingTag') {
    return readerPiece(() => elementPiece(shown))
  }
  return {
    attributes: () => shown.attributes,
    element: shown.name,
    ...(PHRASING.has(shown.name) ? {} : { only: READER }),
  }
}

/**
 * The rule for a mark of a link or image: a mark when it points somewhere, its text when it is a reference nothing
 * defines
 * @param {SyntaxNode} node - The mark
 * @param {Read} read - The source
 * @returns {Rule | undefined} The rule
 */
function linkMarkRule(node, read) {
  return node.parent === null || targetOf(node.parent, read) !== undefined ? MARK : undefined
}

/**
 * How CommonMark is drawn
 * @param {Html} html - The app's policy for elements whose attributes come from the text
 * @returns {Look} The look
 */
function markdownLook(html) {
  return {
    ATXHeading1: { block: true, element: 'h1' },
    ATXHeading2: { block: true, element: 'h2' },
    ATXHeading3: { block: true, element: 'h3' },
    ATXHeading4: { block: true, element: 'h4' },
    ATXHeading5: { block: true, element: 'h5' },
    ATXHeading6: { block: true, element: 'h6' },
    Autolink: (node, read) => {
      const url = childText(node, 'URL', read)
      return url === undefined ? undefined : allowed(html, 'a', { href: url })
    },
    'Autolink/LinkMark': MARK,
    'Autolink/URL': {},
    Blockquote: { block: true, element: 'blockquote' },
    BulletList: { block: true, element: 'ul' },
    CodeBlock: { block: true, element: 'pre' },
    CodeInfo: MARK,
    CodeMark: MARK,
    CodeText: { element: 'code' },
    Comment: MARK,
    Emphasis: { element: 'em' },
    EmphasisMark: MARK,
    Entity: readerPiece((node, read) => textPiece(decoded(read(node.from, node.to)))),
    Escape: readerPiece((node, read) => textPiece(read(node.from + 1, node.to))),
    FencedCode: {
      attributes: (node, read) => {
        const info = childText(node, 'CodeInfo', read)?.trim().split(/\s/u)[0]
        return info === undefined || info === '' ? {} : { 'data-language': info }
      },
      block: true,
      element: 'pre',
    },
    HardBreak: readerPiece(() => elementPiece({ attributes: {}, name: 'br' })),
    HeaderMark: MARK,
    HorizontalRule: { ...readerPiece(() => elementPiece({ attributes: {}, name: 'hr' })), mark: true },
    Image: {
      class: 'mark',
      piece: (node, read) => {
        const target = targetOf(node, read)
        const alt = node.getChild('LinkMark')
        const altEnd = alt?.nextSibling
        const altText = alt === null || altEnd === null || altEnd === undefined ? '' : read(alt.to, altEnd.from)
        const shown =
          target === undefined
            ? undefined
            : html(
                'img',
                {
                  alt: decoded(altText),
                  src: target.url,
                  ...(target.title === undefined ? {} : { title: target.title }),
                },
                undefined,
              )
        if (shown === undefined) {
          return undefined
        }
        const sized = 'width' in shown.attributes || 'height' in shown.attributes
        return elementPiece({
          ...shown,
          attributes: { ...shown.attributes, ...(sized ? {} : { 'data-unsized': '' }) },
        })
      },
      source: 'beside',
    },
    'Image/LinkLabel': linkMarkRule,
    'Image/LinkMark': linkMarkRule,
    'Image/LinkTitle': MARK,
    'Image/URL': MARK,
    InlineCode: { element: 'code' },
    Link: (node, read) => {
      const target = targetOf(node, read)
      return target === undefined
        ? undefined
        : allowed(html, 'a', { href: target.url, ...(target.title === undefined ? {} : { title: target.title }) })
    },
    'Link/LinkLabel': linkMarkRule,
    'Link/LinkMark': linkMarkRule,
    'Link/LinkTitle': MARK,
    'Link/URL': MARK,
    LinkMark: MARK,
    LinkReference: MARK,
    ListItem: { block: true, element: 'li' },
    ListMark: MARK,
    OrderedList: {
      attributes: (node, read) => {
        const mark = node.firstChild?.getChild('ListMark')
        const digits = mark === null || mark === undefined ? undefined : /^\d+/u.exec(read(mark.from, mark.to))?.[0]
        return digits === undefined || Number(digits) === 1 ? {} : { start: String(Number(digits)) }
      },
      block: true,
      element: 'ol',
    },
    Paragraph: { block: true, element: 'p' },
    ProcessingInstruction: MARK,
    ProcessingInstructionBlock: MARK,
    QuoteMark: MARK,
    SetextHeading1: { block: true, element: 'h1' },
    SetextHeading2: { block: true, element: 'h2' },
    StrongEmphasis: { element: 'strong' },
  }
}

/**
 * How GFM's syntax is drawn: strikethrough, task boxes, bare URLs as links, and tables
 * @param {Html} html - The app's policy for elements whose attributes come from the text
 * @returns {Look} The look
 */
function gfmLook(html) {
  return {
    Strikethrough: { element: 'del' },
    StrikethroughMark: MARK,
    Table: { block: true, element: 'table', only: 'reader' },
    TableCell: { block: true, element: 'td', only: 'reader' },
    TableDelimiter: MARK,
    TableHeader: { block: true, element: 'tr', only: 'reader' },
    'TableHeader/TableCell': { block: true, element: 'th', only: 'reader' },
    TableRow: { block: true, element: 'tr', only: 'reader' },
    TaskMarker: readerPiece((node, read) => {
      const box = html('input', { disabled: '', type: 'checkbox' }, undefined)
      if (box === undefined) {
        return undefined
      }
      const checked = read(node.from + 1, node.to - 1).trim() !== ''
      return elementPiece({ ...box, attributes: { ...box.attributes, ...(checked ? { checked: '' } : {}) } })
    }),
    URL: (node, read) => allowed(html, 'a', { href: read(node.from, node.to) }),
  }
}

/**
 * How HTML inside markdown (`htmlInMarkdown`) is drawn
 * @param {Html} html - The app's policy
 * @returns {Look} The look
 */
function htmlLook(html) {
  /**
   * The rule for a tag of an HTML element: a mark while its element is drawn
   * @param {SyntaxNode} tag - The tag
   * @param {Read} read - The source
   * @returns {Rule | undefined} The rule
   */
  const tagRule = (tag, read) => {
    const element = tag.parent
    return element?.name === 'Element' && elementRule(html, element, read) !== undefined ? MARK : undefined
  }
  return {
    CloseTag: tagRule,
    Element: (node, read) => elementRule(html, node, read),
    EntityReference: readerPiece((node, read) => textPiece(decoded(read(node.from, node.to)))),
    MismatchedCloseTag: MARK,
    OpenTag: tagRule,
    SelfClosingTag: tagRule,
  }
}

export { definitionOf, gfmLook, htmlLook, markdownLook }
