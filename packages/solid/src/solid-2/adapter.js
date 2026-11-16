/**
 * The adapter for Solid 2: `solid-js` 2, with its DOM runtime `@solidjs/web`.
 */

import { dynamic, isServer } from '@solidjs/web'
import {
  createComponent,
  createEffect,
  createMemo,
  createRenderEffect,
  createSignal,
  getObserver,
  mapArray,
  merge,
  onSettled,
  untrack,
} from 'solid-js'

/** @import { Adapter } from '../adapter.js' */

/**
 * An effect's apply phase with its reads marked untracked: Solid 2 warns of a read in an apply phase that isn't
 * @template T
 * @param {(value: T) => void} apply - The apply phase
 * @returns {(value: T) => void} It, marked
 */
function applying(apply) {
  return (value) => {
    untrack(() => {
      apply(value)
    })
  }
}

/**
 * A signal holding any value as it is, which may be written from anywhere
 * @template T
 * @param {T} value - Its value at first
 * @returns {readonly [() => T, (value: T) => void]} Reading it, and writing it
 */
function signal(value) {
  /** @type {Readonly<{ value: T }>} */
  const box = { value }
  // Boxed: a function given to createSignal is a computation, owned by (and disposed with) the owner it is made in
  const [get, set] = createSignal(box, { equals: (last, next) => last.value === next.value, ownedWrite: true })
  return [
    () => get().value,
    (next) => {
      set({ value: next })
    },
  ]
}

/** @type {Adapter} */
const adapter = {
  batch: (run) => {
    run()
  },
  contents: (list, map) => mapArray(list, map),
  effect: (compute, apply, defer) => {
    createEffect(compute, applying(apply), { defer })
  },
  element: (tag, ...sources) =>
    createComponent(
      dynamic(() => tag, { static: true }),
      merge(...sources),
    ),
  isServer,
  memo: (compute, equals) => createMemo(compute, { equals }),
  part: (component, attributes, rest, part) => createComponent(component, merge(attributes, rest, { part })),
  renderEffect: (compute, apply, defer) => {
    createRenderEffect(compute, applying(apply), { defer })
  },
  settled: (run) => {
    onSettled(run)
  },
  signal,
  tracking: () => getObserver() !== null,
  watch: (compute, apply) => {
    createRenderEffect(compute, applying(apply))
  },
}

export { adapter }
