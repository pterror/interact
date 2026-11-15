/**
 * The host side of a widget: holds its state and props, delivers inputs, and carries out `wake` with the platform's
 * timer. Everything else the widget's effects ask for goes to `effect`: the renderer's effects (focus, preventing a
 * default, announcing) to the renderer, the rest (asks, changes, moves) on to the app. Not pure: this is where the
 * clock and the timers are. Time is `performance.now()`, the clock DOM events' `timeStamp` uses.
 */

import { deliver, resolve, start } from './compose.js'

/** @import { AnyWidget, Node, Out } from './compose.js' */
/** @import { Path } from './contract.js' */

/**
 * A widget being run
 * @typedef {Readonly<{
 *   dispatch: (owner: Path, input: unknown) => readonly Out[],
 *   setProps: (props: unknown) => void,
 *   state: () => unknown,
 *   tree: () => Node,
 *   watch: (listener: () => void) => () => void,
 *   begin: () => void,
 *   stop: () => void,
 * }>} Host
 */

/**
 * Runs a widget. It starts at once; the effects of starting are carried out by `begin`, once whoever draws it is
 * listening
 * @param {Readonly<{ widget: AnyWidget, props: unknown, effect: (out: Out, host: Host) => void }>} options - The
 *   widget, its props, and what carries out its effects (all but `wake`)
 * @returns {Host} The running widget
 */
function host({ widget, props, effect }) {
  let [state, pending] = start(widget, props)
  let current = props
  /** @type {Set<() => void>} */
  const listeners = new Set()
  /** @type {Set<ReturnType<typeof setTimeout>>} */
  const timers = new Set()
  let stopped = false

  /**
   * Carries out effects, in order
   * @param {readonly Out[]} outs - The effects
   * @returns {void}
   */
  const carry = (outs) => {
    for (const out of outs) {
      const { effect: made } = out
      if (typeof made === 'object' && made !== null && 'type' in made && made.type === 'wake' && 'at' in made) {
        const at = Number(made.at)
        const timer = setTimeout(
          () => {
            timers.delete(timer)
            running.dispatch(out.from, { now: performance.now(), type: 'time' })
          },
          Math.max(0, at - performance.now()),
        )
        timers.add(timer)
      } else {
        effect(out, running)
      }
    }
  }

  /**
   * Takes a new state and tells the listeners
   * @param {unknown} next - The state
   * @returns {void}
   */
  const take = (next) => {
    state = next
    for (const listener of listeners) {
      listener()
    }
  }

  /** @type {Host} */
  const running = {
    begin: () => {
      const first = pending
      pending = []
      carry(first)
    },
    dispatch: (owner, input) => {
      if (stopped) {
        return []
      }
      const [next, outs] = deliver(widget, state, owner, input)
      take(next)
      carry(outs)
      return outs
    },
    setProps: (next) => {
      current = next
      running.dispatch([], { props: next, type: 'props' })
    },
    state: () => state,
    stop: () => {
      stopped = true
      for (const timer of timers) {
        clearTimeout(timer)
      }
      timers.clear()
      listeners.clear()
    },
    tree: () => resolve(widget, state, current),
    watch: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
  return running
}

export { host }
