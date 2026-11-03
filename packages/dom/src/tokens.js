/** @typedef {'comment' | 'end' | 'start' | 'raw' | 'text'} TokenKind */
/** @typedef {Readonly<{ kind: TokenKind, text: string }>} Token */
/** @typedef {Readonly<{ index: number, text: string, groups: Readonly<Record<string, string | undefined>> }>} Found */

const RAW_TEXT = /^<(?<name>script|style|textarea|title)\b/iu
const TOKEN = /(?<comment><!--[\s\S]*?-->)|(?<end><\/[^>]*>)|(?<start><[A-Za-z](?:"[^"]*"|'[^']*'|[^>"'])*>)|[^<]+|</u
const NOT_FOUND = -1
const FIRST = 0

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
    text: match[FIRST],
  }))
}

/**
 * Which kind of token a match is.
 * @param {Readonly<Record<string, string | undefined>>} groups - The match's named groups
 * @returns {TokenKind} Its kind
 */
function kindOf(groups) {
  if (groups['comment'] !== undefined) {
    return 'comment'
  }
  if (groups['end'] !== undefined) {
    return 'end'
  }
  return groups['start'] === undefined ? 'text' : 'start'
}

/**
 * The content of a raw text element, which runs to its end tag whatever it holds.
 * @param {string} markup - The whole template
 * @param {number} from - Where the content starts
 * @param {string} name - The element's name
 * @returns {string} The content
 */
function rawText(markup, from, name) {
  const close = markup.slice(from).search(new RegExp(`</${name}`, 'iu'))
  return markup.slice(from, close === NOT_FOUND ? markup.length : from + close)
}

/**
 * The token where a sticky pattern has got to, and the raw text after it when it starts a raw text element.
 * @param {string} markup - The whole template
 * @param {RegExp} token - `TOKEN`, sticky, at where to read
 * @returns {Token[]} The token, then the raw text (empty when there is none)
 */
function nextToken(markup, token) {
  const start = token.lastIndex
  const match = token.exec(markup)
  const text = match?.[FIRST] ?? markup.slice(start)
  const groups = match?.groups ?? {}
  const raw = RAW_TEXT.exec(groups['start'] ?? '')?.groups?.['name']
  const content = raw === undefined ? '' : rawText(markup, start + text.length, raw)
  return [
    { kind: kindOf(groups), text },
    { kind: 'raw', text: content },
  ]
}

/**
 * The template's markup split into tokens: comments, end tags, start tags, raw text and text.
 * @param {string} markup - The whole template, with sentinels for its holes
 * @returns {Token[]} The tokens, in order
 */
function tokens(markup) {
  const token = new RegExp(TOKEN.source, 'uy')
  /** @type {Token[]} */
  const found = []
  while (token.lastIndex < markup.length) {
    const start = token.lastIndex
    const next = nextToken(markup, token)
    found.push(...next)
    token.lastIndex = start + next.reduce((length, each) => length + each.text.length, FIRST)
  }
  return found.filter((each) => each.kind !== 'raw' || each.text !== '')
}

export { matches, tokens }
