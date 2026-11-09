/**
 * A ready-made composition for pages and simple apps: bindings as data, each string routed by what it names to the
 * table that runs it ("k" presses, "k:up" releases, "k:hold" and "k:tap" holds, "g i" sequences), each input (keys,
 * mouse, gamepad) listened to with the overlay rule, and axes read through what it returns. An app that wants more
 * wires the modules itself.
 */

import { anyOf } from './any-of.js'
import { axisParse } from './axis-parse.js'
import { axisWhen } from './axis-when.js'
import { bindingTable } from './binding-table.js'
import { holds } from './holds.js'
import { keyListen } from './key-listen.js'
import { keyPairAxis } from './key-pair-axis.js'
import { keyParse, keyQuery } from './key-parse.js'
import { looseTable } from './loose-table.js'
import { mouseAxis } from './mouse-axis.js'
import { mouseListen } from './mouse-listen.js'
import { mouseParse } from './mouse-parse.js'
import { focusInOverlay, outsideOverlay } from './overlay.js'
import { padAxis } from './pad-axis.js'
import { padButtons } from './pad-buttons.js'
import { padParse } from './pad-parse.js'
import { pads } from './pads.js'
import { presses } from './presses.js'
import { releases } from './releases.js'
import { applies } from './run-first.js'
import { scaleAxis } from './scale-axis.js'
import { sequences } from './sequences.js'
import { splitBinding } from './split-binding.js'
import { sumAxis } from './sum-axis.js'

/**
 * @typedef {Readonly<{ ctrl: boolean, alt: boolean, shift: boolean, meta: boolean }>} Modifiers
 */

/**
 * A piece of key syntax, as keyParse() and keyQuery() take it
 * @typedef {Readonly<{
 *   alias?: (name: string) => string | undefined,
 *   accepts?: (key: string, mods: Modifiers) => boolean,
 *   shifted?: (key: string) => string | undefined,
 *   lookups?: (key: string, mods: Modifiers, held: Modifiers) => readonly string[],
 *   fallback?: (key: string, held: Modifiers) => readonly string[],
 * }>} KeySyntax
 */

/**
 * A command: what triggers it through each input, what it does (returning false leaves the event to others), when it
 * applies, whether it also runs while text is typed into a field, and whether it matches whatever other modifiers are
 * held (its own still required)
 * @typedef {Readonly<{
 *   keys?: readonly string[],
 *   mouse?: readonly string[],
 *   pad?: readonly string[],
 *   run: (event: Event) => boolean | void,
 *   when?: () => boolean,
 *   typing?: boolean,
 *   anyModifiers?: boolean,
 * }>} Command
 */

/**
 * An axis: its sources, summed ("mouse:x", "-pad:ry", "keys:a/d"), and when it applies
 * @typedef {Readonly<{ axes: readonly string[], when?: () => boolean }>} Axis
 */

/** @typedef {Command | Axis} Binding */

/**
 * @typedef {Readonly<{ position: number, delta: number }>} AxisValue
 */

/**
 * @typedef {Readonly<{ index: number, axes: readonly number[],
 *   buttons: readonly Readonly<{ pressed: boolean, value: number }>[] }>} Pad
 */

/**
 * @typedef {Readonly<{ get: () => readonly Pad[], watch: (listener: () => void) => () => void }>} Pads
 */

/**
 * @template T
 * @typedef {Readonly<{ has: (value: T) => boolean, watch: (listener: (values?: readonly T[]) => void) => () => void }>}
 *   Test
 */

/**
 * Where to listen (default the window), whether in the capture phase, the key syntax on, and which binding syntax is
 * on: releases (":up"), holds (":hold", ":tap", held for `delay` ms), sequences ("g i", each step within `timeout`
 * ms); how scrolling steps (as for mouseListen()); and the pads (default a pads() of its own, made only for
 * gamepad bindings or axes)
 * @typedef {Readonly<{
 *   target?: EventTarget,
 *   capture?: boolean,
 *   syntax?: readonly KeySyntax[],
 *   releases?: boolean,
 *   holds?: boolean | Readonly<{ delay?: number }>,
 *   sequences?: boolean | Readonly<{ timeout?: number }>,
 *   wheel?: Readonly<{ step?: number, idle?: number }>,
 *   pads?: Pads,
 * }>} KeybindsOptions
 */

/**
 * What a press is looked up by
 * @typedef {Readonly<{ exact: readonly string[], bare: readonly string[], mods: Modifiers }>} Query
 */

/**
 * @typedef {Readonly<{ id: string, query: Query, event: Event, typing: boolean, repeat: boolean }>} Press
 */

/**
 * @typedef {Readonly<{ id: string, event: Event, typing: boolean, blocked: boolean }>} Release
 */

/**
 * @typedef {Readonly<{ down: (press: Press) => Command | undefined, up: (release: Release) => void }>} Sink
 */

/**
 * One step of a binding parsed: its lookup, its lookup without modifiers, and the modifiers it needs
 * @typedef {Readonly<{ lookup: string, bare: string, mods: Modifiers }>} Parsed
 */

/**
 * One kind of input as keybinds() wires it: the binding field it reads, parsing one step of a binding with the suffix
 * it has, and listening, given where presses go, which events to leave alone, and whether a press has a binding that
 * applies now
 * @typedef {Readonly<{
 *   field: Field,
 *   parse: (step: string, suffix: string) => Parsed,
 *   listen: (to: Sink, blocked: (event: Event) => boolean, bound: (query: Query) => boolean) =>
 *     Readonly<{ stop: () => void, held?: Test<string> }>,
 * }>} Input
 */

/** @typedef {'keys' | 'mouse' | 'pad'} Field */

/**
 * Bindings to one phase of a press, exact and loose
 * @typedef {Readonly<{ exact: readonly (readonly [string, Command])[],
 *   loose: readonly (readonly [string, Modifiers, Command])[] }>} Table
 */

/**
 * One input's bindings, by what runs them
 * @typedef {Readonly<{ press: Table, up: Table, hold: Table, tap: Table,
 *   sequences: readonly (readonly [readonly string[], Command])[] }>} Routes
 */

/** @typedef {'press' | 'up' | 'hold' | 'tap'} Phase */

/** @type {ReadonlyMap<string, Readonly<{ phase: Phase, option: 'releases' | 'holds' }>>} */
const SUFFIXES = new Map([
  [':hold', { option: 'holds', phase: 'hold' }],
  [':tap', { option: 'holds', phase: 'tap' }],
  [':up', { option: 'releases', phase: 'up' }],
])

/**
 * A binding string's steps and the phase its suffix names, checking the syntax it uses is on
 * @param {string} binding - The binding: "k", "k:up", "g i"
 * @param {KeybindsOptions} options - Which syntax is on
 * @returns {Readonly<{ steps: readonly string[], phase: Phase, suffix: string }>} Its steps, its phase, and its
 *   suffix
 * @throws {Error} If it uses syntax that isn't on, or is a sequence with a suffix
 */
function split(binding, options) {
  const { steps, suffix } = splitBinding(binding)
  const named = SUFFIXES.get(suffix)
  if (named !== undefined && (options[named.option] ?? false) === false) {
    throw new Error(`"${binding}" ends in "${suffix}", which needs the ${named.option} option`)
  }
  if (steps.length > 1 && (options.sequences ?? false) === false) {
    throw new Error(`"${binding}" has several steps, which needs the sequences option`)
  }
  if (steps.length > 1 && named !== undefined) {
    throw new Error(`"${binding}": a sequence can't end in "${suffix}"`)
  }
  return { phase: named?.phase ?? 'press', steps: steps.length === 0 ? [''] : steps, suffix }
}

/**
 * One input's bindings, parsed and routed
 * @param {readonly Command[]} bindings - The bindings
 * @param {Input} input - The input
 * @param {KeybindsOptions} options - Which syntax is on
 * @returns {Routes} Its bindings, by what runs them
 * @throws {Error} If a binding is invalid or uses syntax that isn't on
 */
function route(bindings, input, options) {
  /** @type {Record<Phase, { exact: (readonly [string, Command])[], loose: (readonly [string, Modifiers, Command])[] }>} */
  const tables = {
    hold: { exact: [], loose: [] },
    press: { exact: [], loose: [] },
    tap: { exact: [], loose: [] },
    up: { exact: [], loose: [] },
  }
  /** @type {(readonly [readonly string[], Command])[]} */
  const sequenced = []
  for (const binding of bindings) {
    for (const each of binding[input.field] ?? []) {
      const { phase, steps, suffix } = split(each, options)
      const parsed = steps.map((step) => input.parse(step, suffix))
      const only = parsed.at(0)
      if (parsed.length > 1) {
        if (binding.anyModifiers === true) {
          throw new Error(`"${each}" is a sequence, which can't match any modifiers`)
        }
        sequenced.push([parsed.map((step) => step.lookup), binding])
      } else if (only !== undefined && binding.anyModifiers === true) {
        tables[phase].loose.push([only.bare, only.mods, binding])
      } else if (only !== undefined) {
        tables[phase].exact.push([only.lookup, binding])
      }
    }
  }
  const pressed = new Set(tables.press.exact.map(([lookup]) => lookup))
  for (const [lookups] of sequenced) {
    for (let end = 1; end < lookups.length; end += 1) {
      const start = lookups.slice(0, end).join(' ')
      if (pressed.has(start)) {
        throw new Error(`"${start}" is both a binding and the start of a sequence`)
      }
    }
  }
  return { ...tables, sequences: sequenced }
}

/**
 * A table's handlers: exact before loose
 * @param {Table} table - The table
 * @returns {(query: Query) => readonly Command[]} Finding them
 */
function findIn(table) {
  /** @type {(query: Query) => readonly Command[]} */
  const exact = bindingTable(table.exact)
  /** @type {(query: Query) => readonly Command[]} */
  const loose = looseTable(table.loose)
  return anyOf(exact, loose)
}

/**
 * One input's bindings listened to: sequences first, then releases, holds, and the press's own bindings
 * @param {Input} input - The input
 * @param {Routes} routes - Its bindings
 * @param {KeybindsOptions} options - Which syntax is on
 * @param {(event: Event) => boolean} blocked - Which events to leave alone
 * @returns {Readonly<{ stop: () => void, held?: Test<string> }>} Stopping, and what the input holds
 */
function wire(input, routes, options, blocked) {
  const find = findIn(routes.press)
  const pressing = presses(find)
  /** @type {Sink} */
  let to = pressing
  let took = pressing.took
  /** @type {(() => void)[]} */
  const stops = []
  if ((options.holds ?? false) !== false) {
    const delay = typeof options.holds === 'object' ? options.holds.delay : undefined
    const holding = holds({
      hold: findIn(routes.hold),
      tap: findIn(routes.tap),
      to: pressing,
      ...(delay === undefined ? {} : { delay }),
    })
    stops.push(holding.stop)
    to = holding
    /**
     * The handlers a press that is down took, holding or pressed
     * @param {string} id - The press
     * @returns {readonly Command[]} The handlers
     */
    took = (id) => [...holding.took(id), ...pressing.took(id)]
  }
  if (options.releases === true) {
    to = releases({ find: findIn(routes.up), to, took })
  }
  if ((options.sequences ?? false) !== false) {
    const timeout = typeof options.sequences === 'object' ? options.sequences.timeout : undefined
    to = sequences({ entries: routes.sequences, to, ...(timeout === undefined ? {} : { timeout }) })
  }
  const listening = input.listen(to, blocked, (query) => find(query).some((each) => applies(each, false)))
  stops.push(listening.stop)
  return {
    ...listening,
    stop() {
      for (const stop of stops) {
        stop()
      }
    },
  }
}

/**
 * Listens for bindings
 * @param {readonly Binding[]} bindings - The commands and axes
 * @param {KeybindsOptions} [options] - Where to listen, which syntax is on, and how inputs are read
 * @returns {(() => void) & Readonly<{ axis: (axis: Axis) => AxisValue }>} Stopping; and reading one of the axes now:
 *   its position, from -1 to 1, and its movement since it was last read (zero while its `when` is false or an
 *   overlay holds focus)
 * @throws {Error} If a binding is invalid or uses syntax that isn't on
 * @example
 * const look = { axes: ['mouse:x', 'pad:rx'] }
 * const kb = keybinds([{ keys: ['$mod+s'], run: () => save() }, { mouse: ['MiddleClick'], run: pan }, look])
 * const { delta } = kb.axis(look)
 */
function keybinds(bindings, options = {}) {
  const { capture = false, syntax = [], target = globalThis, wheel = {} } = options
  let shared = options.pads
  const padsOf = () => (shared ??= pads())
  const focused = focusInOverlay(target)
  /** @type {readonly Input[]} */
  const inputs = [
    {
      field: 'keys',
      listen: (to, blocked) => keyListen({ blocked, capture, query: (event) => keyQuery(event, syntax), target, to }),
      parse: (step) => keyParse(step, syntax),
    },
    {
      field: 'mouse',
      listen: (to, blocked, bound) => ({
        stop: mouseListen({ blocked, capture, target, to, wheel: { ...wheel, bound } }),
      }),
      parse: mouseParse,
    },
    {
      field: 'pad',
      listen: (to) => ({ stop: padButtons({ blocked: focused, pads: padsOf(), to }) }),
      parse: (step) => padParse(step),
    },
  ]
  const commands = bindings.filter((binding) => 'run' in binding)
  /** @type {readonly Readonly<{ binding: Axis, sources: readonly ReturnType<typeof axisParse>[] }>[]} */
  const axes = bindings.flatMap((binding) =>
    'axes' in binding ? [{ binding, sources: binding.axes.map((each) => axisParse(each, syntax)) }] : [],
  )
  const keyAxes = axes.some((axis) => axis.sources.some((source) => source.kind === 'keys'))
  const bound = inputs.filter(
    (input) =>
      commands.some((command) => (command[input.field]?.length ?? 0) > 0) || (input.field === 'keys' && keyAxes),
  )
  const blocked = outsideOverlay(target)
  const starts = bound.map((input) => {
    const routes = route(commands, input, options)
    return () => wire(input, routes, options, blocked)
  })
  const wired = starts.map((start) => start())
  const held = wired.find((each) => each.held !== undefined)?.held
  const stops = wired.map((each) => each.stop)
  /**
   * The mouse's movement along one direction, listened to until stopping
   * @param {'x' | 'y'} axis - The direction
   * @returns {() => AxisValue} Reading it
   */
  const moved = (axis) => {
    const mouse = mouseAxis({ axis, capture, target })
    stops.push(mouse.stop)
    return mouse.read
  }
  const values = new Map(
    axes.map(({ binding, sources }) => {
      const parts = sources.map((source) => {
        const value =
          source.kind === 'keys'
            ? keyPairAxis({ has: (lookup) => held?.has(lookup) === true }, source.negative, source.positive)
            : source.kind === 'pad'
              ? padAxis(padsOf(), source.axis)
              : moved(source.axis === 'x' ? 'x' : 'y')
        return source.invert ? scaleAxis(value, -1) : value
      })
      return [binding, axisWhen(sumAxis(parts), () => (binding.when?.() ?? true) && !focused())]
    }),
  )
  const stop = () => {
    for (const each of stops) {
      each()
    }
  }
  return Object.assign(stop, {
    /**
     * @param {Axis} axis - One of the axes
     * @returns {AxisValue} Its value now
     * @throws {Error} If it isn't one of the axes
     */
    axis(axis) {
      const value = values.get(axis)
      if (value === undefined) {
        throw new Error(`Not an axis given to this keybinds(): ${axis.axes.join(', ')}`)
      }
      return value()
    },
  })
}

export { keybinds }
