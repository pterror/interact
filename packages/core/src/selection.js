/** @import { Key, Source } from './source.js' */

const NONE = 0

/**
 * What is selected: every item `filter` matches, except the keys in `removed`, and the keys in `added` besides. Without
 * a filter, only `added`. So selecting all of ten billion items is one filter, and deselecting one of them is one key.
 * The filter is the source's, made when the selection was; what a view shows later doesn't change what it matches.
 * @template F
 * @typedef {Readonly<{ added: ReadonlySet<Key>, filter: F | undefined, removed: ReadonlySet<Key> }>} Selection
 */

/**
 * A set with a key in it or not.
 * @param {ReadonlySet<Key>} keys - The set
 * @param {Key} key - The key
 * @param {boolean} present - Whether it should be in
 * @returns {ReadonlySet<Key>} A new set
 */
function withKey(keys, key, present) {
  const next = new Set(keys)
  if (present) {
    next.add(key)
  } else {
    next.delete(key)
  }
  return next
}

/**
 * Whether the selection's filter matches an item.
 * @template T, F
 * @param {Selection<F>} selection - The selection
 * @param {Source<T, F>} source - The items' source
 * @param {T} item - The item
 * @returns {boolean} Whether it matches
 */
function inFilter(selection, source, item) {
  return selection.filter !== undefined && source.matches(selection.filter, item)
}

/**
 * Nothing selected.
 * @template F
 * @returns {Selection<F>} The empty selection
 */
function nothing() {
  return { added: new Set(), filter: undefined, removed: new Set() }
}

/**
 * Only one item selected.
 * @template T, F
 * @param {Source<T, F>} source - The item's source
 * @param {T} item - The item
 * @returns {Selection<F>} The selection
 */
function only(source, item) {
  return { added: new Set([source.key(item)]), filter: undefined, removed: new Set() }
}

/**
 * The items now from `start` up to `end` selected, as a filter of the source's that keeps meaning them.
 * @template T, F
 * @param {Source<T, F>} source - The items' source
 * @param {number} start - The first position
 * @param {number} end - The position after the last
 * @returns {Selection<F>} The selection
 */
function spanning(source, start, end) {
  return { added: new Set(), filter: source.span(start, end), removed: new Set() }
}

/**
 * Whether an item is selected.
 * @template T, F
 * @param {Selection<F>} selection - The selection
 * @param {Source<T, F>} source - The item's source
 * @param {T} item - The item
 * @returns {boolean} Whether it is selected
 */
function isSelected(selection, source, item) {
  const key = source.key(item)
  return inFilter(selection, source, item) ? !selection.removed.has(key) : selection.added.has(key)
}

/**
 * The selection with one item's state flipped.
 * @template T, F
 * @param {Selection<F>} selection - The selection
 * @param {Source<T, F>} source - The item's source
 * @param {T} item - The item
 * @returns {Selection<F>} The new selection
 */
function toggle(selection, source, item) {
  const key = source.key(item)
  if (inFilter(selection, source, item)) {
    return { ...selection, removed: withKey(selection.removed, key, !selection.removed.has(key)) }
  }
  return { ...selection, added: withKey(selection.added, key, !selection.added.has(key)) }
}

/**
 * How many items are selected: the filter's count, less the keys removed from it, plus the keys added. Keys are counted
 * as they were when toggled, so an item deleted since still counts until the selection changes.
 * @template T, F
 * @param {Selection<F>} selection - The selection
 * @param {Source<T, F>} source - The items' source
 * @returns {Promise<number>} The count
 */
async function countSelected(selection, source) {
  const matching = selection.filter === undefined ? NONE : await source.countMatching(selection.filter)
  return matching - selection.removed.size + selection.added.size
}

export { countSelected, isSelected, nothing, only, spanning, toggle }
