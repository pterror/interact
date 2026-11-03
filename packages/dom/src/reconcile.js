/**
 * @import { Range } from './collect.js'
 * @import { ChildParts, TemplateInstance } from './instance.js'
 * @import { Entry, Key } from './template.js'
 */

import { adoptInstance, createInstance } from './instance.js'
import { CLOSE, OPEN, isMarker, matchingClose } from './markers.js'
import { moveAfter, removeRange } from './ranges.js'

/**
 * One rendered item of a `repeat`: its key, its markers, and its template.
 * @typedef {Readonly<{ key: Key, range: Range, instance: TemplateInstance }>} Item
 */

/**
 * Fails if two entries share a key.
 * @param {readonly Entry[]} entries - The entries
 * @returns {void}
 */
function checkKeys(entries) {
  const keys = new Set(entries.map(({ key }) => key))
  if (keys.size !== entries.length) {
    throw new Error('Two items of a repeat have the same key')
  }
}

/**
 * Renders an entry afresh, with its markers, outside the document.
 * @param {Entry} entry - The entry
 * @param {Document} document - The document to render in
 * @param {ChildParts} childParts - Makes child parts
 * @returns {Item} The item, its nodes in a fragment until placed
 */
function createItem(entry, document, childParts) {
  const range = { close: document.createComment(CLOSE), open: document.createComment(OPEN) }
  const { instance, nodes } = createInstance(entry.result, document, childParts)
  document.createDocumentFragment().append(range.open, nodes, range.close)
  return { instance, key: entry.key, range }
}

/**
 * An item that can show an entry again, updated, or undefined when there is none or it renders another template.
 * @param {Item | undefined} item - The item rendered for the entry's key before
 * @param {Entry} entry - The entry
 * @returns {Item | undefined} The item, updated
 */
function reuse(item, entry) {
  if (!item) {
    return undefined
  }
  if (item.instance.strings !== entry.result.strings) {
    removeRange(item.range)
    return undefined
  }
  item.instance.update(entry.result.values)
  return item
}

/**
 * Where items are rendered: the child hole's markers, and what makes child parts inside them.
 * @typedef {Readonly<{ range: Range, childParts: ChildParts }>} Place
 */

/**
 * Removes the items whose keys went, so items that stay in order are not moved.
 * @param {readonly Item[]} items - What is rendered now
 * @param {readonly Entry[]} entries - What to render
 * @returns {Map<Key, Item>} The items that stay, by key
 */
function keep(items, entries) {
  const keys = new Set(entries.map(({ key }) => key))
  /** @type {Map<Key, Item>} */
  const kept = new Map()
  for (const item of items) {
    if (keys.has(item.key)) {
      kept.set(item.key, item)
    } else {
      removeRange(item.range)
    }
  }
  return kept
}

/**
 * Renders entries where items were, keeping each item whose key stays and moving it where it now belongs.
 * @param {readonly Item[]} items - What is rendered now, in order
 * @param {readonly Entry[]} entries - What to render
 * @param {Place} place - Where they go
 * @returns {Item[]} What is rendered then, in order
 */
function reconcile(items, entries, place) {
  const { childParts, range } = place
  checkKeys(entries)
  const kept = keep(items, entries)
  /** @type {ChildNode} */
  let cursor = range.open
  return entries.map((entry) => {
    const item = reuse(kept.get(entry.key), entry) ?? createItem(entry, range.open.ownerDocument, childParts)
    if (cursor.nextSibling !== item.range.open) {
      moveAfter(cursor, item.range)
    }
    cursor = item.range.close
    return item
  })
}

/**
 * The item ranges of server markup for a `repeat`, in order.
 * @param {Range} range - The child hole
 * @returns {Range[]} One per item rendered on the server
 */
function serverItems(range) {
  /** @type {Range[]} */
  const found = []
  for (let node = range.open.nextSibling; node && node !== range.close; node = node.nextSibling) {
    if (!isMarker(node, OPEN)) {
      throw new Error('Server markup for a repeat has something between its items: it was rendered differently')
    }
    const close = matchingClose(node)
    found.push({ close, open: node })
    node = close
  }
  return found
}

/**
 * Adopts server markup for a `repeat`: the server's items are paired with the entries in order, then whatever differs
 * is reconciled as on any update.
 * @param {readonly Entry[]} entries - What to render
 * @param {Place} place - Where the server rendered them
 * @returns {Item[]} What is rendered then, in order
 */
function adoptItems(entries, place) {
  checkKeys(entries)
  /** @type {Item[]} */
  const items = []
  for (const [index, server] of serverItems(place.range).entries()) {
    const entry = entries[index]
    if (entry) {
      items.push({ instance: adoptInstance(entry.result, server, place.childParts), key: entry.key, range: server })
    } else {
      removeRange(server)
    }
  }
  return reconcile(items, entries, place)
}

export { adoptItems, reconcile }
