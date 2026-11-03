import { ELEMENT, OPEN, isMarker, matchingClose } from './markers.js'

/**
 * A child hole's markers: the `OPEN` before its content and the `CLOSE` after.
 * @typedef {Readonly<{ open: Comment, close: Comment }>} Range
 */

/**
 * Some siblings: the first, and the one to stop before (undefined for the rest of their parent).
 * @typedef {Readonly<{ first: Node | null, end: Node | undefined }>} Span
 */

/**
 * What a template's markers point at, in document order.
 * @typedef {Readonly<{ elements: readonly Element[], children: readonly Range[] }>} Found
 */

/**
 * What one marker points at.
 * @typedef {Readonly<{ kind: 'element', element: Element }> | Readonly<{ kind: 'child', range: Range }>} Marked
 */

/**
 * What the markers among some siblings point at, and inside them, skipping the content of child holes.
 * @param {Span} span - The siblings
 * @yields {Marked} Each, in document order
 * @returns {Generator<Marked, void, undefined>} Each, in document order
 */
function* marked(span) {
  for (let node = span.first; node && node !== span.end; node = node.nextSibling) {
    if (isMarker(node, OPEN)) {
      const close = matchingClose(node)
      yield { kind: 'child', range: { close, open: node } }
      node = close
    } else if (isMarker(node, ELEMENT)) {
      if (!(node.nextSibling instanceof Element)) {
        throw new TypeError('An element marker is not followed by its element: the markup does not match the template')
      }
      yield { element: node.nextSibling, kind: 'element' }
    } else if (node instanceof Element) {
      yield* marked({ end: undefined, first: node.firstChild })
    }
  }
}

/**
 * The bound elements and child holes of one rendered template, found by its markers.
 * @param {Span} span - The template's nodes
 * @returns {Found} What its markers point at
 */
function collect(span) {
  const all = [...marked(span)]
  return {
    children: all.flatMap((each) => (each.kind === 'child' ? [each.range] : [])),
    elements: all.flatMap((each) => (each.kind === 'element' ? [each.element] : [])),
  }
}

export { collect }
