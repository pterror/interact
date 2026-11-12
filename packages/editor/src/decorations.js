/**
 * The editor's drawing of a Look: the elements, marks and pieces over the source text. What can't change the editor's
 * vertical layout is built for the visible ranges only, and rebuilt when the text, the viewport or the tree changes.
 * What can (block wrappers, and replaced pieces that cover a line break) can't come from a function of the view
 * (`EditorView.decorations`), so it is a state field: it moves through each change, and is rebuilt only for the
 * top-level nodes that are new or changed. Both are drawn again from scratch on `lookChanged`. While an IME composes,
 * the visible decorations only move with the text, since replacing them around the text being composed can break the
 * composition. A block wrapper wraps the lines that start in its range, so it starts where its node's line does: a
 * block nested on its parent's line (`> > quote`) starts after it.
 */

import { syntaxTree } from '@codemirror/language'
import { StateEffect, StateField } from '@codemirror/state'
import { BlockWrapper, Decoration, EditorView, ViewPlugin, WidgetType } from '@codemirror/view'

import { ruleOf } from './look.js'
import { walk } from './walk.js'

/**
 * @typedef {import('@codemirror/state').EditorState} EditorState
 * @typedef {import('@codemirror/state').Extension} Extension
 * @typedef {import('@codemirror/state').Range<Decoration>} DecorationRange
 * @typedef {import('@codemirror/view').DecorationSet} DecorationSet
 * @typedef {import('@lezer/common').SyntaxNode} SyntaxNode
 * @typedef {import('./look.js').Look} Look
 * @typedef {import('./look.js').Piece} Piece
 */

/**
 * Says that what a Look draws changed without the text changing (a macro's value arrived, macros are shown as
 * written), so everything it draws is drawn again
 * @type {import('@codemirror/state').StateEffectType<undefined>}
 */
const lookChanged = StateEffect.define()

/**
 * Whether a transaction says the look changed
 * @param {import('@codemirror/state').Transaction} transaction - The transaction
 * @returns {boolean} Whether it does
 */
function saysLookChanged(transaction) {
  return transaction.effects.some((effect) => effect.is(lookChanged))
}

/**
 * A piece as CodeMirror draws it
 */
class PieceWidget extends WidgetType {
  /**
   * @param {Piece} piece - The piece
   */
  constructor(piece) {
    super()
    /** @readonly */
    this.piece = piece
  }

  /**
   * @override
   * @param {WidgetType} other - Another widget
   * @returns {boolean} Whether it draws the same
   */
  eq(other) {
    return other instanceof PieceWidget && this.piece.same(other.piece)
  }

  /**
   * @returns {HTMLElement} Its element
   */
  toDOM() {
    return this.piece.draw()
  }

  /**
   * @override
   * @param {HTMLElement} element - Its element, no longer drawn
   * @returns {void}
   */
  destroy(element) {
    this.piece.drop?.(element)
  }

  /**
   * @override
   * @returns {boolean} Whether the editor leaves its events alone: it doesn't, so a click on it places the cursor
   */
  ignoreEvent() {
    return false
  }
}

/**
 * The attributes an element is drawn with
 * @param {string | undefined} name - Its classes
 * @param {Readonly<Record<string, string>> | undefined} attributes - Its other attributes
 * @returns {Record<string, string>} Them together
 */
function attributesOf(name, attributes) {
  return { ...attributes, ...(name === undefined ? {} : { class: name }) }
}

/**
 * Whether a range covers a line break
 * @param {EditorState} state - The state
 * @param {number} from - Its start
 * @param {number} to - Its end
 * @returns {boolean} Whether its ends are on different lines
 */
function crossesLines(state, from, to) {
  return state.doc.lineAt(from).number !== state.doc.lineAt(to).number
}

/**
 * How many nodes a node is inside
 * @param {SyntaxNode} node - The node
 * @returns {number} Its depth
 */
function depthOf(node) {
  let depth = 0
  for (let each = node.parent; each !== null; each = each.parent) {
    depth += 1
  }
  return depth
}

/**
 * The decorations that can't change the layout, over some ranges of the text
 * @param {EditorState} state - The state
 * @param {readonly Readonly<{ from: number, to: number }>[]} ranges - The ranges
 * @param {Look} look - The look
 * @returns {Readonly<{ decorations: DecorationSet, atomic: DecorationSet }>} The decorations, and those Backspace deletes
 *   whole
 */
function inlineDecorations(state, ranges, look) {
  /** @type {import('./look.js').Read} */
  const read = (from, to) => state.sliceDoc(from, to)
  /** @type {DecorationRange[]} */
  const decorations = []
  /** @type {DecorationRange[]} */
  const atomic = []
  const seen = new Set()
  /**
   * @param {string} key - What identifies the decoration
   * @returns {boolean} Whether it is new
   */
  const fresh = (key) => {
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  }
  const top = syntaxTree(state).topNode
  for (const { from, to } of ranges) {
    walk(top, from, to, (node) => {
      const rule = ruleOf(look, node, read, 'editor')
      if (rule === undefined) {
        return true
      }
      const key = `${node.name}:${String(node.from)}:${String(node.to)}`
      const piece = rule.piece?.(node, read, 'editor')
      if (piece !== undefined) {
        if (rule.source === 'beside') {
          if (fresh(key)) {
            if (rule.class !== undefined && node.from < node.to) {
              decorations.push(Decoration.mark({ class: rule.class }).range(node.from, node.to))
            }
            decorations.push(Decoration.widget({ side: 1, widget: new PieceWidget(piece) }).range(node.to))
          }
          return true
        }
        if (!crossesLines(state, node.from, node.to) && fresh(key)) {
          const replaced = Decoration.replace({ widget: new PieceWidget(piece) }).range(node.from, node.to)
          decorations.push(replaced)
          atomic.push(replaced)
        }
        return false
      }
      if (rule.block === true) {
        return true
      }
      if (node.from === node.to || !fresh(key)) {
        return rule.mark !== true
      }
      if (rule.mark === true) {
        decorations.push(Decoration.mark({ attributes: attributesOf(rule.class, undefined) }).range(node.from, node.to))
        return false
      }
      if (rule.element !== undefined || rule.class !== undefined || rule.attributes !== undefined) {
        decorations.push(
          Decoration.mark({
            attributes: attributesOf(rule.class, rule.attributes?.(node, read)),
            ...(rule.element === undefined ? {} : { tagName: rule.element }),
          }).range(node.from, node.to),
        )
      }
      return true
    })
  }
  return { atomic: Decoration.set(atomic, true), decorations: Decoration.set(decorations, true) }
}

/**
 * The decorations that can change the layout, under one top-level node
 * @param {EditorState} state - The state
 * @param {SyntaxNode} top - The node
 * @param {Look} look - The look
 * @returns {Readonly<{ wrappers: import('@codemirror/state').Range<BlockWrapper>[], replaced: DecorationRange[] }>}
 *   Its block wrappers and its replaced pieces that cover a line break
 */
function layoutUnder(state, top, look) {
  /** @type {import('./look.js').Read} */
  const read = (from, to) => state.sliceDoc(from, to)
  /** @type {import('@codemirror/state').Range<BlockWrapper>[]} */
  const wrappers = []
  /** @type {DecorationRange[]} */
  const replaced = []
  walk(top, top.from, top.to, (node) => {
    const rule = ruleOf(look, node, read, 'editor')
    if (rule === undefined) {
      return true
    }
    const piece = rule.piece?.(node, read, 'editor')
    if (piece !== undefined) {
      if (rule.source !== 'beside' && crossesLines(state, node.from, node.to)) {
        replaced.push(Decoration.replace({ widget: new PieceWidget(piece) }).range(node.from, node.to))
        return false
      }
      return rule.source === 'beside'
    }
    if (rule.block === true && node.from < node.to) {
      wrappers.push(
        BlockWrapper.create({
          attributes: attributesOf(rule.class, rule.attributes?.(node, read)),
          rank: Math.max(0, 100 - depthOf(node)),
          tagName: rule.element ?? 'div',
        }).range(state.doc.lineAt(node.from).from, node.to),
      )
    }
    return rule.mark !== true
  })
  return { replaced, wrappers }
}

/**
 * @typedef {Readonly<{ name: string, from: number, to: number }>} Top
 */

/**
 * @typedef {Readonly<{
 *   tree: import('@lezer/common').Tree,
 *   tops: readonly Top[],
 *   wrappers: import('@codemirror/state').RangeSet<BlockWrapper>,
 *   replaced: DecorationSet,
 * }>} Layout
 */

/**
 * The top-level nodes of a tree
 * @param {import('@lezer/common').Tree} tree - The tree
 * @returns {SyntaxNode[]} Them in order
 */
function topsOf(tree) {
  /** @type {SyntaxNode[]} */
  const tops = []
  for (let node = tree.topNode.firstChild; node !== null; node = node.nextSibling) {
    tops.push(node)
  }
  return tops
}

/**
 * The layout state field for a look
 * @param {Look} look - The look
 * @returns {StateField<Layout>} The field
 */
function layoutField(look) {
  /**
   * Builds the layout of a state, keeping what an earlier layout drew for the top-level nodes that didn't change
   * @param {EditorState} state - The state
   * @param {Layout | undefined} was - The earlier layout, moved through the changes
   * @param {import('@codemirror/state').ChangeDesc | undefined} changes - The changes since it
   * @returns {Layout} The layout
   */
  const build = (state, was, changes) => {
    const tree = syntaxTree(state)
    const tops = topsOf(tree)
    /** @type {Set<string>} */
    const kept = new Set()
    /** @type {Readonly<{ from: number, to: number }>[]} */
    const gone = []
    for (const top of was?.tops ?? []) {
      if (changes !== undefined && changes.touchesRange(top.from, top.to) !== false) {
        gone.push({ from: changes.mapPos(top.from, -1), to: changes.mapPos(top.to, 1) })
        continue
      }
      const from = changes?.mapPos(top.from) ?? top.from
      const to = changes?.mapPos(top.to) ?? top.to
      kept.add(`${top.name}:${String(from)}:${String(to)}`)
    }
    const dirty = tops.filter((top) => !kept.has(`${top.name}:${String(top.from)}:${String(top.to)}`))
    for (const top of dirty) {
      gone.push({ from: top.from, to: top.to })
    }
    /** @type {import('@codemirror/state').Range<BlockWrapper>[]} */
    const wrappers = []
    /** @type {DecorationRange[]} */
    const replaced = []
    for (const top of dirty) {
      const under = layoutUnder(state, top, look)
      wrappers.push(...under.wrappers)
      replaced.push(...under.replaced)
    }
    /**
     * @param {number} from - Where a decoration starts
     * @returns {boolean} Whether it was drawn for a node that is gone or changed
     */
    const stale = (from) => gone.some((range) => range.from <= from && from <= range.to)
    const movedWrappers = was === undefined || changes === undefined ? was?.wrappers : was.wrappers.map(changes)
    const movedReplaced = was === undefined || changes === undefined ? was?.replaced : was.replaced.map(changes)
    return {
      replaced: (movedReplaced ?? Decoration.none).update({
        add: replaced,
        filter: (from) => !stale(from),
        sort: true,
      }),
      tops: tops.map(({ from, name, to }) => ({ from, name, to })),
      tree,
      wrappers: (movedWrappers ?? BlockWrapper.set([])).update({
        add: wrappers,
        filter: (from) => !stale(from),
        sort: true,
      }),
    }
  }
  return StateField.define({
    create: (state) => build(state, undefined, undefined),
    provide: (field) => [
      EditorView.blockWrappers.from(field, (layout) => layout.wrappers),
      EditorView.decorations.from(field, (layout) => layout.replaced),
      EditorView.atomicRanges.of((view) => view.state.field(field).replaced),
    ],
    update(layout, transaction) {
      if (saysLookChanged(transaction)) {
        return build(transaction.state, undefined, undefined)
      }
      if (!transaction.docChanged && syntaxTree(transaction.state) === layout.tree) {
        return layout
      }
      return build(transaction.state, layout, transaction.docChanged ? transaction.changes : undefined)
    },
  })
}

/**
 * The visible decorations for a look
 * @param {Look} look - The look
 * @returns {Extension} The view plugin drawing them
 */
function visibleDecorations(look) {
  const plugin = ViewPlugin.define(
    (view) => {
      let built = inlineDecorations(view.state, view.visibleRanges, look)
      let stale = false
      return {
        get atomic() {
          return built.atomic
        },
        get decorations() {
          return built.decorations
        },
        update(update) {
          if (update.view.composing) {
            built = { atomic: built.atomic.map(update.changes), decorations: built.decorations.map(update.changes) }
            stale ||= update.docChanged
            return
          }
          if (
            stale ||
            update.transactions.some((transaction) => saysLookChanged(transaction)) ||
            update.docChanged ||
            update.viewportChanged ||
            syntaxTree(update.state) !== syntaxTree(update.startState)
          ) {
            built = inlineDecorations(update.state, update.view.visibleRanges, look)
            stale = false
          }
        },
      }
    },
    {
      decorations: (value) => value.decorations,
      provide: (self) => EditorView.atomicRanges.of((view) => view.plugin(self)?.atomic ?? Decoration.none),
    },
  )
  return plugin
}

/**
 * Everything the editor draws for a look
 * @param {Look} look - The look
 * @returns {Extension} The extensions
 */
function lookDecorations(look) {
  return [layoutField(look), visibleDecorations(look)]
}

export { inlineDecorations, lookChanged, lookDecorations }
