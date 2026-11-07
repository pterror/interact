import { ELEMENT_MARKUP } from './markers.js'

/** @typedef {'comment' | 'end' | 'start' | 'raw' | 'text'} TokenKind */
/** @typedef {Readonly<{ kind: TokenKind, text: string }>} Token */
/** @typedef {Readonly<{ index: number, text: string, groups: Readonly<Record<string, string | undefined>> }>} Found */

/**
 * A hole on an element: an attribute, a property or an event, and which of the template's bound elements it is on.
 * @typedef {Readonly<{ kind: 'attribute' | 'property' | 'event', name: string, element: number }>} ElementHole
 */

/**
 * A hole in an element's content, and which of the template's child holes it is.
 * @typedef {Readonly<{ kind: 'child', child: number }>} ChildHole
 */

/** @typedef {ElementHole | ChildHole} Hole */

/**
 * A template, ready to render: its holes in order, the static markup between them (with element markers in, and the
 * holes' attributes taken out), and how many bound elements and child holes it has.
 * @typedef {Readonly<{ holes: readonly Hole[], pieces: readonly string[], elements: number, children: number }>} Prepared
 */

const START = '\u{E000}'
const END = '\u{E001}'
const SENTINEL = /^\u{E000}(?<index>\d+)\u{E001}$/u
const SENTINELS = /\u{E000}\d+\u{E001}/gu
const START_TAG = /^<(?<name>[^\s/>]+)(?<attributes>[\s\S]*?)(?<close>\/?)>$/u
const ATTRIBUTE = /\s+(?<name>[^\s"'>/=]+)(?:\s*=\s*(?:"(?<double>[^"]*)"|'(?<single>[^']*)'|(?<bare>[^\s"'=<>`]+)))?/gu
const RAW_TEXT = /^<(?<name>script|style|textarea|title)\b/iu
const TOKEN = /(?<comment><!--[\s\S]*?-->)|(?<end><\/[^>]*>)|(?<start><[A-Za-z](?:"[^"]*"|'[^']*'|[^>"'])*>)|[^<]+|</u

/** @type {WeakMap<TemplateStringsArray, Prepared>} */
const known = new WeakMap()

/**
 * Every match of a global pattern, with where it starts.
 * @param {string} text - What to search
 * @param {RegExp} pattern - A global pattern
 * @returns {Found[]} The matches, in order
 */
function matches(text, pattern) {
  return [...text.matchAll(pattern)].map((match) => ({
    groups: match.groups ?? {},
    index: match.index,
    text: match[0],
  }))
}

/**
 * The template's markup split into tokens: comments, end tags, start tags, raw text and text. The content of a raw
 * text element runs to its end tag whatever it holds.
 * @param {string} markup - The whole template, with sentinels for its holes
 * @returns {Token[]} The tokens, in order
 */
function tokens(markup) {
  const token = new RegExp(TOKEN.source, 'uy')
  /** @type {Token[]} */
  const found = []
  while (token.lastIndex < markup.length) {
    const start = token.lastIndex
    const match = token.exec(markup)
    const text = match?.[0] ?? markup.slice(start)
    const groups = match?.groups ?? {}
    const kind =
      groups['comment'] !== undefined
        ? 'comment'
        : groups['end'] !== undefined
          ? 'end'
          : groups['start'] === undefined
            ? 'text'
            : 'start'
    found.push({ kind, text })
    let end = start + text.length
    const raw = RAW_TEXT.exec(groups['start'] ?? '')?.groups?.['name']
    if (raw !== undefined) {
      const close = markup.slice(end).search(new RegExp(`</${raw}`, 'iu'))
      const content = markup.slice(end, close === -1 ? markup.length : end + close)
      if (content !== '') {
        found.push({ kind: 'raw', text: content })
      }
      end += content.length
    }
    token.lastIndex = end
  }
  return found
}

/**
 * Fails if markup that can't hold a hole has one.
 * @param {string} text - The markup
 * @param {string} where - Where a hole can't be, for the error
 * @returns {void}
 */
function noHole(text, where) {
  if (text.includes(START)) {
    throw new Error(`A template hole can't be ${where}`)
  }
}

/**
 * What kind of hole an attribute name makes, and the name without its prefix.
 * @param {string} written - The name as written: `name`, `.name` or `@name`
 * @returns {Readonly<{ kind: ElementHole['kind'], name: string }>} The kind and the name
 */
function holeName(written) {
  if (written.startsWith('.')) {
    return { kind: 'property', name: written.slice('.'.length) }
  }
  if (written.startsWith('@')) {
    return { kind: 'event', name: written.slice('@'.length) }
  }
  return { kind: 'attribute', name: written }
}

/**
 * Builds a prepared template from its tokens.
 */
class Scanner {
  /**
   * @readonly
   * @type {Hole[]}
   */
  #holes = []
  /**
   * @readonly
   * @type {string[]}
   */
  #pieces = []
  /** @type {string[]} */
  #current = []
  #elements = 0
  #children = 0

  /**
   * Adds static markup.
   * @param {string} text - Markup to keep as it is
   * @returns {void}
   */
  keep(text) {
    this.#current.push(text)
  }

  /**
   * Adds a hole where the scan has got to.
   * @param {string} found - The hole's sentinel
   * @param {Hole} hole - What the hole is
   * @returns {void}
   */
  hole(found, hole) {
    if (Number(SENTINEL.exec(found)?.groups?.['index']) !== this.#holes.length) {
      throw new Error('Template holes were found out of order')
    }
    this.#holes.push(hole)
    this.#pieces.push(this.#current.join(''))
    this.#current = []
  }

  /**
   * Text between tags, with child holes in it.
   * @param {string} text - The text
   * @returns {void}
   */
  text(text) {
    let at = 0
    for (const found of matches(text, SENTINELS)) {
      this.keep(text.slice(at, found.index))
      this.hole(found.text, { child: this.#children, kind: 'child' })
      this.#children += 1
      at = found.index + found.text.length
    }
    this.keep(text.slice(at))
  }

  /**
   * One attribute of a start tag: kept as written, or made a hole.
   * @param {Found} attribute - The attribute as `ATTRIBUTE` matched it
   * @returns {void}
   */
  attribute(attribute) {
    const { name = '', double, single, bare } = attribute.groups
    const value = double ?? single ?? bare ?? ''
    noHole(name, `an attribute's name or stand alone in a tag; it can only be a whole value: name=\${value}`)
    if (!value.includes(START)) {
      this.keep(` ${attribute.text.trimStart()}`)
      return
    }
    if (!SENTINEL.test(value)) {
      throw new Error(
        `A template hole must be a whole attribute value: ${name}=\${value}, not ${name}="...\${value}..."`,
      )
    }
    this.hole(value, { ...holeName(name), element: this.#elements })
  }

  /**
   * A start tag, with an element marker before it when it has holes.
   * @param {string} tag - The tag as written
   * @returns {void}
   */
  tag(tag) {
    const { name = '', attributes = '', close = '' } = START_TAG.exec(tag)?.groups ?? {}
    noHole(name, "a tag's name")
    const bound = attributes.includes(START)
    this.keep(bound ? `${ELEMENT_MARKUP}<${name}` : `<${name}`)
    this.attributes(attributes)
    this.keep(close === '' ? '>' : ' />')
    this.#elements += bound ? 1 : 0
  }

  /**
   * A start tag's attributes, each kept as written or made a hole.
   * @param {string} attributes - Everything between the tag's name and its end
   * @returns {void}
   */
  attributes(attributes) {
    let at = 0
    for (const attribute of matches(attributes, ATTRIBUTE)) {
      this.keep(attributes.slice(at, attribute.index))
      this.attribute(attribute)
      at = attribute.index + attribute.text.length
    }
    const rest = attributes.slice(at)
    noHole(rest, 'in a tag except as an attribute value')
    this.keep(rest.trim() === '' ? '' : ` ${rest.trim()}`)
  }

  /**
   * One token of the template.
   * @param {Token} token - The token
   * @returns {void}
   */
  token(token) {
    if (token.kind === 'start') {
      this.tag(token.text)
    } else if (token.kind === 'text') {
      this.text(token.text)
    } else {
      const where = {
        comment: 'in a comment',
        end: 'in an end tag',
        raw: 'inside <script>, <style>, <textarea> or <title>',
      }
      noHole(token.text, where[token.kind])
      this.keep(token.kind === 'end' ? token.text.replace(/\s+>$/u, '>') : token.text)
    }
  }

  /**
   * The prepared template, once every token is in.
   * @returns {Prepared} The template, ready to render
   */
  done() {
    return {
      children: this.#children,
      elements: this.#elements,
      holes: this.#holes,
      pieces: [...this.#pieces, this.#current.join('')],
    }
  }
}

/**
 * A template's static strings, scanned once for its holes and remembered.
 * @param {TemplateStringsArray} strings - The static strings, the same object each time the template runs
 * @returns {Prepared} The template, ready to render
 */
function prepare(strings) {
  const seen = known.get(strings)
  if (seen) {
    return seen
  }
  if (strings.some((text) => text.includes(START) || text.includes(END))) {
    throw new Error('A template contains U+E000 or U+E001, which mark its holes while it is read')
  }
  const markup = strings.map((text, index) => (index === 0 ? text : `${START}${index - 1}${END}${text}`))
  const scanner = new Scanner()
  for (const token of tokens(markup.join(''))) {
    scanner.token(token)
  }
  const fresh = scanner.done()
  known.set(strings, fresh)
  return fresh
}

export { prepare, tokens }
