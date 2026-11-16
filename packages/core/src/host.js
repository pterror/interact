/**
 * The host side of a widget: holds its state and props, delivers inputs, and carries out what needs the platform.
 * `wake` is the platform's timer; an `ask` or `move` about a source the app passed is answered from that source (its
 * `answer` or `found` back to the widget that asked, `confirmed` or `refused` for a move, `changed` to every widget
 * that asked about it when it changes). Moves go to a source one at a time, in the order they were made, since each was made
 * against the order the ones before it left. Everything else goes to `effect`: the renderer's effects (focus, preventing a default,
 * announcing) to the renderer, the rest on to the app. Host events pass through `translate` first, which is where keys
 * are rebound: it gives the standard key a widget expects. Not pure: this is where the clock, timers and sources are.
 * Time is `performance.now()`, the clock DOM events' `timeStamp` uses.
 */

import { deliver, isRecord, resolve, start, typeOf } from './compose.js'

/** @import { AnyGenerated, AnyWidget, Node, Out } from './compose.js' */
/** @import { Key, Path } from './contract.js' */

/**
 * A window of a collection: the keys from rank `from`, and how many items there are
 * @typedef {Readonly<{ from: number, keys: readonly Key[], count: number }>} Window
 */

/**
 * A collection the host holds: windows read from it (now or later), moves made in it (`true` once made, `false` if
 * refused), and hearing it change; optionally an item's text, for each key it has answered with (what the item is
 * named and drawn as by default), and finding a key by the start of its text (the first from `at` on, after it when
 * `next`, wrapping round, ignoring case; `null` for none), now or later. A source that can't find answers every find
 * with none
 * @typedef {Readonly<{
 *   read: (question: Readonly<{ ranks: readonly [number, number] }> | Readonly<{ locate: Key, rows: number }>) => Window | Promise<Window>,
 *   move: (item: Key, target: Key, after: boolean) => boolean | Promise<boolean>,
 *   watch: (listener: () => void) => () => void,
 *   text?: (key: Key) => string,
 *   find?: (prefix: string, at: Key | null, next: boolean) => Key | null | Promise<Key | null>,
 * }>} Source
 */

/**
 * A widget being run. `state` is its state now; the next input may change that state in place, so it is read, not
 * kept
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
 * What runs a widget: the widget and its props; optionally the app's effects, its collections by source name, and its
 * key bindings
 * @typedef {Readonly<{
 *   widget: AnyWidget | AnyGenerated,
 *   props: unknown,
 *   effect?: (out: Out, host: Host) => void,
 *   sources?: Readonly<{ [name: string]: Source }>,
 *   translate?: (input: Readonly<{ [field: string]: unknown }>) => Readonly<{ [field: string]: unknown }> | null,
 * }>} HostOptions
 */

/**
 * Finds a key by the start of its text in keys in memory, as a source finds it
 * @param {readonly Key[]} keys - The keys
 * @param {(key: Key) => string} textOf - Each one's text
 * @param {string} prefix - What its text starts with, ignoring case
 * @param {Key | null} at - The key to look from, or `null` for the first
 * @param {boolean} next - Whether to look from the key after it
 * @returns {Key | null} The first key found, wrapping round, or `null`
 */
function findIn(keys, textOf, prefix, at, next) {
  const wanted = prefix.toLowerCase()
  const index = at === null ? -1 : keys.indexOf(at)
  const first = index === -1 ? 0 : index + (next ? 1 : 0)
  for (let step = 0; step < keys.length; step += 1) {
    const key = keys[(first + step) % keys.length]
    if (key !== undefined && textOf(key).toLowerCase().startsWith(wanted)) {
      return key
    }
  }
  return null
}

/**
 * A collection in memory, as a source: its keys in order, which a move reorders, and each one's text
 * @param {readonly Key[]} initial - The keys
 * @param {(key: Key) => string} textOf - An item's text (by default its key as text)
 * @returns {Source & Readonly<{ keys: () => readonly Key[], set: (keys: readonly Key[]) => void, text: (key: Key) => string }>}
 *   The source, and its keys to read and set
 */
function arraySource(initial, textOf = String) {
  let keys = initial
  /** @type {Set<() => void>} */
  const listeners = new Set()
  /**
   * Takes new keys and tells the listeners
   * @param {readonly Key[]} next - The keys
   * @returns {void}
   */
  const set = (next) => {
    keys = next
    for (const listener of listeners) {
      listener()
    }
  }
  return {
    find: (prefix, at, next) => findIn(keys, textOf, prefix, at, next),
    keys: () => keys,
    move: (item, target, after) => {
      if (!keys.includes(item) || !keys.includes(target) || item === target) {
        return false
      }
      const without = keys.filter((key) => key !== item)
      const at = without.indexOf(target) + (after ? 1 : 0)
      set([...without.slice(0, at), item, ...without.slice(at)])
      return true
    },
    read: (question) => {
      const rows = 'rows' in question ? question.rows : 0
      const [from, to] =
        'ranks' in question
          ? question.ranks
          : [
              Math.max(0, keys.indexOf(question.locate) - Math.floor(rows / 2)),
              Math.max(0, keys.indexOf(question.locate) - Math.floor(rows / 2)) + rows,
            ]
      return { count: keys.length, from, keys: keys.slice(from, to) }
    },
    set,
    text: textOf,
    watch: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

/**
 * Runs a widget. It starts at once; the effects of starting are carried out by `begin`, once whoever draws it is
 * listening
 * @param {HostOptions} options - The widget, its props, and how the app takes part
 * @returns {Host} The running widget
 */
function host(options) {
  const { widget } = options
  const sources = options.sources ?? {}
  let [state, pending] = start(widget, options.props)
  let current = options.props
  /** @type {Set<() => void>} */
  const listeners = new Set()
  /** @type {Set<ReturnType<typeof setTimeout>>} */
  const timers = new Set()
  /** @type {Map<string, Map<string, Path>>} */
  const askers = new Map()
  /** @type {Map<string, Promise<boolean>>} */
  const moving = new Map()
  let stopped = false

  /**
   * Delivers an input later, unless the widget has stopped by then
   * @param {Path} owner - Where it goes
   * @param {Promise<unknown>} later - The input, when it comes
   * @returns {void}
   */
  const deliverLater = (owner, later) => {
    later.then((input) => running.dispatch(owner, input)).catch(() => [])
  }

  /**
   * Answers an ask or carries out a move from a source the app passed
   * @param {Out} out - The effect
   * @returns {boolean} Whether a source took it
   */
  const fromSource = (out) => {
    const { effect } = out
    if (!isRecord(effect) || typeof effect['source'] !== 'string') {
      return false
    }
    const name = effect['source']
    const source = sources[name]
    if (source === undefined) {
      return false
    }
    const id = effect['id']
    if (typeOf(effect) === 'ask') {
      const known = askers.get(name) ?? askersOf()
      known.set(out.from.join('/'), out.from)
      askers.set(name, known)
      if (typeof effect['find'] === 'string') {
        const at = effect['at'] === null ? null : keyOf(effect['at'])
        const found = Promise.resolve(source.find?.(effect['find'], at, effect['next'] === true) ?? null)
        deliverLater(
          out.from,
          found.then((key) => ({ id, key, type: 'found' })),
        )
        return true
      }
      const ranks = effect['ranks']
      /** @type {Parameters<Source['read']>[0]} */
      const question = Array.isArray(ranks)
        ? { ranks: [Number(ranks[0]), Number(ranks[1])] }
        : { locate: keyOf(effect['locate']), rows: Number(effect['rows']) }
      const read = Promise.resolve(source.read(question))
      deliverLater(
        out.from,
        read.then((window) => ({ ...window, id, type: 'answer' })),
      )
      return true
    }
    if (typeOf(effect) === 'move') {
      const before = moving.get(name) ?? Promise.resolve(true)
      const made = before.then(async () =>
        source.move(keyOf(effect['item']), keyOf(effect['target']), effect['after'] === true),
      )
      moving.set(
        name,
        made.catch(() => false),
      )
      deliverLater(
        out.from,
        made.then(
          (done) => ({ id, type: done ? 'confirmed' : 'refused' }),
          () => ({ id, type: 'refused' }),
        ),
      )
      return true
    }
    return false
  }

  /**
   * Carries out effects, in order
   * @param {readonly Out[]} outs - The effects
   * @returns {void}
   */
  const carry = (outs) => {
    for (const out of outs) {
      const { effect } = out
      if (isRecord(effect) && typeOf(effect) === 'wake') {
        const timer = setTimeout(
          () => {
            timers.delete(timer)
            running.dispatch(out.from, { now: performance.now(), type: 'time' })
          },
          Math.max(0, Number(effect['at']) - performance.now()),
        )
        timers.add(timer)
      } else if (!fromSource(out)) {
        options.effect?.(out, running)
      }
    }
  }

  /** @type {(() => void)[]} */
  const unwatch = []
  for (const [name, source] of Object.entries(sources)) {
    unwatch.push(
      source.watch(() => {
        for (const owner of askers.get(name)?.values() ?? []) {
          running.dispatch(owner, { type: 'changed' })
        }
      }),
    )
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
      const translated =
        isRecord(input) && 'part' in input && options.translate !== undefined ? options.translate(input) : input
      if (translated === null) {
        return []
      }
      const [next, outs] = deliver(widget, state, owner, translated)
      state = next
      for (const listener of listeners) {
        listener()
      }
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
      for (const stop of unwatch) {
        stop()
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

/**
 * The widgets that asked about one source, by path
 * @returns {Map<string, Path>} None yet
 */
function askersOf() {
  return new Map()
}

/**
 * A field of an effect as a key
 * @param {unknown} value - The field
 * @returns {Key} The key, or `''` if it is none
 */
function keyOf(value) {
  return typeof value === 'string' || typeof value === 'number' ? value : ''
}

export { arraySource, findIn, host }
