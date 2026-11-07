/** @import { Answer, Question } from './query.js' */

/**
 * What identifies an item whatever position it moves to.
 * @typedef {string | number} Key
 */

/**
 * What changed in a source. Positions are before the change; `end` is exclusive. `inserted` and `removed` move every
 * later position, `changed` replaces items in place, and `reset` means anything may differ.
 * @typedef {Readonly<
 *   | { kind: 'inserted', start: number, end: number }
 *   | { kind: 'removed', start: number, end: number }
 *   | { kind: 'changed', start: number, end: number }
 *   | { kind: 'reset' }
 * >} Change
 */

/**
 * Items by position, never all at once: `count` is how many there are now, `read` gives the items from `start` up to
 * `end`, at once or later, `key` identifies an item, and `subscribe` reports every change. A source that can place
 * items has `positionOf`, where the item with a key is now, or undefined when it isn't there. A source that answers
 * questions from its own indexes has `ask` (see `Query`): it gives back an answer for a question it knows, made by the
 * question's query, and undefined for any other. An array is a source (`MemorySource`); a list stage turns one source
 * into another.
 * @template T
 * @typedef {Readonly<{
 *   count: () => number,
 *   read: (start: number, end: number) => readonly T[] | Promise<readonly T[]>,
 *   key: (item: T) => Key,
 *   subscribe: (listener: (change: Change) => void) => () => void,
 *   positionOf?: (key: Key) => number | undefined | Promise<number | undefined>,
 *   ask?: (question: Question) => Answer | undefined,
 * }>} ItemSource
 */

/**
 * An `ItemSource` that also makes selection filters. A filter (`F`)
 * describes a set of items in the source's own terms: `span` makes one for the items now at some positions, `matches`
 * tests an item against one, and `countMatching` counts its items.
 *
 * A source that can place items has `positionOf`, where the item with a key is now, and `firstMatching`, the first
 * position a filter matches whose key isn't in `except`; either gives undefined when there is none. With them
 * `firstSelected` finds where a selection starts without reading through it, so focus entering a list can go to its
 * first selected item.
 * @template T, F
 * @typedef {ItemSource<T> & Readonly<{
 *   span: (start: number, end: number) => F,
 *   matches: (filter: F, item: T) => boolean,
 *   countMatching: (filter: F) => number | Promise<number>,
 *   firstMatching?: (filter: F, except: ReadonlySet<Key>) => number | undefined | Promise<number | undefined>,
 * }>} Source
 */

/**
 * Where a position is after a change, or undefined when its item went (or, after a reset, may have).
 * @param {number} position - Where it was
 * @param {Change} change - What happened
 * @returns {number | undefined} Where it is now
 */
function shiftPosition(position, change) {
  if (change.kind === 'reset') {
    return undefined
  }
  const { end, start } = change
  if (change.kind === 'inserted') {
    return position >= start ? position + end - start : position
  }
  if (change.kind === 'removed' && position >= end) {
    return position - (end - start)
  }
  return change.kind === 'removed' && position >= start ? undefined : position
}

export { shiftPosition }
