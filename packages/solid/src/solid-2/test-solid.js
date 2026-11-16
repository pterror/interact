/**
 * What the package's tests run on with Solid 2: its entry and adapter, and the Solid 2 spelling of what the tests do
 * that Solid 1 spells otherwise. Its counterpart for Solid 1 is `../solid-1/test-solid.js`; `#test-solid` is one or the other,
 * by the `solid-2` condition.
 */

import { children, createComponent, omit as omitted, untrack } from 'solid-js'

/** @import { ContextProviderComponent } from 'solid-js' */
/** @import { Props, SolidElement } from '../adapter.js' */

export * from '../2.js'
export { adapter } from './adapter.js'
export { hydrate, insert, renderToString } from '@solidjs/web'
export { flush, merge } from 'solid-js'

/**
 * The conditions a process running the tests on this version of Solid is given, beside the platform's
 * @type {readonly string[]}
 */
const CONDITIONS = ['solid-2']

/**
 * Whether an item's effects, made outside a Solid update, run once its element is in place: Solid 2 runs them at the
 * next flush, after
 */
const SETTLES_IN_PLACE = true

/**
 * Applies the writes in `run` together: Solid 2 applies every write at the next flush
 * @param {() => void} run - Makes the writes
 * @returns {void}
 */
function batch(run) {
  run()
}

/**
 * Props but some
 * @param {Props} props - The props
 * @param {readonly string[]} keys - The props left out
 * @returns {Props} The rest, followed as they change
 */
function omit(props, keys) {
  return omitted(props, ...keys)
}

/**
 * Contents drawn in a context's provider, now
 * @template T
 * @param {ContextProviderComponent<T>} context - The context, which is its provider
 * @param {T} value - Its value
 * @param {() => SolidElement} contents - Draws the contents
 * @returns {SolidElement} What they draw
 */
function provide(context, value, contents) {
  const drawn = children(() =>
    createComponent(context, {
      get children() {
        return contents()
      },
      value,
    }),
  )
  return untrack(drawn)
}

export { batch, CONDITIONS, omit, provide, SETTLES_IN_PLACE }
