/**
 * A small markdown look for the editor's tests, which know no particular grammar's look
 */

/**
 * Hears what pieces draw and drop
 * @typedef {Readonly<{ drew: () => void, dropped: () => void }>} Counts
 */

/**
 * A piece drawn as a span holding its text
 * @param {string} shown - Its text
 * @param {Counts} counts - Hears what it draws and drops
 * @returns {import('./look.js').Piece} The piece
 */
function textPiece(shown, counts) {
  return {
    draw() {
      counts.drew()
      const element = document.createElement('span')
      element.dataset['piece'] = shown
      element.textContent = shown
      return element
    },
    drop() {
      counts.dropped()
    },
    same: () => false,
  }
}

/**
 * The look, with inline code drawn as a replaced piece
 * @param {Counts} counts - Hears what the pieces draw and drop
 * @returns {import('./look.js').Look} The look
 */
function testLook(counts) {
  return {
    ATXHeading1: { block: true, element: 'h1' },
    Blockquote: { block: true, element: 'blockquote' },
    Emphasis: { element: 'em' },
    EmphasisMark: { class: 'mark', mark: true },
    HeaderMark: { class: 'mark', mark: true },
    InlineCode: {
      piece: (node, read) => textPiece(read(node.from + 1, node.to - 1).toUpperCase(), counts),
      source: 'replaced',
    },
    Paragraph: { block: true, element: 'p' },
    QuoteMark: { class: 'mark', mark: true },
    StrongEmphasis: { element: 'strong' },
  }
}

/**
 * Counts of what pieces draw and drop
 * @returns {Readonly<{ counts: Counts, total: () => Readonly<{ drawn: number, dropped: number }> }>} The counts, and
 *   their totals
 */
function counted() {
  let drawn = 0
  let dropped = 0
  return {
    counts: {
      drew() {
        drawn += 1
      },
      dropped() {
        dropped += 1
      },
    },
    total: () => ({ drawn, dropped }),
  }
}

export { parser as testGrammar } from '@lezer/markdown'
export { counted, testLook }
