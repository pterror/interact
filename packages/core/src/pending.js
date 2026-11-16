/**
 * A value a widget changes, by the contract's one rule: what it shows is the app's value plus the widget's own
 * changes not yet settled. A change shows at once and is pending until the app's value is the change's (confirmed:
 * it and every change before it are dropped) or the app refuses it (dropped alone). Uncontrolled (the app passes no
 * value), the widget's change is the value at once and nothing is pending. The value is a scalar, compared with `===`.
 */

/** @import { i53, Key } from './contract.js' */

/**
 * @template {Key | boolean | null} T
 * @typedef {Readonly<{
 *   controlled: boolean,
 *   app: T,
 *   changes: readonly Readonly<{ id: i53, value: T }>[],
 *   next: i53,
 * }>} Pending
 */

/**
 * A value as the app gives it, or keeps it to the widget
 * @template {Key | boolean | null} T
 * @param {boolean} controlled - Whether the app gives the value
 * @param {T} value - The value
 * @returns {Pending<T>} The value, nothing pending
 */
function pending(controlled, value) {
  return { app: value, changes: [], controlled, next: 1 }
}

/**
 * What the widget shows: its latest pending change, or the app's value
 * @template {Key | boolean | null} T
 * @param {Pending<T>} held - The value
 * @returns {T} What shows
 */
function shown(held) {
  const last = held.changes.at(-1)
  return last === undefined ? held.app : last.value
}

/**
 * The widget changes the value
 * @template {Key | boolean | null} T
 * @param {Pending<T>} held - The value
 * @param {T} value - The new value
 * @returns {readonly [Pending<T>, i53]} The value after, and the change's id
 */
function change(held, value) {
  const id = held.next
  if (!held.controlled) {
    return [{ ...held, app: value, next: id + 1 }, id]
  }
  return [{ ...held, changes: [...held.changes, { id, value }], next: id + 1 }, id]
}

/**
 * The app gives its value: a pending change it confirms goes, with every change before it
 * @template {Key | boolean | null} T
 * @param {Pending<T>} held - The value
 * @param {boolean} controlled - Whether the app gives a value now
 * @param {T} value - The app's value (the widget's own, if not controlled)
 * @returns {Pending<T>} The value after
 */
function fromApp(held, controlled, value) {
  if (!controlled) {
    return { ...held, changes: [], controlled }
  }
  const confirmed = held.changes.findLastIndex((one) => one.value === value)
  return { ...held, app: value, changes: held.changes.slice(confirmed + 1), controlled }
}

/**
 * The app refuses a change: it goes, undone
 * @template {Key | boolean | null} T
 * @param {Pending<T>} held - The value
 * @param {i53} id - The change
 * @returns {Pending<T>} The value after
 */
function refuse(held, id) {
  return { ...held, changes: held.changes.filter((one) => one.id !== id) }
}

export { change, fromApp, pending, refuse, shown }
