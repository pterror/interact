/**
 * @import { Listbox } from './listbox.js'
 */

import { landing } from './landing.js'

/**
 * Where the active option goes as a combobox's list opens: nowhere, the option chosen (or nowhere), the option chosen
 * or else the first, the first, or the last.
 * @typedef {'none' | 'value' | 'value-or-first' | 'first' | 'last'} OpenAt
 */

const NONE = 0
const ONE = 1
const FORWARD = 1
const BACK = -1

/**
 * Where the option chosen is among a list's options, when its source can say: without `positionOf` it can't, and the
 * option chosen can't be found without reading every option.
 * @template T, F
 * @param {Listbox<T, F>} list - The list
 * @param {T | undefined} value - The option chosen
 * @returns {Promise<number | undefined>} Its position, if known
 */
async function positionOfValue(list, value) {
  const { source } = list.items
  return value === undefined || source === undefined ? undefined : source.positionOf?.(source.key(value))
}

/**
 * Where the active option goes as a combobox's list opens, never on an option focus passes over.
 * @template T, F
 * @param {Listbox<T, F>} list - The list
 * @param {T | undefined} value - The option chosen
 * @param {OpenAt} at - Where it is asked to go
 * @returns {Promise<number | undefined>} The position, if any
 */
async function landingFor(list, value, at) {
  if (at === 'none') {
    return undefined
  }
  if (at === 'first' || at === 'last') {
    return at === 'first' ? landing(list, NONE, FORWARD) : landing(list, list.items.count - ONE, BACK)
  }
  const chosen = await positionOfValue(list, value)
  return chosen ?? (at === 'value-or-first' ? landing(list, NONE, FORWARD) : undefined)
}

export { landingFor }
