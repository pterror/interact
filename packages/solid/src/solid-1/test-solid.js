/**
 * What the package's tests run on with Solid 1: its entry and adapter, and the Solid 1 spelling of what the tests do
 * that Solid 2 spells otherwise. Its counterpart for Solid 2 is `../solid-2/test-solid.js`; `#test-solid` is one or the other,
 * by the `solid-2` condition.
 */

import { children, createComponent, splitProps, untrack } from 'solid-js'

/** @import { Context } from 'solid-js' */
/** @import { Props, SolidElement } from '../adapter.js' */

export * from '../index.js'
export { adapter } from './adapter.js'
export { hydrate, insert, renderToString } from 'solid-js/web'
export { batch, mergeProps as merge } from 'solid-js'

/**
 * The conditions a process running the tests on this version of Solid is given, beside the platform's
 * @type {readonly string[]}
 */
const CONDITIONS = []

/**
 * Whether an item's effects, made outside a Solid update, run once its element is in place: Solid 1 runs them at the
 * end of making it, before
 */
const SETTLES_IN_PLACE = false

/**
 * Applies the writes made so far: Solid 1 applies each as it is made
 * @returns {void}
 */
function flush() {
  // Every write is applied already
}

/**
 * Props but some
 * @param {Props} props - The props
 * @param {readonly string[]} keys - The props left out
 * @returns {Props} The rest, followed as they change
 */
function omit(props, keys) {
  return splitProps(props, [...keys])[1]
}

/**
 * Contents drawn in a context's provider, now
 * @template T
 * @param {Readonly<Pick<Context<T>, 'Provider'>>} context - The context
 * @param {T} value - Its value
 * @param {() => SolidElement} contents - Draws the contents
 * @returns {SolidElement} What they draw
 */
function provide(context, value, contents) {
  const drawn = children(() =>
    createComponent(context.Provider, {
      get children() {
        return contents()
      },
      value,
    }),
  )
  return untrack(drawn)
}

export { CONDITIONS, flush, omit, provide, SETTLES_IN_PLACE }
