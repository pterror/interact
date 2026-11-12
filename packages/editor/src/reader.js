/**
 * A text drawn for reading: a walk over its syntax tree into DOM, by the same Look the editor draws with, leaving the
 * marks out. Text is drawn exactly as written (the app's text class keeps whitespace, `white-space: pre-wrap`, as the
 * editor's does), so each text node is a run of the source and every place in the DOM maps back to a source position.
 * The reader also leaves out the whitespace that only separates a mark from the text of its line ("# Title",
 * "> quote"), and the line break of a line holding nothing but marks (a code fence).
 */

import { TreeFragment } from '@lezer/common'

import { settle } from './later.js'
import { ruleOf } from './look.js'
import { shared } from './shared.js'
import { walk } from './walk.js'

/**
 * @typedef {import('@lezer/common').SyntaxNode} SyntaxNode
 * @typedef {import('./look.js').Look} Look
 * @typedef {import('./look.js').Piece} Piece
 * @typedef {import('./look.js').Rule} Rule
 */

/**
 * Something parsed into a tree, reusing what an earlier parse left: a lezer Parser
 * @typedef {Readonly<{
 *   parse: (text: string, fragments?: readonly TreeFragment[]) => import('@lezer/common').Tree,
 * }>} Grammar
 */

/**
 * A range of the text drawn with a class, and attributes
 * @typedef {Readonly<{ from: number, to: number, class: string, attributes?: Readonly<Record<string, string>> }>} Range
 */

/**
 * Ranges over the text that are drawn on it without changing it (search matches, lore marks). `ranges` answers for a
 * part of the text, now or later; `watch` hears that ranges changed, within one range of the text or anywhere.
 * @typedef {Readonly<{
 *   ranges: (from: number, to: number) => import('./later.js').Later<readonly Range[]>,
 *   watch: (listener: (range?: Readonly<{ from: number, to: number }>) => void) => () => void,
 * }>} Overlay
 */

/**
 * @typedef {Readonly<{ grammar: Grammar, look: Look, overlays?: readonly Overlay[], textClass: string }>} ReaderOptions
 */

/**
 * @typedef {Readonly<{
 *   element: HTMLElement,
 *   show: (text: string) => void,
 *   positionAt: (node: Node, offset: number) => number | undefined,
 *   stop: () => void,
 * }>} Reader
 */

/**
 * A part of a node: a block drawn as its own element, or a run drawn inline
 * @typedef {Readonly<{ block: SyntaxNode, rule: Rule } | { from: number, to: number }>} Part
 */

/**
 * A piece and the element drawn for it
 * @typedef {Readonly<{ piece: Piece, element: HTMLElement }>} DrawnPiece
 */

/**
 * What one part of the top node drew
 * @typedef {Readonly<{
 *   key: string,
 *   from: number,
 *   to: number,
 *   nodes: readonly ChildNode[],
 *   pieces: readonly DrawnPiece[],
 * }>} Drawn
 */

/**
 * A range of the text
 * @typedef {Readonly<{ from: number, to: number }>} Span
 */

/**
 * An element drawn around a range of inline text
 * @typedef {Readonly<{
 *   from: number,
 *   to: number,
 *   element: string,
 *   class: string | undefined,
 *   attributes: Readonly<Record<string, string>>,
 * }>} Wrapper
 */

const SPACE = /^[ \t]*$/u

/**
 * Takes what parts drew out of the element, telling their pieces
 * @param {readonly Drawn[]} parts - The parts
 * @returns {void}
 */
function remove(parts) {
  for (const part of parts) {
    for (const node of part.nodes) {
      node.remove()
    }
    for (const { element: made, piece } of part.pieces) {
      piece.drop?.(made)
    }
  }
}

/**
 * Draws texts for reading
 * @param {ReaderOptions} options - The grammar, the look, the overlays drawn on the text, and the class the text takes
 * @returns {Reader} The element it draws into, showing a text, the source position of a place in the element, and
 *   stopping
 */
function reader({ grammar, look, overlays = [], textClass }) {
  const document = globalThis.document
  const element = document.createElement('div')
  element.className = textClass
  let text = ''
  let tree = grammar.parse('')
  /** @type {readonly TreeFragment[]} */
  let fragments = TreeFragment.addTree(tree)
  /** @type {Drawn[]} */
  let drawn = []
  /** @type {WeakMap<Node, number>} */
  let starts = new WeakMap()
  /** @type {WeakMap<Node, { from: number, to: number }>} */
  let spans = new WeakMap()
  /** @type {(readonly Range[])[]} */
  const answers = overlays.map(() => [])
  /** @type {number[]} */
  const asked = overlays.map(() => 0)

  /** @type {import('./look.js').Read} */
  const read = (from, to) => text.slice(from, to)

  /**
   * The blocks under a node and the runs between them
   * @param {SyntaxNode} node - The node
   * @returns {Part[]} Its parts in order
   */
  const partsOf = (node) => {
    /** @type {Readonly<{ block: SyntaxNode, rule: Rule }>[]} */
    const blocks = []
    let top = true
    walk(node, node.from, node.to, (each) => {
      if (top) {
        top = false
        return true
      }
      const rule = ruleOf(look, each, read, 'reader')
      if (rule?.block === true && rule.piece?.(each, read, 'reader') === undefined) {
        blocks.push({ block: each, rule })
        return false
      }
      return rule === undefined || (rule.mark !== true && rule.piece === undefined)
    })
    /** @type {Part[]} */
    const parts = []
    /**
     * Adds the run between two blocks, without the whitespace at its ends, which only separates it from them
     * @param {number} from - Where it starts
     * @param {number} to - Where it ends
     * @returns {void}
     */
    const between = (from, to) => {
      const run = text.slice(from, to)
      const start = from + run.length - run.trimStart().length
      const end = to - (run.length - run.trimEnd().length)
      if (start < end) {
        parts.push({ from: start, to: end })
      }
    }
    let at = node.from
    for (const block of blocks.toSorted((one, other) => one.block.from - other.block.from)) {
      between(at, block.block.from)
      parts.push(block)
      at = Math.max(at, block.block.to)
    }
    if (blocks.length === 0) {
      parts.push({ from: node.from, to: node.to })
    } else {
      between(at, node.to)
    }
    return parts
  }

  /**
   * The ranges the reader leaves out around marks: the space between a mark and its line's text, the space between two
   * marks of one node (a link's address and its title), and the line break of a line holding only marks
   * @param {readonly Readonly<{ from: number, to: number, parent: string }>[]} marks - The marks, each with what
   *   identifies the node it is in
   * @param {number} from - Where the run starts
   * @param {number} to - Where it ends
   * @returns {Span[]} The ranges
   */
  const spaceAround = (marks, from, to) => {
    /** @type {Span[]} */
    const out = []
    /** @type {Map<number, { marked: number, end: number }>} */
    const lines = new Map()
    const ordered = marks.toSorted((one, other) => one.from - other.from)
    for (const [index, mark] of ordered.entries()) {
      const next = ordered[index + 1]
      if (next !== undefined && next.parent === mark.parent && text.slice(mark.to, next.from).trim() === '') {
        out.push({ from: mark.to, to: next.from })
      }
      const lineStart = text.lastIndexOf('\n', mark.from - 1) + 1
      const newline = text.indexOf('\n', mark.to)
      const lineEnd = newline === -1 ? text.length : newline
      if (SPACE.test(text.slice(lineStart, mark.from))) {
        let end = mark.to
        while (end < lineEnd && (text[end] === ' ' || text[end] === '\t')) {
          end += 1
        }
        out.push({ from: mark.to, to: end })
      }
      if (SPACE.test(text.slice(mark.to, lineEnd))) {
        let start = mark.from
        while (start > lineStart && (text[start - 1] === ' ' || text[start - 1] === '\t')) {
          start -= 1
        }
        out.push({ from: start, to: mark.from })
      }
      const line = lines.get(lineStart) ?? { end: lineEnd, marked: 0 }
      line.marked += mark.to - mark.from
      lines.set(lineStart, line)
    }
    for (const [lineStart, line] of lines) {
      const lineText = text.slice(lineStart, line.end)
      if (lineText.trim().length > line.marked) {
        continue
      }
      if (line.end < to) {
        out.push({ from: line.end, to: line.end + 1 })
      } else if (lineStart > from) {
        out.push({ from: lineStart - 1, to: lineStart })
      }
    }
    return out
  }

  /**
   * Draws a run of inline text under a node
   * @param {Element | DocumentFragment} into - Where it goes
   * @param {SyntaxNode} parent - The node it is in
   * @param {number} from - Where the run starts
   * @param {number} to - Where it ends
   * @param {(drawn: DrawnPiece) => void} drew - Hears each piece it draws
   * @returns {boolean} Whether it drew anything but whitespace
   */
  const drawInline = (into, parent, from, to, drew) => {
    /** @type {Wrapper[]} */
    const wrappers = []
    /** @type {Readonly<{ from: number, to: number, parent: string }>[]} */
    const marks = []
    /** @type {Readonly<{ from: number, to: number, piece: Piece }>[]} */
    const atoms = []
    let top = true
    walk(parent, from, to, (node) => {
      if (top) {
        top = false
        return true
      }
      if (node.to <= from || node.from >= to) {
        return false
      }
      const rule = ruleOf(look, node, read, 'reader')
      if (rule === undefined) {
        return true
      }
      if (rule.block === true) {
        return false
      }
      const piece = rule.piece?.(node, read, 'reader')
      if (piece !== undefined) {
        atoms.push({ from: node.from, piece, to: node.to })
        return false
      }
      if (rule.mark === true) {
        marks.push({ from: node.from, parent: `${node.parent?.name ?? ''}:${String(node.parent?.from)}`, to: node.to })
        return false
      }
      const name = rule.element ?? (rule.class === undefined ? undefined : 'span')
      if (name !== undefined) {
        wrappers.push({
          attributes: rule.attributes?.(node, read) ?? {},
          class: rule.class,
          element: name,
          from: node.from,
          to: node.to,
        })
      }
      return true
    })
    const omitted = [...marks, ...spaceAround(marks, from, to)]
    /** @type {Wrapper[]} */
    const covering = [
      ...wrappers.toSorted((one, other) => one.from - other.from || other.to - one.to),
      ...overlays.flatMap((_, index) =>
        (answers[index] ?? [])
          .filter((range) => range.to > from && range.from < to && range.from < range.to)
          .map((range) => ({
            attributes: range.attributes ?? {},
            class: range.class,
            element: 'span',
            from: range.from,
            to: range.to,
          })),
      ),
    ]
    const points = new Set([from, to])
    for (const each of [...covering, ...omitted, ...atoms]) {
      for (const point of [each.from, each.to]) {
        if (point > from && point < to) {
          points.add(point)
        }
      }
    }
    const sorted = [...points].toSorted((one, other) => one - other)
    /** @type {{ wrapper: Wrapper, element: HTMLElement, span: { from: number, to: number } }[]} */
    const open = []
    let visible = false

    /**
     * Opens and closes wrappers so exactly those covering a range are open
     * @param {number} start - The range's start
     * @param {number} end - Its end
     * @returns {Element | DocumentFragment} Where its content goes
     */
    const enter = (start, end) => {
      const now = covering.filter((wrapper) => wrapper.from <= start && end <= wrapper.to)
      let same = 0
      while (same < open.length && same < now.length && open[same]?.wrapper === now[same]) {
        same += 1
      }
      open.length = same
      for (const wrapper of now.slice(same)) {
        const made = document.createElement(wrapper.element)
        for (const [name, value] of Object.entries(wrapper.attributes)) {
          made.setAttribute(name, value)
        }
        if (wrapper.class !== undefined) {
          made.classList.add(...wrapper.class.split(' ').filter((name) => name !== ''))
        }
        const span = { from: start, to: end }
        spans.set(made, span)
        ;(open.at(-1)?.element ?? into).append(made)
        open.push({ element: made, span, wrapper })
      }
      for (const each of open) {
        each.span.to = end
      }
      return open.at(-1)?.element ?? into
    }

    for (let index = 0; index < sorted.length - 1; index += 1) {
      const start = sorted[index] ?? from
      const end = sorted[index + 1] ?? to
      const atom = atoms.find((each) => each.from <= start && start < each.to)
      if (atom !== undefined) {
        if (start === atom.from || start === from) {
          const made = atom.piece.draw()
          spans.set(made, { from: atom.from, to: atom.to })
          enter(start, atom.to).append(made)
          drew({ element: made, piece: atom.piece })
          visible = true
        }
        continue
      }
      if (omitted.some((each) => each.from <= start && end <= each.to)) {
        continue
      }
      const run = text.slice(start, end)
      const node = document.createTextNode(run)
      starts.set(node, start)
      enter(start, end).append(node)
      visible ||= run.trim() !== ''
    }
    return visible
  }

  /**
   * Draws a block and what is in it
   * @param {SyntaxNode} node - The block
   * @param {Rule} rule - How it is drawn
   * @param {(drawn: DrawnPiece) => void} drew - Hears each piece it draws
   * @returns {HTMLElement} Its element
   */
  const drawBlock = (node, rule, drew) => {
    const made = document.createElement(rule.element ?? 'div')
    for (const [name, value] of Object.entries(rule.attributes?.(node, read) ?? {})) {
      made.setAttribute(name, value)
    }
    if (rule.class !== undefined) {
      made.classList.add(...rule.class.split(' ').filter((name) => name !== ''))
    }
    spans.set(made, { from: node.from, to: node.to })
    const parts = partsOf(node)
    const holdsBlocks = parts.some((part) => 'block' in part)
    for (const part of parts) {
      if ('block' in part) {
        made.append(drawBlock(part.block, part.rule, drew))
        continue
      }
      const run = document.createDocumentFragment()
      if (drawInline(run, node, part.from, part.to, drew) || !holdsBlocks) {
        made.append(run)
      }
    }
    return made
  }

  /**
   * Draws one part of the top node
   * @param {SyntaxNode} root - The top node
   * @param {Part} part - The part
   * @returns {Drawn} What it drew
   */
  const drawPart = (root, part) => {
    /** @type {DrawnPiece[]} */
    const pieces = []
    /** @param {DrawnPiece} each - A piece drawn */
    const drew = (each) => {
      pieces.push(each)
    }
    if ('block' in part) {
      const made = drawBlock(part.block, part.rule, drew)
      return { from: part.block.from, key: part.block.name, nodes: [made], pieces, to: part.block.to }
    }
    const run = document.createDocumentFragment()
    const nodes = drawInline(run, root, part.from, part.to, drew) ? [...run.childNodes] : []
    return { from: part.from, key: '', nodes, pieces, to: part.to }
  }

  /**
   * Draws the parts of the top node from one on, keeping those before it
   * @param {(part: Drawn, index: number) => boolean} keep - Whether a part drawn before still stands
   * @returns {void}
   */
  const redraw = (keep) => {
    const root = tree.topNode
    const parts = partsOf(root)
    /** @type {Drawn[]} */
    const next = []
    let index = 0
    while (index < parts.length && index < drawn.length) {
      const was = drawn[index]
      const part = parts[index]
      if (was === undefined || part === undefined) {
        break
      }
      const [from, to, key] =
        'block' in part ? [part.block.from, part.block.to, part.block.name] : [part.from, part.to, '']
      if (was.from !== from || was.to !== to || was.key !== key || !keep(was, index)) {
        break
      }
      next.push(was)
      index += 1
    }
    remove(drawn.slice(index))
    for (const part of parts.slice(index)) {
      const made = drawPart(root, part)
      for (const node of made.nodes) {
        element.append(node)
      }
      next.push(made)
    }
    drawn = next
  }

  /**
   * Asks every overlay for its ranges over the whole text
   * @returns {void}
   */
  const ask = () => {
    for (const [index, overlay] of overlays.entries()) {
      askOne(overlay, index, false)
    }
  }

  /**
   * Asks one overlay for its ranges, and draws the answer if it is to the latest question
   * @param {Overlay} overlay - The overlay
   * @param {number} index - Which it is
   * @param {boolean} drawNow - Whether an answer that comes at once is drawn, rather than left to the caller's drawing
   * @returns {void}
   */
  const askOne = (overlay, index, drawNow) => {
    const question = (asked[index] ?? 0) + 1
    asked[index] = question
    let now = true
    settle(overlay.ranges(0, text.length), (ranges) => {
      if (asked[index] !== question) {
        return
      }
      const was = answers[index] ?? []
      answers[index] = ranges
      if (now && !drawNow) {
        return
      }
      const touched = [...was, ...ranges]
      redraw((part) => !touched.some((range) => range.from < part.to && range.to > part.from))
    })
    now = false
  }

  const stops = overlays.map((overlay, index) =>
    overlay.watch(() => {
      askOne(overlay, index, true)
    }),
  )

  /**
   * The source position of a place in the element
   * @param {Node} node - A node in the element
   * @param {number} offset - An offset in it, as a DOM selection gives
   * @returns {number | undefined} The position, or none for a node the reader didn't draw
   */
  const positionAt = (node, offset) => {
    const start = starts.get(node)
    if (start !== undefined) {
      return start + Math.min(offset, node.textContent?.length ?? 0)
    }
    if (node === element || spans.has(node)) {
      const child = node.childNodes[offset]
      if (child === undefined) {
        return node === element ? text.length : spans.get(node)?.to
      }
      return starts.get(child) ?? spans.get(child)?.from ?? positionAt(child, 0)
    }
    for (let each = node.parentNode; each !== null && each !== element; each = each.parentNode) {
      const span = spans.get(each)
      if (span !== undefined) {
        return span.from
      }
    }
    return undefined
  }

  return {
    element,
    positionAt,
    show(next) {
      if (next === text && drawn.length > 0) {
        return
      }
      const { end, start } = shared(text, next)
      fragments = TreeFragment.applyChanges(fragments, [
        { fromA: start, fromB: start, toA: text.length - end, toB: next.length - end },
      ])
      text = next
      tree = grammar.parse(text, fragments)
      fragments = TreeFragment.addTree(tree, fragments)
      ask()
      redraw((part) => part.to < start)
    },
    stop() {
      for (const stop of stops) {
        stop()
      }
      remove(drawn)
      drawn = []
      starts = new WeakMap()
      spans = new WeakMap()
    },
  }
}

export { reader }
