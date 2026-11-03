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
 * Items by position, ten of them or ten billion. `count` is how many there are now. `read` gives the items from
 * `start` up to `end`, at once or later. `key` identifies an item. `subscribe` reports every change. A filter (`F`)
 * describes a set of items in the source's own terms: `span` makes one for the items now at some positions, `matches`
 * tests an item against one, and `countMatching` counts its items.
 *
 * A source that can search its items' text has `findPrefix`: the first position at or after `from` whose item's text
 * starts with `text`, compared as `startsWithTyped` compares, or undefined if none does. Typing in a list asks it,
 * since only the source knows every item; without it, a list searches the items it has read.
 * @template T, F
 * @typedef {Readonly<{
 *   count: () => number,
 *   read: (start: number, end: number) => readonly T[] | Promise<readonly T[]>,
 *   key: (item: T) => Key,
 *   subscribe: (listener: (change: Change) => void) => () => void,
 *   span: (start: number, end: number) => F,
 *   matches: (filter: F, item: T) => boolean,
 *   countMatching: (filter: F) => number | Promise<number>,
 *   findPrefix?: (text: string, from: number) => number | undefined | Promise<number | undefined>,
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
