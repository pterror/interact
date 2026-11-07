/**
 * @import { ItemSource } from '@interact/core/source'
 * @import { EffectType, Extension } from '@interact/core/state'
 * @import { ActiveItem } from './active-item.js'
 */

import { defineEffect, inputHandler, precedence } from '@interact/core'
import { ownElement, viewPlugin } from '@interact/dom'

import { readNow } from './active-item.js'

/**
 * The active item following the pointer: the item the pointer moves over becomes active, unless focus passes over it;
 * with `focus`, focus comes to the list too, unless it is there. Moving there doesn't scroll, since the item is under
 * the pointer. It hears the pointer at `low`, so an extension can take a move before it.
 * @template T, R
 * @template {ItemSource<T>} S
 * @param {ActiveItem<T, R, S>} current - The list's active item
 * @param {Readonly<{ focus?: boolean | undefined }>} [options] - Whether focus comes to the list
 * @returns {Extension} The extension
 */
function followPointer(current, options = {}) {
  const { list } = current
  const focus = options.focus ?? false
  /** @type {EffectType<undefined>} */
  const followed = defineEffect()
  const page = viewPlugin((_store, root) => ({
    rendered: (transactions) => {
      if (transactions.some((transaction) => transaction.effectsOf(followed).length > 0)) {
        ownElement(root, '[data-list]')?.focus({ preventScroll: true })
      }
    },
  }))
  return [
    current,
    precedence(
      'low',
      inputHandler.of((input, store) => {
        if (!input.is(list.hover)) {
          return false
        }
        const { focused, position } = input.value
        const { state } = store
        const item = readNow(list.listOf(state), position)
        if (item === undefined || state.facet(current.skip)(item.item)) {
          return false
        }
        const moves =
          current.positionIn(state) === position
            ? []
            : [current.moved.of({ entering: false, shift: false, to: position })]
        const effects = [...moves, ...(focus && !focused ? [followed.of(undefined)] : [])]
        if (effects.length > 0) {
          store.dispatch({ effects })
        }
        return true
      }),
    ),
    focus ? page : [],
  ]
}

export { followPointer }
