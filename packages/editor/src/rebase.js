/**
 * A text held elsewhere and the edits made to it here that it doesn't include yet: the edit that lays a newer text
 * from elsewhere over what is shown, the edits still not included rebased over it (as `@codemirror/collab` rebases).
 */

import { ChangeSet } from '@codemirror/state'

import { shared } from './shared.js'

/**
 * What identifies one edit made in an editor
 * @typedef {string} ChangeId
 */

/**
 * The text as it is elsewhere, and the latest of this editor's edits it includes (none if it includes none). Edits are
 * included in the order they were made.
 * @typedef {Readonly<{
 *   get: () => Readonly<{ text: string, includes: ChangeId | undefined }>,
 *   watch: (listener: () => void) => () => void,
 * }>} Text
 */

/**
 * One edit, handed on as it is made: replacements whose positions are all in the text before the edit
 * @typedef {(changes: readonly Readonly<{ from: number, to: number, insert: string }>[], id: ChangeId) => void} Edit
 */

/**
 * An edit made here, not yet included elsewhere
 * @typedef {Readonly<{ id: ChangeId, changes: ChangeSet }>} Pending
 */

/**
 * The replacements of a change set, in the text before it
 * @param {ChangeSet} changes - The changes
 * @returns {{ from: number, to: number, insert: string }[]} The replacements
 */
function replacementsOf(changes) {
  /** @type {{ from: number, to: number, insert: string }[]} */
  const out = []
  changes.iterChanges((from, to, _fromB, _toB, inserted) => {
    out.push({ from, insert: inserted.toString(), to })
  })
  return out
}

/**
 * The change from one text to another, as one replacement of what differs
 * @param {string} was - The first text
 * @param {string} now - The other
 * @returns {ChangeSet} The change
 */
function changeBetween(was, now) {
  const { end, start } = shared(was, now)
  if (start === was.length && start === now.length) {
    return ChangeSet.empty(was.length)
  }
  return ChangeSet.of({ from: start, insert: now.slice(start, now.length - end), to: was.length - end }, was.length)
}

/**
 * Takes in a text heard from elsewhere
 * @param {string} confirmed - The text elsewhere as last heard
 * @param {readonly Pending[]} pending - The edits made here since, in order
 * @param {Readonly<{ text: string, includes: ChangeId | undefined }>} heard - The text heard now
 * @param {(text: string) => import('@codemirror/state').Text} toText - A string as an editor's text
 * @returns {Readonly<{ other: ChangeSet, pending: Pending[] }>} The change that lays the heard text over what is
 *   shown (the text heard with every edit it doesn't include over it), and the edits it doesn't include, rebased
 */
function rebase(confirmed, pending, heard, toText) {
  const included = heard.includes === undefined ? 0 : pending.findIndex((each) => each.id === heard.includes) + 1
  let base = toText(confirmed)
  for (const each of pending.slice(0, included)) {
    base = each.changes.apply(base)
  }
  let other = changeBetween(base.toString(), heard.text)
  /** @type {Pending[]} */
  const rest = []
  for (const each of pending.slice(included)) {
    rest.push({ changes: each.changes.map(other), id: each.id })
    // oxlint-disable-next-line unicorn/no-array-callback-reference, unicorn/no-array-method-this-argument -- ChangeSet.map takes changes, not a callback
    other = other.map(each.changes, true)
  }
  return { other, pending: rest }
}

export { changeBetween, rebase, replacementsOf }
