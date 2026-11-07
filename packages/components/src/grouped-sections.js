/**
 * @import { Attributes, RenderRow } from '@interact/core/list-pipeline'
 * @import { Answer, Query, Question } from '@interact/core/query'
 * @import { Change, ItemSource, Key } from '@interact/core/source'
 * @import { Builder, Extension, State } from '@interact/core/state'
 * @import { ActiveItem } from './active-item.js'
 */

import { Listeners, defineQuery, findPrefix, inputHandler, precedence } from '@interact/core'

import { readNow } from './active-item.js'

/**
 * Where a group starts in a source: the position of its first item, and its name.
 * @typedef {Readonly<{ start: number, group: string }>} GroupStart
 */

/**
 * What the sections know of a grouped list, beside the list itself: how many headings come at or before a position,
 * how many groups there are, and where the heading of the group an item is in is.
 * @typedef {Readonly<{
 *   headingsTo: (position: number) => number,
 *   groups: () => number,
 *   headingOf: (position: number) => number | undefined,
 * }>} Grouped
 */

/**
 * Where each group starts in a source, in order: the question grouping asks a source, which answers from its own
 * indexes. A source that doesn't answer is read through once, its items' groups given by `groupOf`.
 * @type {Query<undefined, readonly GroupStart[]>}
 */
const groupStarts = defineQuery()

/**
 * How many starts come before a position.
 * @param {readonly GroupStart[]} starts - The starts, in order
 * @param {number} position - The position
 * @returns {number} How many start before it
 */
function below(starts, position) {
  let low = 0
  let high = starts.length
  while (low < high) {
    const middle = Math.floor((low + high) / 2)
    if ((starts[middle]?.start ?? position) < position) {
      low = middle + 1
    } else {
      high = middle
    }
  }
  return low
}

/**
 * The group starting at a position, if one does.
 * @param {readonly GroupStart[]} starts - The starts, in order
 * @param {number} position - The position
 * @returns {GroupStart | undefined} The group's start
 */
function startAt(starts, position) {
  const found = starts[below(starts, position)]
  return found?.start === position ? found : undefined
}

/**
 * A key for a group's heading, apart from any item's.
 * @param {string} group - The group
 * @returns {string} The key
 */
function headingKey(group) {
  return `\u0000group ${group}`
}

/**
 * Where groups start among items read in order: wherever an item's group differs from the one before.
 * @template T
 * @param {readonly T[]} items - The items
 * @param {(item: T) => string} groupOf - Which group an item is in
 * @returns {readonly GroupStart[]} The starts
 * @throws {Error} If a group comes again after another
 */
function scan(items, groupOf) {
  /** @type {GroupStart[]} */
  const starts = []
  const seen = new Set()
  for (const [position, item] of items.entries()) {
    const group = groupOf(item)
    if (starts.at(-1)?.group !== group) {
      if (seen.has(group)) {
        throw new Error(`The group "${group}" comes again after another: a grouped source keeps each group together`)
      }
      seen.add(group)
      starts.push({ group, start: position })
    }
  }
  return starts
}

/**
 * The changes to a grouped list that one change to its source makes, from where groups started before and after it.
 * Entries before the change and after it are the same; between, the old entries go and the new ones come, apart from a
 * heading at either end that stays.
 * @param {Change} change - The source's change
 * @param {readonly GroupStart[]} before - Where groups started before it
 * @param {readonly GroupStart[]} after - Where they start after it
 * @returns {Change[]} The list's changes
 */
function translate(change, before, after) {
  if (change.kind === 'reset') {
    return [change]
  }
  const { start } = change
  const oldEnd = change.kind === 'inserted' ? start : change.end
  const newEnd = change.kind === 'removed' ? start : change.end
  const at = start + below(before, start)
  let oldLength = oldEnd - start + below(before, oldEnd + 1) - below(before, start)
  let newLength = newEnd - start + below(after, newEnd + 1) - below(after, start)
  const kept = before.slice(below(before, start), below(before, oldEnd + 1))
  const now = after.slice(below(after, start), below(after, newEnd + 1))
  const same = kept.length === now.length && kept.every((each, index) => each.start === now[index]?.start)
  if (change.kind === 'changed' && same && kept.every((each, index) => each.group === now[index]?.group)) {
    return [{ end: at + oldLength, kind: 'changed', start: at }]
  }
  let from = at
  const firstOld = startAt(before, start)
  const firstNew = startAt(after, start)
  if (oldLength > 0 && newLength > 0 && firstOld !== undefined && firstOld.group === firstNew?.group) {
    from += 1
    oldLength -= 1
    newLength -= 1
  }
  const lastOld = startAt(before, oldEnd)
  const lastNew = startAt(after, newEnd)
  if (oldLength > 0 && newLength > 0 && lastOld !== undefined && lastOld.group === lastNew?.group) {
    oldLength -= 1
    newLength -= 1
  }
  /** @type {Change[]} */
  const changes = []
  if (oldLength > 0) {
    changes.push({ end: from + oldLength, kind: 'removed', start: from })
  }
  if (newLength > 0) {
    changes.push({ end: from + newLength, kind: 'inserted', start: from })
  }
  return changes
}

/**
 * Grouped sections: a list's items in groups, each after a heading. The headings are put in by a list-stage step,
 * lazily: only where groups start is kept, which it asks the source (`groupStarts`), or finds by reading an in-memory
 * source through once; items are read from the source by range as before, and the source's changes become the list's,
 * so every position held moves with them. A heading is an item of the list made by the app's `heading`, and the app's
 * `text` names it. Focus passes over headings (`skip`) and a press on one does nothing. A heading row is
 * `role="presentation"` and `part="heading"`; options say their place among the options alone (`aria-posinset`,
 * `aria-setsize`), and the active option is described by its group's heading (`aria-describedby`), which stays
 * rendered while it is active (`keep`). Typing searches the source and lands on items, never headings. The headings are
 * flat among the options: the WAI-ARIA Authoring Practices' grouped listbox nests options in `role="group"` elements
 * instead (see docs/design.md, Open).
 * @template T, R
 * @template {ItemSource<T>} S
 */
class GroupedSections {
  /**
   * @readonly
   * @type {ActiveItem<T, R, S>}
   */
  #current
  /**
   * @readonly
   * @type {(group: string) => T}
   */
  #heading
  /**
   * @readonly
   * @type {((item: T) => string) | undefined}
   */
  #groupOf
  /**
   * Each group's heading, made once.
   * @readonly
   * @type {Map<string, T>}
   */
  #headings = new Map()
  /**
   * The group of each heading made.
   * @readonly
   * @type {Map<T, string>}
   */
  #groups = new Map()
  /**
   * What is known of each list this made.
   * @readonly
   * @type {WeakMap<ItemSource<T>, Grouped>}
   */
  #grouped = new WeakMap()

  /**
   * @param {ActiveItem<T, R, S>} current - The list's active item
   * @param {(group: string) => T} heading - The heading of a group, as an item of the list
   * @param {((item: T) => string) | undefined} groupOf - Which group an item is in, for a source that doesn't say
   *   where groups start
   */
  constructor(current, heading, groupOf) {
    this.#current = current
    this.#heading = heading
    this.#groupOf = groupOf
  }

  /**
   * Puts the sections in a configuration.
   * @param {Builder} into - The configuration being built
   * @param {number} level - Its level
   * @returns {void}
   */
  install(into, level) {
    const current = this.#current
    const { list } = current
    /** @type {Extension} */
    const parts = [
      current,
      list.transform.of({ apply: (source) => this.#group(source) }),
      current.skip.of((item) => this.isHeading(item)),
      list.keep.of((state) => {
        const at = current.positionIn(state)
        const heading = at === undefined ? undefined : this.#groupedIn(state)?.headingOf(at)
        return heading === undefined ? [] : [heading]
      }),
      precedence(
        'high',
        list.attributes.of((row, state) => this.#rowAttributes(row, state)),
      ),
      precedence(
        'highest',
        inputHandler.of((input, store) => {
          if (!input.is(list.press)) {
            return false
          }
          const item = readNow(list.listOf(store.state), input.value.position)
          return item !== undefined && this.isHeading(item.item)
        }),
      ),
    ]
    into.add(parts, level)
  }

  /**
   * Whether an item of the list is a heading.
   * @param {T} item - The item
   * @returns {boolean} Whether it is
   */
  isHeading(item) {
    return this.#groups.has(item)
  }

  /**
   * A group's heading, made once.
   * @param {string} group - The group
   * @returns {T} Its heading
   */
  #headingFor(group) {
    const known = this.#headings.get(group)
    if (known !== undefined) {
      return known
    }
    const made = this.#heading(group)
    this.#headings.set(group, made)
    this.#groups.set(made, group)
    return made
  }

  /**
   * What is known of the list in a state, when it is one this made.
   * @param {State} state - The state
   * @returns {Grouped | undefined} What is known of it
   */
  #groupedIn(state) {
    return this.#grouped.get(this.#current.list.listOf(state))
  }

  /**
   * A row's attributes: a heading's role and part, an option's place among the options, and the active option's
   * description by its heading.
   * @param {RenderRow<T>} row - The row
   * @param {State} state - The state
   * @returns {Attributes} The attributes
   */
  #rowAttributes(row, state) {
    const grouped = this.#groupedIn(state)
    if (row.kind !== 'item' || row.item === undefined || grouped === undefined) {
      return {}
    }
    if (this.isHeading(row.item)) {
      return { 'aria-posinset': false, 'aria-setsize': false, part: 'heading', role: 'presentation' }
    }
    const at = row.position
    const count = this.#current.list.listOf(state).count()
    const heading = this.#current.positionIn(state) === at ? grouped.headingOf(at) : undefined
    return {
      'aria-describedby': heading === undefined ? undefined : this.#idOf(heading, state),
      'aria-posinset': at + 1 - grouped.headingsTo(at),
      'aria-setsize': count - grouped.groups(),
    }
  }

  /**
   * The id some extension gives the heading at a position.
   * @param {number} position - Where it is
   * @param {State} state - The state
   * @returns {string | undefined} Its id
   */
  #idOf(position, state) {
    const list = this.#current.list.listOf(state)
    const item = readNow(list, position)
    if (item === undefined) {
      return undefined
    }
    const { id } = this.#current.list.attributesOf(
      { item: item.item, key: list.key(item.item), kind: 'item', position },
      state,
    )
    return typeof id === 'string' ? id : undefined
  }

  /**
   * The list of a source's items with their groups' headings.
   * @param {ItemSource<T>} source - The source
   * @returns {ItemSource<T>} The list
   */
  #group(source) {
    /** @type {readonly GroupStart[]} */
    let starts = []
    /** @type {Map<Key, number> | undefined} */
    let indexes = undefined
    let asking = 0
    /** @type {Listeners<Change>} */
    const changes = new Listeners()
    /** @type {(() => void) | undefined} */
    let stop = undefined
    let listening = 0
    /**
     * Where groups start now, at once or later.
     * @returns {readonly GroupStart[] | Promise<readonly GroupStart[]>} The starts
     * @throws {Error} If the source doesn't say and there is no `groupOf`
     */
    const ask = () => {
      const asked = groupStarts.ask(source, undefined)
      if (asked !== undefined) {
        return asked.answer
      }
      const groupOf = this.#groupOf
      if (groupOf === undefined) {
        throw new Error('This source does not say where its groups start: give groupedSections a groupOf')
      }
      const items = source.read(0, source.count())
      return items instanceof Promise ? items.then((all) => scan(all, groupOf)) : scan(items, groupOf)
    }
    /**
     * Learns where groups start again, telling the list's listeners what changed.
     * @param {Change | undefined} change - The source's change, if one made it
     * @returns {void}
     */
    const refresh = (change) => {
      const before = starts
      const asked = ask()
      asking += 1
      indexes = undefined
      if (asked instanceof Promise) {
        const ticket = asking
        starts = []
        if (change !== undefined) {
          changes.emit({ kind: 'reset' })
        }
        void (async () => {
          const found = await asked
          if (ticket === asking) {
            starts = found
            indexes = undefined
            changes.emit({ kind: 'reset' })
          }
        })()
        return
      }
      starts = asked
      for (const each of change === undefined ? [] : translate(change, before, asked)) {
        changes.emit(each)
      }
    }
    /**
     * Where an item of the source is in the list.
     * @param {number} position - Its position in the source
     * @returns {number} Its position in the list
     */
    const listed = (position) => position + below(starts, position + 1)
    /**
     * What is at a position of the list: a group's heading, or the source's item at a position.
     * @param {number} position - The position in the list
     * @returns {Readonly<{ heading: number }> | Readonly<{ item: number }>} The group's index, or the item's position
     */
    const locate = (position) => {
      let low = 0
      let high = starts.length
      while (low < high) {
        const middle = Math.floor((low + high) / 2)
        if ((starts[middle]?.start ?? 0) + middle <= position) {
          low = middle + 1
        } else {
          high = middle
        }
      }
      const index = low - 1
      const start = starts[index]
      return start !== undefined && start.start + index === position ? { heading: index } : { item: position - low }
    }
    /** @type {Grouped} */
    const grouped = {
      groups: () => starts.length,
      headingOf: (position) => {
        const found = locate(position)
        const index = 'heading' in found ? found.heading : below(starts, found.item + 1) - 1
        const start = starts[index]
        return start === undefined ? undefined : start.start + index
      },
      headingsTo: (position) => {
        const found = locate(position)
        return 'heading' in found ? found.heading + 1 : below(starts, found.item + 1)
      },
    }
    /**
     * The items of the list from `start` up to `end`, headings among them.
     * @param {number} start - The first position
     * @param {number} end - The position after the last
     * @returns {readonly T[] | Promise<readonly T[]>} The items
     */
    const read = (start, end) => {
      /** @type {(readonly T[] | Promise<readonly T[]>)[]} */
      const parts = []
      let at = start
      while (at < end) {
        const found = locate(at)
        if ('heading' in found) {
          const group = starts[found.heading]?.group ?? ''
          parts.push([this.#headingFor(group)])
          at += 1
        } else {
          const next = starts[below(starts, found.item + 1)]?.start ?? source.count()
          const until = Math.min(next, found.item + end - at)
          parts.push(source.read(found.item, until))
          at += Math.max(1, until - found.item)
        }
      }
      if (parts.some((part) => part instanceof Promise)) {
        return (async () => {
          const all = await Promise.all(parts.map(async (part) => part))
          return all.flat()
        })()
      }
      return parts.flatMap((part) => (part instanceof Promise ? [] : part))
    }
    /**
     * Where the heading with a key, or the item with a key, is in the list.
     * @param {Key} key - The key
     * @returns {number | undefined} Its position, if it is a heading's
     */
    const headingPosition = (key) => {
      indexes ??= new Map(starts.map((each, index) => [headingKey(each.group), each.start + index]))
      return indexes.get(key)
    }
    /** @type {ItemSource<T>} */
    const list = {
      ask: (question) => this.#ask(question, source, starts, locate),
      count: () => source.count() + starts.length,
      key: (item) => {
        const group = this.#groups.get(item)
        return group === undefined ? source.key(item) : headingKey(group)
      },
      read,
      subscribe: (listener) => {
        if (listening === 0) {
          stop = source.subscribe(refresh)
        }
        listening += 1
        const unsubscribe = changes.add(listener)
        let subscribed = true
        return () => {
          if (subscribed) {
            subscribed = false
            listening -= 1
            unsubscribe()
          }
          if (listening === 0) {
            stop?.()
            stop = undefined
          }
        }
      },
      ...(source.positionOf === undefined
        ? {}
        : {
            positionOf: (key) => {
              const heading = headingPosition(key)
              if (heading !== undefined) {
                return heading
              }
              const found = source.positionOf?.(key)
              if (found instanceof Promise) {
                return (async () => {
                  const later = await found
                  return later === undefined ? undefined : listed(later)
                })()
              }
              return found === undefined ? undefined : listed(found)
            },
          }),
    }
    refresh(undefined)
    this.#grouped.set(list, grouped)
    return list
  }

  /**
   * Answers what the list is asked that it can: where text typed starts an item, asked of the source and placed in
   * the list.
   * @param {Question} question - The question
   * @param {ItemSource<T>} source - The source
   * @param {readonly GroupStart[]} starts - Where groups start
   * @param {(position: number) => Readonly<{ heading: number }> | Readonly<{ item: number }>} locate - What is at a
   *   position of the list
   * @returns {Answer | undefined} The answer, or undefined
   */
  #ask(question, source, starts, locate) {
    const asked = findPrefix.input(question)
    if (asked === undefined) {
      return undefined
    }
    const { from, text } = asked.input
    const found = locate(from)
    const start = 'heading' in found ? (starts[found.heading]?.start ?? 0) : found.item
    const answer = findPrefix.ask(source, { from: start, text })
    if (answer === undefined) {
      return undefined
    }
    /**
     * A source position found, placed in the list.
     * @param {number | undefined} position - The position in the source
     * @returns {number | undefined} The position in the list
     */
    const placed = (position) => (position === undefined ? undefined : position + below(starts, position + 1))
    const later = answer.answer
    return findPrefix.answer(later instanceof Promise ? (async () => placed(await later))() : placed(later))
  }
}

/**
 * Grouped sections for a list.
 * @template T, R
 * @template {ItemSource<T>} S
 * @param {ActiveItem<T, R, S>} current - The list's active item
 * @param {Readonly<{ heading: (group: string) => T, groupOf?: ((item: T) => string) | undefined }>} options - A group's
 *   heading as an item of the list, a value of its own; and which group an item is in, for a source that doesn't
 *   answer `groupStarts`
 * @returns {GroupedSections<T, R, S>} The extension
 */
function groupedSections(current, options) {
  return new GroupedSections(current, options.heading, options.groupOf)
}

export { GroupedSections, groupStarts, groupedSections }
