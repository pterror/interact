/**
 * One editor over many texts that live apart (a page's blocks, a thread's messages, a table's cells), as one document:
 * the texts in order, each a segment with a key, one line break between two. Each segment's text comes through a port
 * of its own, as `textEditor`'s one text does: its Text says which of the edits made to it here it includes, a text
 * heard from elsewhere is laid in with the edits it doesn't include yet over it (so an echo, or someone else's edit,
 * never undoes what was typed since), and each edit made to it here is handed on with its key and an id, positions in
 * its text.
 *
 * Segments are tracked through every change. `split` splits one; deleting the line break between two joins them, and
 * undoing or redoing that brings the joined segment back with its key. A segment moved keeps its key and its text; the
 * person's move is undone like any other change of theirs.
 */

import { ChangeSet, EditorSelection, EditorState, StateEffect, StateField, Transaction } from '@codemirror/state'
import { Decoration, EditorView } from '@codemirror/view'

import { elsewhere, fromElsewhere } from './elsewhere.js'
import { changeBetween, rebase, replacementsOf } from './rebase.js'
import { topLayerTooltips } from './top-layer-tooltips.js'

/**
 * @typedef {import('./rebase.js').Text} Text
 * @typedef {import('./rebase.js').Pending} Pending
 */

/**
 * A segment where it is in the document: its text is from `from` to `to`
 * @template K
 * @typedef {Readonly<{ key: K, from: number, to: number }>} Segment
 */

/**
 * A segment's key and where the line break before its text is: -1 for the first, which has none
 * @template K
 * @typedef {Readonly<{ key: K, at: number }>} Mark
 */

/**
 * A segment a transaction made: split off `from`, or laid in from elsewhere (`from` none)
 * @template K
 * @typedef {Readonly<{ key: K, from: K | undefined }>} Made
 */

/**
 * One edit to a segment, handed on as it is made: replacements whose positions are all in the segment's text before it
 * @template K
 * @typedef {(key: K, changes: readonly Readonly<{ from: number, to: number, insert: string }>[], id: string) => void}
 *   SegmentEdit
 */

/**
 * @template K
 * @typedef {Readonly<{
 *   parent: Element | DocumentFragment,
 *   initial: readonly K[],
 *   key: () => K,
 *   text: (key: K) => Text,
 *   edit: SegmentEdit<K>,
 *   extensions?: readonly import('@codemirror/state').Extension[],
 * }>} SegmentsOptions
 */

/**
 * @template K
 * @typedef {Readonly<{
 *   view: EditorView,
 *   stop: () => void,
 *   of: (state: EditorState) => Segment<K>[],
 *   split: import('@codemirror/view').Command,
 *   made: (transaction: Transaction) => readonly Made<K>[],
 *   inverse: (transaction: Transaction) => readonly StateEffect<unknown>[],
 *   insert: (after: K | undefined, key: K) => void,
 *   remove: (key: K) => void,
 *   move: (key: K, target: K, after: boolean) => void,
 *   reorder: (key: K, target: K, after: boolean) => boolean,
 * }>} Segments
 */

/** How many joined segments are kept for undo */
const KEPT = 200

let made = 0

/**
 * A line break's new place after changes, or none when it was deleted
 * @param {import('@codemirror/state').ChangeDesc} changes - The changes
 * @param {number} at - Where it was
 * @returns {number | undefined} Where it is
 */
function moved(changes, at) {
  const from = changes.mapPos(at, 1)
  const to = changes.mapPos(at + 1, -1)
  return to - from === 1 ? from : undefined
}

/**
 * The mark of the segment a position is in
 * @template K
 * @param {readonly Mark<K>[]} marks - The marks, in order
 * @param {number} pos - The position
 * @returns {Mark<K> | undefined} Its segment's mark
 */
function ownerOf(marks, pos) {
  /** @type {Mark<K> | undefined} */
  let owner = undefined
  for (const mark of marks) {
    if (mark.at < pos) {
      owner = mark
    }
  }
  return owner
}

/**
 * A transaction's changes as they fall in one segment, positions in its text, if they all fall inside it and give its
 * text after; otherwise none
 * @param {Transaction} transaction - The transaction
 * @param {Readonly<{ from: number, to: number }>} was - Where the segment's text was before it
 * @param {string} now - The segment's text after it
 * @returns {ChangeSet | undefined} The changes
 */
function within(transaction, was, now) {
  /** @type {{ from: number, to: number, insert: string }[]} */
  const local = []
  /** @type {number[]} */
  const across = []
  transaction.changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => {
    if (toA < was.from || fromA > was.to) {
      return
    }
    if (fromA < was.from || toA > was.to) {
      across.push(fromA)
    }
    local.push({ from: fromA - was.from, insert: inserted.toString(), to: toA - was.from })
  })
  if (across.length > 0) {
    return undefined
  }
  const before = transaction.startState.doc.sliceString(was.from, was.to)
  const changes = ChangeSet.of(local, before.length)
  return changes.apply(transaction.startState.toText(before)).toString() === now ? changes : undefined
}

/**
 * Segments over one editor
 * @template K
 * @param {SegmentsOptions<K>} options - Where the editor goes; the keys of the segments it starts with, in order; making
 *   a key for a segment a split makes, in the app's key space; each segment's text as it is elsewhere, asked once when
 *   the segment comes in (a split's is the app's text for a new segment, empty until it is saved); where each edit goes;
 *   and what the app composes in
 * @returns {Segments<K>} The view; stopping, which destroys it; the segments in a state, in order; the command that
 *   splits the segment at the cursor (at the start of a non-empty segment the new, empty one goes before it, so the
 *   text keeps its key), for the app to bind; the segments a transaction made; the effects undoing a person's move,
 *   for the history the app composes in (CodeMirror's `invertedEffects.of(inverse)`); laying a segment in after
 *   another (first, with none), taking one out and moving one before or after another, each from elsewhere and kept
 *   out of undo; and the person's move (a drag's Reorder), undone like their other changes, answering whether it moved
 */
function segments({ edit, extensions = [], initial, key: keyOf, parent, text }) {
  made += 1
  const prefix = `${String(made)}:`
  let count = 0

  /**
   * What is known of each segment's text elsewhere
   * @typedef {{ port: Text, unwatch: () => void, confirmed: string, pending: Pending[], scheduled: boolean }} Held
   */
  /** @type {Map<K, Held>} */
  const held = new Map()

  /** @type {EditorView | undefined} */
  let shown = undefined

  /**
   * A segment's port, opened the first time the segment comes in
   * @param {K} key - The segment
   * @returns {Held} What is known of its text
   */
  const open = (key) => {
    const known = held.get(key)
    if (known !== undefined) {
      return known
    }
    const port = text(key)
    /** @type {Held} */
    const each = { confirmed: port.get().text, pending: [], port, scheduled: false, unwatch: () => undefined }
    held.set(key, each)
    each.unwatch = port.watch(() => {
      if (!each.scheduled) {
        each.scheduled = true
        queueMicrotask(() => {
          each.scheduled = false
          if (held.get(key) === each) {
            receive(key)
          }
        })
      }
    })
    return each
  }

  /** @type {Mark<K>[]} */
  const start = []
  let at = -1
  for (const key of initial) {
    start.push({ at, key })
    at += open(key).confirmed.length + 1
  }
  if (start.length === 0) {
    const key = keyOf()
    open(key)
    start.push({ at: -1, key })
  }

  /**
   * A new line break at `at`, in the document after the transaction carrying it, starting segment `key`, split off
   * `from` or laid in (`from` none); with `before`, the new segment is the one before it, and the segment it split keeps
   * the text after
   * @type {import('@codemirror/state').StateEffectType<Readonly<{ at: number, key: K, before: boolean, from: K | undefined }>>}
   */
  const splitAt = StateEffect.define({ map: (value, changes) => ({ ...value, at: changes.mapPos(value.at, -1) }) })

  /** @type {import('@codemirror/state').StateEffectType<K>} */
  const take = StateEffect.define()

  /**
   * The segments' keys in their order after the transaction carrying it, which moved texts and changed none
   * @type {import('@codemirror/state').StateEffectType<readonly K[]>}
   */
  const arranged = StateEffect.define()

  /**
   * The marks, and the segments joins took out, kept for an undo, at where their line break was
   * @typedef {Readonly<{ marks: readonly Mark<K>[], joined: readonly Mark<K>[] }>} Tracked
   */
  const field = StateField.define({
    /** @returns {Tracked} The marks it starts with */
    create: () => ({ joined: [], marks: start }),
    /**
     * @param {Tracked} value - The marks before
     * @param {Transaction} transaction - The transaction
     * @returns {Tracked} The marks after
     */
    update(value, transaction) {
      if (!transaction.docChanged && transaction.effects.length === 0) {
        return value
      }
      const { changes } = transaction
      /** @type {Mark<K>[]} */
      const marks = []
      /** @type {Mark<K>[]} */
      const joined = value.joined.map((each) => ({ at: changes.mapPos(each.at, -1), key: each.key }))
      /** @type {Mark<K>[]} */
      const joinedNow = []
      for (const mark of value.marks) {
        const now = mark.at < 0 ? mark.at : moved(changes, mark.at)
        if (now === undefined) {
          joinedNow.push({ at: changes.mapPos(mark.at, -1), key: mark.key })
        } else {
          marks.push({ at: now, key: mark.key })
        }
      }
      if (transaction.isUserEvent('undo') || transaction.isUserEvent('redo')) {
        changes.iterChanges((_fromA, _toA, fromB, toB, inserted) => {
          const breaks = [...inserted.toString().matchAll(/\n/gu)].map((found) => fromB + found.index)
          for (const back of joined.filter((each) => each.at >= fromB && each.at <= toB)) {
            const pos = breaks.shift()
            if (pos === undefined) {
              break
            }
            joined.splice(joined.indexOf(back), 1)
            marks.push({ at: pos, key: back.key })
          }
        })
      }
      const doc = transaction.newDoc
      for (const effect of transaction.effects) {
        if (effect.is(splitAt)) {
          const pos = effect.value.at
          if (doc.sliceString(pos, pos + 1) !== '\n' || marks.some((mark) => mark.at === pos)) {
            continue
          }
          const owner = effect.value.before ? ownerOf(marks, pos) : undefined
          if (owner === undefined) {
            marks.push({ at: pos, key: effect.value.key })
          } else {
            marks.splice(marks.indexOf(owner), 1, { at: owner.at, key: effect.value.key }, { at: pos, key: owner.key })
          }
        } else if (effect.is(arranged)) {
          const was = transaction.startState.doc.length
          const lengths = new Map(
            value.marks.map((mark, index) => [mark.key, (value.marks[index + 1]?.at ?? was) - mark.at - 1]),
          )
          marks.length = 0
          let next = -1
          for (const key of effect.value) {
            marks.push({ at: next, key })
            next += (lengths.get(key) ?? 0) + 1
          }
          const kept = new Set(effect.value)
          joinedNow.splice(0, joinedNow.length, ...joinedNow.filter((each) => !kept.has(each.key)))
        } else if (effect.is(take)) {
          const index = marks.findIndex((mark) => mark.key === effect.value)
          const taken = marks[index]
          if (taken === undefined) {
            const gone = joinedNow.findIndex((each) => each.key === effect.value)
            if (gone !== -1) {
              joinedNow.splice(gone, 1)
            }
          } else if (taken.at < 0) {
            const next = joinedNow.shift()
            if (next !== undefined) {
              marks.splice(index, 1, { at: -1, key: next.key })
            }
          } else {
            marks.splice(index, 1)
          }
        }
      }
      marks.sort((a, b) => a.at - b.at)
      return { joined: [...joined, ...joinedNow].slice(-KEPT), marks }
    },
  })

  /** @type {(state: EditorState) => Segment<K>[]} */
  const of = (state) => {
    const { marks } = state.field(field)
    return marks.map((mark, index) => ({
      from: mark.at + 1,
      key: mark.key,
      to: marks[index + 1]?.at ?? state.doc.length,
    }))
  }

  const lines = EditorView.decorations.compute([field, 'doc'], (state) =>
    Decoration.set(
      of(state).map((each) =>
        Decoration.line({ attributes: { 'data-segment': each.from === each.to ? 'empty' : '' } }).range(each.from),
      ),
      true,
    ),
  )

  /**
   * Hands on an edit to a segment
   * @param {K} key - The segment
   * @param {ChangeSet} changes - The edit, in its text
   * @returns {void}
   */
  const handOn = (key, changes) => {
    const each = open(key)
    if (changes.empty) {
      return
    }
    count += 1
    const id = `${prefix}${String(count)}`
    each.pending.push({ changes, id })
    edit(key, replacementsOf(changes), id)
  }

  /**
   * Hands on what a transaction of the person's did to each segment it touched
   * @param {Transaction} transaction - The transaction
   * @returns {void}
   */
  const edited = (transaction) => {
    const before = of(transaction.startState)
    const was = new Map(before.map((each) => [each.key, each]))
    /** @type {Set<K>} */
    const touched = new Set()
    transaction.changes.iterChanges((fromA, toA) => {
      for (const each of before) {
        if (each.from <= toA && fromA <= each.to) {
          touched.add(each.key)
        }
      }
    })
    for (const segment of of(transaction.state)) {
      const old = was.get(segment.key)
      if (old !== undefined && !touched.has(segment.key)) {
        continue
      }
      const now = transaction.state.sliceDoc(segment.from, segment.to)
      const changes =
        (old === undefined ? undefined : within(transaction, old, now)) ?? changeBetween(expected(segment.key), now)
      handOn(segment.key, changes)
    }
  }

  /**
   * A segment's text as this editor has it: as elsewhere, with every edit not included yet over it
   * @param {K} key - The segment
   * @returns {string} The text
   */
  const expected = (key) => {
    const each = open(key)
    let shownText = view.state.toText(each.confirmed)
    for (const pending of each.pending) {
      shownText = pending.changes.apply(shownText)
    }
    return shownText.toString()
  }

  /** Lets go of the ports of segments neither in the document nor kept for an undo */
  const release = () => {
    if (shown === undefined) {
      return
    }
    const { joined, marks } = shown.state.field(field)
    const live = new Set([...marks, ...joined].map((mark) => mark.key))
    for (const [key, each] of held) {
      if (!live.has(key)) {
        each.unwatch()
        held.delete(key)
      }
    }
  }

  const quiet = [elsewhere.of(true), Transaction.addToHistory.of(false)]

  const view = new EditorView({
    parent,
    state: EditorState.create({
      doc: initial.map((key) => held.get(key)?.confirmed ?? '').join('\n'),
      extensions: [
        field,
        lines,
        EditorView.updateListener.of((update) => {
          for (const transaction of update.transactions) {
            if (transaction.docChanged && !fromElsewhere(transaction)) {
              edited(transaction)
            }
          }
          release()
        }),
        topLayerTooltips(parent.ownerDocument),
        extensions,
      ],
    }),
  })
  shown = view

  /**
   * Lays a text heard from elsewhere into its segment
   * @param {K} key - The segment
   * @returns {void}
   */
  function receive(key) {
    const each = open(key)
    const { other, pending } = rebase(each.confirmed, each.pending, each.port.get(), (doc) => view.state.toText(doc))
    each.pending = pending
    each.confirmed = each.port.get().text
    const segment = of(view.state).find((one) => one.key === key)
    if (other.empty || segment === undefined) {
      return
    }
    /** @type {{ from: number, to: number, insert: string }[]} */
    const changes = []
    other.iterChanges((from, to, _fromB, _toB, inserted) => {
      changes.push({ from: segment.from + from, insert: inserted.toString(), to: segment.from + to })
    })
    view.dispatch({ annotations: quiet, changes })
  }

  /**
   * Moves a segment before or after another in one transaction, a selection in it going with it
   * @param {K} key - The segment
   * @param {K} target - Next to which
   * @param {boolean} after - After it
   * @param {boolean} laidIn - Whether it lays in a move made elsewhere, kept out of undo, rather than the person's
   * @returns {boolean} Whether both are segments
   */
  const arrange = (key, target, after, laidIn) => {
    const all = of(view.state)
    const index = all.findIndex((each) => each.key === key)
    const moving = all[index]
    const onto = all.find((each) => each.key === target)
    if (moving === undefined || onto === undefined) {
      return false
    }
    const order = all.map((each) => each.key).filter((each) => each !== key)
    order.splice(order.indexOf(target) + (after ? 1 : 0), 0, key)
    if (key === target || order.every((each, rank) => each === all[rank]?.key)) {
      return true
    }
    const carried = view.state.sliceDoc(moving.from, moving.to)
    const changes = view.state.changes([
      index === 0 ? { from: moving.from, to: moving.to + 1 } : { from: moving.from - 1, to: moving.to },
      after ? { from: onto.to, insert: `\n${carried}` } : { from: onto.from, insert: `${carried}\n` },
    ])
    let landed = 0
    for (const each of order) {
      if (each === key) {
        break
      }
      const segment = all.find((other) => other.key === each)
      landed += (segment === undefined ? 0 : segment.to - segment.from) + 1
    }
    /** @type {(pos: number, assoc: number) => number} */
    const place = (pos, assoc) =>
      pos >= moving.from && pos <= moving.to ? landed + pos - moving.from : changes.mapPos(pos, assoc)
    const { selection } = view.state
    view.dispatch({
      changes,
      effects: arranged.of(order),
      selection: EditorSelection.create(
        selection.ranges.map((range) => EditorSelection.range(place(range.anchor, -1), place(range.head, 1))),
        selection.mainIndex,
      ),
      ...(laidIn ? { annotations: quiet } : { userEvent: 'move' }),
    })
    return true
  }

  /** @type {import('@codemirror/view').Command} */
  const split = (target) => {
    const { state } = target
    const range = state.selection.main
    const owner = of(state).find((each) => each.from <= range.from && range.from <= each.to)
    const before = owner !== undefined && range.empty && range.from === owner.from && owner.to > owner.from
    target.dispatch({
      changes: { from: range.from, insert: '\n', to: range.to },
      effects: splitAt.of({ at: range.from, before, from: owner?.key, key: keyOf() }),
      scrollIntoView: true,
      selection: EditorSelection.cursor(range.from + 1),
      userEvent: 'input',
    })
    return true
  }

  return {
    insert(after, key) {
      const { confirmed } = open(key)
      const prior = after === undefined ? undefined : of(view.state).find((each) => each.key === after)
      if (prior === undefined) {
        view.dispatch({
          annotations: quiet,
          changes: { from: 0, insert: `${confirmed}\n` },
          effects: splitAt.of({ at: confirmed.length, before: true, from: undefined, key }),
        })
        return
      }
      view.dispatch({
        annotations: quiet,
        changes: { from: prior.to, insert: `\n${confirmed}` },
        effects: splitAt.of({ at: prior.to, before: false, from: undefined, key }),
      })
    },
    inverse(transaction) {
      const order = transaction.effects.some((effect) => effect.is(arranged))
        ? of(transaction.startState).map((each) => each.key)
        : undefined
      return order === undefined ? [] : [arranged.of(order)]
    },
    made(transaction) {
      return transaction.effects.flatMap((effect) =>
        effect.is(splitAt) ? [{ from: effect.value.from, key: effect.value.key }] : [],
      )
    },
    move(key, target, after) {
      arrange(key, target, after, true)
    },
    of,
    remove(key) {
      const all = of(view.state)
      const index = all.findIndex((each) => each.key === key)
      const segment = all[index]
      if (segment === undefined || all.length === 1) {
        return
      }
      const from = index === 0 ? segment.from : segment.from - 1
      const to = index === 0 ? segment.to + 1 : segment.to
      view.dispatch({ annotations: quiet, changes: { from, insert: '', to }, effects: take.of(key) })
    },
    reorder: (key, target, after) => arrange(key, target, after, false),
    split,
    stop() {
      for (const each of held.values()) {
        each.unwatch()
      }
      held.clear()
      view.destroy()
    },
    view,
  }
}

export { segments }
