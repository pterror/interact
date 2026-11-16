/**
 * The adapter for Solid 1.8+: `solid-js`, with its DOM runtime `solid-js/web`.
 */

import {
  batch,
  createComponent,
  createComputed,
  createEffect,
  createMemo,
  createRenderEffect,
  createSignal,
  getListener,
  mapArray,
  mergeProps,
  on,
  onCleanup,
  onMount,
  untrack,
} from 'solid-js'
import { Dynamic, isServer } from 'solid-js/web'

/** @import { Adapter } from '../adapter.js' */

/** @type {Adapter} */
const adapter = {
  batch: (run) => {
    batch(run)
  },
  contents: (list, map) =>
    isServer ? () => list().map((value, index) => map(value, () => index)) : mapArray(list, map),
  effect: (compute, apply, defer) => {
    createEffect(on(compute, apply, { defer }))
  },
  element: (tag, ...sources) => createComponent(Dynamic, mergeProps(...sources, { component: tag })),
  isServer,
  memo: (compute, equals) => createMemo(compute, undefined, { equals }),
  part: (component, attributes, rest, part) => createComponent(component, mergeProps(attributes, rest, { part })),
  renderEffect: (compute, apply, defer) => {
    createRenderEffect(on(compute, apply, { defer }))
  },
  settled: (run) => {
    onMount(() => {
      const stop = run()
      if (stop !== undefined) {
        onCleanup(stop)
      }
    })
  },
  signal: (value) => {
    const [get, set] = createSignal(value)
    return [
      get,
      (next) => {
        set(() => next)
      },
    ]
  },
  tracking: () => getListener() !== null,
  watch: (compute, apply) => {
    createComputed(() => {
      const value = compute()
      untrack(() => {
        apply(value)
      })
    })
  },
}

export { adapter }
