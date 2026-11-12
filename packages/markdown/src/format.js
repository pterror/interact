/**
 * Formatting markdown text, read from the syntax tree, so italics aren't mistaken for half of bold and the marks are
 * found wherever the cursor is inside them (from cyoa's `format.ts`). Each is a CodeMirror command, with a test of
 * the state where it has one, for a tool's `on`.
 *
 * With nothing selected, a style applies to the word at the cursor; between words it writes an empty pair to type
 * into, and pressing it again with nothing typed takes the pair out. At the end of words in a style, pressing it steps
 * past the closing mark, so typing goes on in plain text. That is the switch for what is typed next, and `hasStyle` is
 * its pressed state.
 */

import { ensureSyntaxTree, syntaxTree } from '@codemirror/language'
import { EditorSelection } from '@codemirror/state'
import { walk } from '@pterror/interact-editor/walk'

/**
 * @typedef {import('@codemirror/state').EditorState} EditorState
 * @typedef {import('@codemirror/view').EditorView} EditorView
 * @typedef {import('@lezer/common').SyntaxNode} SyntaxNode
 * @typedef {'bold' | 'italic' | 'strike' | 'code' | 'underline'} Style
 * @typedef {Readonly<{ from: number, to: number }>} Span
 */

/** @type {Readonly<Record<Style, Readonly<{ node: string, marks: readonly string[] } | { tag: string }>>>} */
const STYLES = {
  bold: { marks: ['**', '__'], node: 'StrongEmphasis' },
  code: { marks: ['`'], node: 'InlineCode' },
  italic: { marks: ['*', '_'], node: 'Emphasis' },
  strike: { marks: ['~~'], node: 'Strikethrough' },
  underline: { tag: 'u' },
}

const WORD_BEFORE = /[\p{L}\p{N}_'-]*$/u
const WORD_AFTER = /^[\p{L}\p{N}_'-]*/u

/**
 * The syntax tree, parsed at least to a position
 * @param {EditorState} state - The state
 * @param {number} to - The position
 * @returns {import('@lezer/common').Tree} The tree
 */
function treeTo(state, to) {
  return ensureSyntaxTree(state, to, 50) ?? syntaxTree(state)
}

/**
 * A node and the nodes around it, innermost first
 * @param {SyntaxNode} node - The node
 * @yields {SyntaxNode} It, then each node it is in
 * @returns {Generator<SyntaxNode, void, undefined>} The nodes
 */
function* outward(node) {
  for (let each = node.parent; ; each = each.parent) {
    yield node
    if (each === null) {
      return
    }
    node = each
  }
}

/**
 * The marks a style is written with: the opening, and the closing
 * @param {Style} style - The style
 * @returns {readonly [string, string]} Them
 */
function marksOf(style) {
  const spec = STYLES[style]
  return 'tag' in spec ? [`<${spec.tag}>`, `</${spec.tag}>`] : [spec.marks[0] ?? '', spec.marks[0] ?? '']
}

/**
 * The innermost HTML element of a tag name around a range, in a leaf block. Its tags are an overlay, which a position
 * between them isn't in, so it is found by walking the overlay.
 * @param {EditorState} state - The state
 * @param {SyntaxNode} block - The leaf block
 * @param {number} from - The range's start
 * @param {number} to - Its end
 * @param {string} tag - The tag name
 * @returns {Readonly<{ open: Span, close: Span }> | undefined} Its open and close tags
 */
function tagAround(state, block, from, to, tag) {
  /** @type {Readonly<{ open: Span, close: Span }> | undefined} */
  let found = undefined
  walk(block, from, to, (node) => {
    if (node.name !== 'Element' || node.from > from || node.to < to) {
      return true
    }
    const open = node.getChild('OpenTag')
    const close = node.getChild('CloseTag')
    const name = open?.getChild('TagName')
    if (open !== null && close !== null && name !== null && name !== undefined) {
      if (state.sliceDoc(name.from, name.to).toLowerCase() === tag) {
        found = { close, open }
      }
    }
    return true
  })
  return found
}

/**
 * The innermost run of a style around a range: its opening and closing marks
 * @param {EditorState} state - The state
 * @param {number} from - The range's start
 * @param {number} to - Its end
 * @param {Style} style - The style
 * @returns {Readonly<{ open: Span, close: Span }> | undefined} The marks, if the range is in the style
 */
function around(state, from, to, style) {
  const spec = STYLES[style]
  for (const node of outward(treeTo(state, to).resolveInner(from, 1))) {
    if (node.from > from || node.to < to) {
      continue
    }
    if ('tag' in spec) {
      const found = node.type.is('LeafBlock') ? tagAround(state, node, from, to, spec.tag) : undefined
      if (found !== undefined) {
        return found
      }
      continue
    }
    const open = node.firstChild
    const close = node.lastChild
    if (node.name !== spec.node || open === null || close === null || open.from === close.from) {
      continue
    }
    const mark = state.sliceDoc(open.from, open.to)
    if (spec.marks.includes(mark) && state.sliceDoc(close.from, close.to) === mark) {
      return { close, open }
    }
  }
  return undefined
}

/**
 * Whether an empty pair of marks is at a position (a style turned on with nothing typed yet, which the grammar doesn't
 * count as formatting), and not part of longer marks: the middle of `**|**` isn't an empty `*|*`
 * @param {EditorState} state - The state
 * @param {number} at - The position
 * @param {string} open - The opening mark
 * @param {string} close - The closing mark
 * @returns {boolean} Whether it is
 */
function emptyPair(state, at, open, close) {
  return (
    state.sliceDoc(at - open.length, at) === open &&
    state.sliceDoc(at, at + close.length) === close &&
    state.sliceDoc(at - open.length - 1, at - open.length) !== open.at(-1) &&
    state.sliceDoc(at + close.length, at + close.length + 1) !== close[0]
  )
}

/**
 * Whether the selection is in a style: what toggling it would turn off
 * @param {EditorState} state - The state
 * @param {Style} style - The style
 * @returns {boolean} Whether it is
 */
function hasStyle(state, style) {
  const [open, close] = marksOf(style)
  const { from, to } = state.selection.main
  return (from === to && emptyPair(state, from, open, close)) || around(state, from, to, style) !== undefined
}

/**
 * Toggles a style on the selection
 * @param {Style} style - The style
 * @returns {(view: EditorView) => boolean} The command
 */
function toggleStyle(style) {
  return (view) => {
    const { state } = view
    const [open, close] = marksOf(style)
    const changes = state.changeByRange((range) => {
      const { from } = range
      let { to } = range
      if (from === to && emptyPair(state, from, open, close)) {
        return {
          changes: { from: from - open.length, to: to + close.length },
          range: EditorSelection.cursor(from - open.length),
        }
      }
      const existing = around(state, from, to, style)
      if (existing !== undefined) {
        const { close: closing, open: opening } = existing
        if (from === to && from === closing.from && closing.from > opening.to) {
          return { range: EditorSelection.cursor(closing.to) }
        }
        const openLength = opening.to - opening.from
        /**
         * @param {number} pos - A position before the marks go
         * @returns {number} Where it is after
         */
        const moved = (pos) => {
          if (pos <= opening.from) {
            return pos
          }
          if (pos <= opening.to) {
            return opening.from
          }
          if (pos <= closing.from) {
            return pos - openLength
          }
          return pos <= closing.to ? closing.from - openLength : pos - openLength - (closing.to - closing.from)
        }
        return {
          changes: [
            { from: opening.from, to: opening.to },
            { from: closing.from, to: closing.to },
          ],
          range: EditorSelection.range(moved(range.anchor), moved(range.head)),
        }
      }
      if (from === to) {
        const line = state.doc.lineAt(from)
        const before = WORD_BEFORE.exec(line.text.slice(0, from - line.from))?.[0].length ?? 0
        const after = WORD_AFTER.exec(line.text.slice(from - line.from))?.[0].length ?? 0
        if (before > 0 && after > 0) {
          return {
            changes: [
              { from: from - before, insert: open },
              { from: to + after, insert: close },
            ],
            range: EditorSelection.cursor(range.from + open.length),
          }
        }
        return { changes: { from, insert: open + close }, range: EditorSelection.cursor(from + open.length) }
      }
      to = from + state.sliceDoc(from, to).trimEnd().length
      return {
        changes: [
          { from, insert: open },
          { from: to, insert: close },
        ],
        range: EditorSelection.range(from + open.length, to + open.length),
      }
    })
    view.dispatch(state.update(changes, { scrollIntoView: true, userEvent: 'input.format' }))
    return true
  }
}

/**
 * The lines a selection touches
 * @param {EditorState} state - The state
 * @returns {import('@codemirror/state').Line[]} The lines
 */
function selectedLines(state) {
  const { from, to } = state.selection.main
  const first = state.doc.lineAt(from).number
  const last = state.doc.lineAt(to).number
  return Array.from({ length: last - first + 1 }, (_, index) => state.doc.line(first + index))
}

/**
 * Whether every line the selection touches starts with a prefix
 * @param {EditorState} state - The state
 * @param {RegExp} prefix - The prefix
 * @returns {boolean} Whether they all do
 */
function linesStartWith(state, prefix) {
  return selectedLines(state).every((line) => prefix.test(line.text))
}

/**
 * A command that puts a prefix at the start of the lines the selection touches, or takes it off when they all have it
 * @param {RegExp} prefix - The prefix as it is found, from the start of a line
 * @param {string} written - The prefix as it is written
 * @returns {(view: EditorView) => boolean} The command
 */
function linePrefix(prefix, written) {
  return (view) => {
    const { state } = view
    const lines = selectedLines(state)
    const off = linesStartWith(state, prefix)
    const changes = lines.map((line) => {
      const found = prefix.exec(line.text)?.[0].length ?? 0
      return off ? { from: line.from, to: line.from + found } : { from: line.from, insert: written }
    })
    view.dispatch({ changes, scrollIntoView: true, userEvent: 'input.format' })
    return true
  }
}

const HEADING = /^(?<marks>#{1,6})\s+/u
const QUOTE = /^>\s?/u
const LIST = /^[-*+]\s+/u

/**
 * Makes the lines the selection touches headings, one level smaller each time to the third, then plain text again
 * @param {EditorView} view - The editor
 * @returns {boolean} That it ran
 */
function heading(view) {
  const changes = selectedLines(view.state).map((line) => {
    const found = HEADING.exec(line.text)
    const level = found?.groups?.['marks']?.length ?? 0
    const next = level === 0 ? '# ' : level < 3 ? `${'#'.repeat(level + 1)} ` : ''
    return { from: line.from, insert: next, to: line.from + (found?.[0].length ?? 0) }
  })
  view.dispatch({ changes, scrollIntoView: true, userEvent: 'input.format' })
  return true
}

/**
 * Whether the lines the selection touches are headings
 * @param {EditorState} state - The state
 * @returns {boolean} Whether they all are
 */
const inHeading = (state) => linesStartWith(state, HEADING)

const quote = linePrefix(QUOTE, '> ')

/**
 * Whether the lines the selection touches are quoted
 * @param {EditorState} state - The state
 * @returns {boolean} Whether they all are
 */
const inQuote = (state) => linesStartWith(state, QUOTE)

const list = linePrefix(LIST, '- ')

/**
 * Whether the lines the selection touches are list items
 * @param {EditorState} state - The state
 * @returns {boolean} Whether they all are
 */
const inList = (state) => linesStartWith(state, LIST)

/**
 * The innermost node of a name around the selection
 * @param {EditorState} state - The state
 * @param {string} name - The name
 * @returns {SyntaxNode | undefined} The node
 */
function enclosing(state, name) {
  const { from, to } = state.selection.main
  for (const node of outward(treeTo(state, to).resolveInner(from, 1))) {
    if (node.name === name && node.from <= from && node.to >= to) {
      return node
    }
  }
  return undefined
}

/**
 * Whether the selection is in a fenced code block
 * @param {EditorState} state - The state
 * @returns {boolean} Whether it is
 */
const inCodeBlock = (state) => enclosing(state, 'FencedCode') !== undefined

/**
 * Puts the lines the selection touches in a fenced code block, or takes the fences of the block it is in away
 * @param {EditorView} view - The editor
 * @returns {boolean} That it ran
 */
function codeBlock(view) {
  const { state } = view
  const block = enclosing(state, 'FencedCode')
  if (block === undefined) {
    const lines = selectedLines(state)
    const first = lines[0]
    const last = lines.at(-1)
    if (first === undefined || last === undefined) {
      return false
    }
    view.dispatch({
      changes: [
        { from: first.from, insert: '```\n' },
        { from: last.to, insert: '\n```' },
      ],
      scrollIntoView: true,
      userEvent: 'input.format',
    })
    return true
  }
  const opening = state.doc.lineAt(block.from)
  const closing = state.doc.lineAt(block.to)
  const closed = closing.number > opening.number && /^\s*(?:`{3,}|~{3,})\s*$/u.test(closing.text)
  view.dispatch({
    changes: [
      { from: opening.from, to: Math.min(opening.to + 1, state.doc.length) },
      ...(closed ? [{ from: Math.max(closing.from - 1, opening.to + 1), to: closing.to }] : []),
    ],
    scrollIntoView: true,
    userEvent: 'input.format',
  })
  return true
}

/**
 * Whether the selection is in a link
 * @param {EditorState} state - The state
 * @returns {boolean} Whether it is
 */
const inLink = (state) => enclosing(state, 'Link') !== undefined

/**
 * Makes the selection (or the word at the cursor) a link with the cursor where its address goes, or takes the link it
 * is in away, leaving its text
 * @param {EditorView} view - The editor
 * @returns {boolean} That it ran
 */
function link(view) {
  const { state } = view
  const existing = enclosing(state, 'Link')
  if (existing !== undefined) {
    const marks = existing.getChildren('LinkMark')
    const textStart = marks[0]?.to ?? existing.from
    const textEnd = marks[1]?.from ?? existing.to
    view.dispatch({
      changes: { from: existing.from, insert: state.sliceDoc(textStart, textEnd), to: existing.to },
      userEvent: 'input.format',
    })
    return true
  }
  const range = state.selection.main
  let { from, to } = range
  if (from === to) {
    const line = state.doc.lineAt(from)
    from -= WORD_BEFORE.exec(line.text.slice(0, from - line.from))?.[0].length ?? 0
    to += WORD_AFTER.exec(line.text.slice(to - line.from))?.[0].length ?? 0
  }
  const text = state.sliceDoc(from, to)
  view.dispatch({
    changes: { from, insert: `[${text}]()`, to },
    scrollIntoView: true,
    selection: EditorSelection.cursor(from + text.length + 3),
    userEvent: 'input.format',
  })
  return true
}

export { codeBlock, hasStyle, heading, inCodeBlock, inHeading, inLink, inList, inQuote, link, list, quote, toggleStyle }
