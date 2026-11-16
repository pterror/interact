/**
 * Widgets built from widgets, by the DOM's event model. An input goes to the widget owning the part it happened on;
 * an ancestor that declared `capture` for that child and input type hears it first and may stop it, and one that
 * declared `bubble` hears it after, told whether the target prevented its default. Effects bubble up through the
 * ancestors: an ancestor that names an effect's type in `on` hears it, told where it came from, and the effect goes on
 * up unless the handler stops it (`stopPropagation`). Effects reach the host with the path of the widget that made
 * them, which is where an `answer`, `time`, `confirmed` or `refused` goes back.
 *
 * A composite's state is plain data: `{ own, children }`. Its own step, view and handlers see only `own`; a child is
 * seen only through its view (placed with `{ child }`) and its effects, and given inputs with `send`.
 */

/** @import { Content, HostEvent, Key, Path, Ref, Result, View } from './contract.js' */

/**
 * Hands a child an input, as the composite's own effect; the child's effects bubble back as any of its effects do
 * @template {string} C
 * @typedef {Readonly<{ type: 'send', to: C, input: unknown }>} Send
 */

/**
 * Keeps an input a capturing ancestor heard from reaching its target, or an effect an `on` handler heard from going on
 * up
 * @typedef {Readonly<{ type: 'stopPropagation' }>} StopPropagation
 */

/**
 * @typedef {Readonly<{ handle(state: unknown, value: unknown, detail: Path | boolean): Result<unknown, unknown> }>['handle']} AnyHandler
 */

/**
 * @typedef {Readonly<{ [child: string]: Readonly<{ [type: string]: AnyHandler }> }>} AnyHandlers
 */

/**
 * A widget the runtime can run, its types erased. Every function's parameters are bivariant (method syntax), so a
 * typed widget is one
 * @typedef {Readonly<{
 *   init(props: unknown): Result<unknown, unknown>,
 *   step(state: unknown, input: unknown): Result<unknown, unknown>,
 *   view(state: unknown, props: unknown): View,
 * }>} AnyLeaf
 */

/**
 * @typedef {AnyLeaf & Readonly<{
 *   children: Readonly<{ [child: string]: AnyWidget }>,
 *   props: Readonly<{ [child: string]: Readonly<{ props(own: unknown): unknown }>['props'] }>,
 *   on: AnyHandlers,
 *   capture: AnyHandlers,
 *   bubble: AnyHandlers,
 * }>} AnyComposite
 */

/** @typedef {AnyLeaf | AnyComposite} AnyWidget */

/**
 * The host methods a generated widget calls, as data: for each, the type of the effect it stands for and the effect's
 * fields, in the order the method takes them after where the effect came from. A field in `tuples` is an array the
 * method takes as that many arguments, its items
 * @typedef {Readonly<{
 *   [method: string]: Readonly<{ type: string, fields: readonly string[], tuples?: Readonly<Record<string, number>> }>,
 * }>} Methods
 */

/**
 * What a generated widget calls for each effect: a method per kind of effect, given where it came from and its fields
 * (typed `never`: each method takes its own fields, which only the generated declarations know)
 * @typedef {Readonly<{ [method: string]: (from: Path, ...fields: readonly never[]) => void }>} AnyHost
 */

/**
 * A widget the code generator made from a source widget: its effects are calls on a host, not data, and its state
 * is changed in place. A composite's children, props and handlers are given for drawing it
 * @typedef {Readonly<{
 *   effects: Methods,
 *   init(props: unknown, host: AnyHost): unknown,
 *   deliver(state: unknown, path: Path, at: number, input: unknown, host: AnyHost): unknown,
 *   view(state: unknown, props: unknown): View,
 *   children?: Readonly<{ [child: string]: AnyGenerated }>,
 *   props?: Readonly<{ [child: string]: Readonly<{ props(own: unknown): unknown }>['props'] }>,
 *   capture?: Readonly<{ [child: string]: Readonly<{ [type: string]: unknown }> }>,
 *   bubble?: Readonly<{ [child: string]: Readonly<{ [type: string]: unknown }> }>,
 * }>} AnyGenerated
 */

/**
 * What drawing a widget reads of it
 * @typedef {Readonly<{
 *   view(state: unknown, props: unknown): View,
 *   children?: Readonly<{ [child: string]: Drawable }>,
 *   props?: Readonly<{ [child: string]: Readonly<{ props(own: unknown): unknown }>['props'] }>,
 *   capture?: Readonly<{ [child: string]: Readonly<{ [type: string]: unknown }> }>,
 *   bubble?: Readonly<{ [child: string]: Readonly<{ [type: string]: unknown }> }>,
 * }>} Drawable
 */

/**
 * A composite's state
 * @template O, C
 * @typedef {Readonly<{ own: O, children: { readonly [K in keyof C]: StateOf<C[K]> } }>} CompositeState
 */

/**
 * The type of a widget's props, state, inputs or effects, read from its functions. A composite's state is its own and
 * its children's; its effects are its own (`send` and `stopPropagation` aside) and its children's
 * @template W
 * @typedef {W extends Readonly<{ init: (props: infer P) => unknown }> ? P : never} PropsOf
 */
/**
 * @template W
 * @typedef {W extends Readonly<{ children: infer C, init: (props: never) => Result<infer O, unknown> }>
 *   ? CompositeState<O, C>
 *   : W extends Readonly<{ init: (props: never) => Result<infer S, unknown> }>
 *     ? S
 *     : never} StateOf
 */
/**
 * @template W
 * @typedef {W extends Readonly<{ step: (state: never, input: infer I) => unknown }> ? I : never} InputOf
 */
/**
 * A composite's `step` type carries its children's effects too, so this never recurses into children
 * @template W
 * @typedef {W extends Readonly<{ step: (state: never, input: never) => Result<unknown, infer E> }>
 *   ? Exclude<E, Readonly<{ type: 'send' | 'stopPropagation' }>>
 *   : never} EffectOf
 */

/**
 * @template T
 * @typedef {T extends Readonly<{ type: infer N }> ? N & string : never} TypeOf
 */

/**
 * `on` handlers per child, per effect type (each name checked against the child's effect types): told where under the
 * child the effect came from (`[]`: the child itself), as a DOM listener reads `event.target`
 * @template O, E, C
 * @typedef {{ readonly [K in keyof C]?: {
 *   readonly [T in TypeOf<EffectOf<C[K]>>]?: (
 *     own: NoInfer<O>,
 *     effect: Extract<EffectOf<C[K]>, Readonly<{ type: T }>>,
 *     from: Path,
 *   ) => Result<NoInfer<O>, E | Send<keyof C & string> | StopPropagation>
 * } }} OnHandlers
 */

/**
 * `capture` or `bubble` handlers per child, per host event type: told (`bubble`) whether the target prevented the
 * default
 * @template O, E, C, Extra
 * @typedef {{ readonly [K in keyof C]?: {
 *   readonly [T in TypeOf<HostEvent>]?: (
 *     own: NoInfer<O>,
 *     input: Extract<HostEvent, Readonly<{ type: T }>>,
 *     defaultPrevented: boolean,
 *   ) => Result<NoInfer<O>, E | Send<keyof C & string> | Extra>
 * } }} InputHandlers
 */

/**
 * What `compose` takes. `init` gives the composite's own fields; each child starts from `props[child](own)`, and is
 * delivered `props` again whenever that changes. `step` handles inputs on the composite's own parts; `view` gives its
 * own parts, placing each child's root with `{ child }`
 * @template P, O, I, E, C
 * @typedef {Readonly<{
 *   children: C,
 *   props: { readonly [K in keyof C]: (own: NoInfer<O>) => PropsOf<C[K]> },
 *   init: (props: P) => Result<O, E | Send<keyof C & string>>,
 *   step: (own: NoInfer<O>, input: I) => Result<NoInfer<O>, E | Send<keyof C & string>>,
 *   view: (own: NoInfer<O>, props: NoInfer<P>) => View,
 *   on?: OnHandlers<O, E, C>,
 *   capture?: InputHandlers<O, E, C, StopPropagation>,
 *   bubble?: InputHandlers<O, E, C, never>,
 * }>} CompositeSpec
 */

/**
 * A composite, as `compose` makes it: its `step` is its own, typed with the effects that leave it, its children's
 * included
 * @template P, O, I, E, C
 * @typedef {Readonly<{
 *   children: C,
 *   props: CompositeSpec<P, O, I, E, C>['props'],
 *   init: CompositeSpec<P, O, I, E, C>['init'],
 *   step: (own: O, input: I) => Result<O, E | Send<keyof C & string> | EffectOf<C[keyof C]>>,
 *   view: CompositeSpec<P, O, I, E, C>['view'],
 *   on: NonNullable<CompositeSpec<P, O, I, E, C>['on']>,
 *   capture: NonNullable<CompositeSpec<P, O, I, E, C>['capture']>,
 *   bubble: NonNullable<CompositeSpec<P, O, I, E, C>['bubble']>,
 * }>} Composite
 */

/**
 * An effect on its way to the host: `from` is the path of the widget that made it, where its answer goes back
 * @typedef {Readonly<{ from: Path, effect: unknown }>} Out
 */

/**
 * A plain object, as plain data
 * @param {unknown} value - Anything
 * @returns {value is Readonly<{ [field: string]: unknown }>} Whether it is one
 */
function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * An array, as plain data
 * @param {unknown} value - Anything
 * @returns {value is readonly unknown[]} Whether it is one
 */
function isList(value) {
  return Array.isArray(value)
}

/**
 * Whether two plain values are the same data
 * @param {unknown} a - One
 * @param {unknown} b - The other
 * @returns {boolean} Whether they are equal all the way down
 */
function same(a, b) {
  if (a === b) {
    return true
  }
  if (isList(a)) {
    return isList(b) && a.length === b.length && a.every((value, index) => same(value, b[index]))
  }
  if (isRecord(a) && isRecord(b)) {
    const fields = Object.keys(a)
    return (
      fields.length === Object.keys(b).length &&
      fields.every((name) => Object.hasOwn(b, name) && same(a[name], b[name]))
    )
  }
  return false
}

/**
 * An input's or effect's type
 * @param {unknown} value - The input or effect
 * @returns {string} Its `type`, or `''` if it has none
 */
function typeOf(value) {
  return isRecord(value) && typeof value['type'] === 'string' ? value['type'] : ''
}

/**
 * Whether a widget is one the code generator made
 * @param {AnyWidget | AnyGenerated} widget - The widget
 * @returns {widget is AnyGenerated} Whether it is
 */
function isGenerated(widget) {
  return 'effects' in widget && 'deliver' in widget
}

/**
 * A host that turns a generated widget's calls back into effects, as the source widget gives them: what the runtime
 * hands on is the same either way
 * @param {Methods} methods - The widget's host methods
 * @returns {Readonly<{ host: AnyHost, outs: Out[] }>} The host, and the effects it has been given so far
 */
function recorder(methods) {
  /** @type {Out[]} */
  const outs = []
  /** @type {{ [method: string]: (from: Path, ...fields: readonly unknown[]) => void }} */
  const host = {}
  for (const [method, { fields, tuples = {}, type }] of Object.entries(methods)) {
    /**
     * @param {Path} from - Where the effect came from
     * @param {readonly unknown[]} values - Its fields, in order
     * @returns {void}
     */
    host[method] = (from, ...values) => {
      /** @type {{ [field: string]: unknown }} */
      const effect = { type }
      let at = 0
      for (const field of fields) {
        const length = tuples[field]
        effect[field] = length === undefined ? values[at] : values.slice(at, at + length)
        at += length ?? 1
      }
      outs.push({ effect, from })
    }
  }
  return { host, outs }
}

/**
 * Whether a widget is a composite
 * @param {AnyWidget} widget - The widget
 * @returns {widget is AnyComposite} Whether it has children
 */
function isComposite(widget) {
  return 'children' in widget
}

/**
 * A composite's state, split
 * @param {unknown} state - The state
 * @returns {Readonly<{ own: unknown, children: Readonly<{ [child: string]: unknown }> }>} Its own fields, and its
 *   children's states
 */
function split(state) {
  if (!isRecord(state) || !isRecord(state['children'])) {
    throw new TypeError('A composite state is { own, children }')
  }
  return { children: state['children'], own: state['own'] }
}

/**
 * A composite's child
 * @param {AnyComposite} widget - The composite
 * @param {string} name - The child's name
 * @returns {AnyWidget} The child
 */
function childOf(widget, name) {
  const child = widget.children[name]
  if (child === undefined) {
    throw new TypeError(`No child ${name}`)
  }
  return child
}

/**
 * The props a composite gives a child now
 * @param {AnyComposite} widget - The composite
 * @param {unknown} own - Its own fields
 * @param {string} name - The child
 * @returns {unknown} The child's props
 */
function propsFor(widget, own, name) {
  const props = widget.props[name]
  if (props === undefined) {
    throw new TypeError(`No props for ${name}`)
  }
  return props(own)
}

/**
 * Makes a composite from children, its own parts and the handlers that join them. Written inline, every handler's
 * names and arguments are checked against the children's types
 * @template P, O, I
 * @template {Readonly<{ type: string }>} E
 * @template {Readonly<{ [child: string]: AnyWidget }>} C
 * @param {CompositeSpec<P, O, I, E, C>} spec - The children and how they are joined
 * @returns {Composite<P, O, I, E, C>} The composite, a widget
 */
function compose(spec) {
  return {
    bubble: spec.bubble ?? {},
    capture: spec.capture ?? {},
    children: spec.children,
    init: spec.init,
    on: spec.on ?? {},
    props: spec.props,
    step: spec.step,
    view: spec.view,
  }
}

/**
 * A delivery inside a composite as it goes: its own fields, its children's states, and the props each child last had.
 * The props are kept, not the own fields they came from: a step may have changed those fields in place since
 * @typedef {Readonly<{
 *   own: unknown,
 *   children: Readonly<{ [child: string]: unknown }>,
 *   synced: Readonly<{ [child: string]: unknown }>,
 * }>} At
 */

/**
 * A delivery inside a composite, done: where it got to, and the effects that left the composite on the way
 * @typedef {Readonly<{ at: At, outs: readonly Out[] }>} Done
 */

/**
 * The composite's state at a point of a delivery
 * @param {At} at - The point
 * @returns {unknown} The state
 */
function stateOf(at) {
  return { children: at.children, own: at.own }
}

/**
 * The props a composite gives each child now
 * @param {AnyComposite} widget - The composite
 * @param {unknown} own - Its own fields
 * @returns {Readonly<{ [child: string]: unknown }>} Each child's props
 */
function propsOf(widget, own) {
  /** @type {{ [child: string]: unknown }} */
  const props = {}
  for (const name of Object.keys(widget.children)) {
    props[name] = propsFor(widget, own, name)
  }
  return props
}

/**
 * Delivers each child whose props changed since `at.synced` its new props
 * @param {AnyComposite} widget - The composite
 * @param {At} at - The delivery under way
 * @returns {Done} The delivery after
 */
function syncProps(widget, at) {
  /** @type {Out[]} */
  const outs = []
  let going = at
  for (let round = 0; round < 16; round += 1) {
    const { own, synced } = going
    const now = propsOf(widget, own)
    const changed = Object.keys(widget.children).filter((name) => !same(synced[name], now[name]))
    if (changed.length === 0) {
      return { at: going, outs }
    }
    going = { children: going.children, own: going.own, synced: now }
    for (const name of changed) {
      const done = toChild(widget, going, name, [], { props: now[name], type: 'props' })
      going = done.at
      outs.push(...done.outs)
    }
  }
  throw new Error('Props between a composite and its children never settle')
}

/**
 * Carries out a composite's own effects: `send` goes to the child it names (children get changed props first),
 * anything else leaves the composite
 * @param {AnyComposite} widget - The composite
 * @param {At} at - The delivery under way
 * @param {readonly unknown[]} effects - The effects
 * @returns {Done} The delivery after
 */
function settle(widget, at, effects) {
  /** @type {Out[]} */
  const outs = []
  let going = at
  const sends = effects.some((effect) => typeOf(effect) === 'send')
  for (const effect of sends ? [...effects] : effects) {
    if (typeOf(effect) === 'send' && isRecord(effect) && typeof effect['to'] === 'string') {
      const synced = syncProps(widget, going)
      const done = toChild(widget, synced.at, effect['to'], [], effect['input'])
      outs.push(...synced.outs, ...done.outs)
      going = done.at
    } else if (typeOf(effect) !== 'stopPropagation') {
      outs.push({ effect, from: [] })
    }
  }
  return { at: going, outs }
}

/**
 * Bubbles a child's effects through the composite's `on` handlers for that child: a handler hears an effect of a type
 * it names, and the effect goes on up after what the handler emits, unless the handler stops it
 * @param {AnyComposite} widget - The composite
 * @param {At} at - The delivery under way
 * @param {string} name - The child
 * @param {readonly Out[]} childOuts - The child's effects
 * @returns {Done} The delivery after
 */
function bubbleOuts(widget, at, name, childOuts) {
  const handlers = widget.on[name]
  /** @type {Out[]} */
  const outs = []
  let going = at
  for (const out of childOuts) {
    const handler = handlers?.[typeOf(out.effect)]
    let stopped = false
    if (handler !== undefined) {
      const [own, effects] = handler(going.own, out.effect, out.from)
      stopped = effects.some((effect) => typeOf(effect) === 'stopPropagation')
      const done = settle(widget, { ...going, own }, effects)
      outs.push(...done.outs)
      going = done.at
    }
    if (!stopped) {
      outs.push({ effect: out.effect, from: [name, ...out.from] })
    }
  }
  return { at: going, outs }
}

/**
 * Delivers an input to a child (or one of its descendants, by `rest`) and bubbles what comes out
 * @param {AnyComposite} widget - The composite
 * @param {At} at - The delivery under way
 * @param {string} name - The child
 * @param {Path} rest - The path below the child
 * @param {unknown} input - The input
 * @returns {Done & Readonly<{ prevented: boolean }>} The delivery after, and whether anything down there prevented
 *   the input's default
 */
function toChild(widget, at, name, rest, input) {
  const [child, childOuts] = deliver(childOf(widget, name), at.children[name], rest, input)
  const done = bubbleOuts(widget, { ...at, children: { ...at.children, [name]: child } }, name, childOuts)
  return { ...done, prevented: childOuts.some((out) => typeOf(out.effect) === 'preventDefault') }
}

/**
 * Delivers an input to the widget at a path below `widget`, and gives the new state and the effects that reach
 * `widget`'s parent. The state is handed over, as to a step: it may be changed in place, and only the state returned
 * is used after. No clock, randomness or I/O: the same state and input always give the same result
 * @param {AnyWidget | AnyGenerated} widget - The outermost widget
 * @param {unknown} state - Its state, handed over
 * @param {Path} path - The widget the input is for: the owner of the part it happened on, or the one that asked,
 *   woke or changed something
 * @param {unknown} input - The input
 * @returns {Result<unknown, Out>} The new state, and the effects with where each came from
 */
function deliver(widget, state, path, input) {
  if (isGenerated(widget)) {
    const recording = recorder(widget.effects)
    const next = widget.deliver(state, path, 0, input, recording.host)
    return [next, recording.outs]
  }
  if (!isComposite(widget)) {
    if (path.length > 0) {
      throw new TypeError(`A leaf widget has no child ${path.join('/')}`)
    }
    const [next, effects] = widget.step(state, input)
    return [next, effects.map((effect) => ({ effect, from: [] }))]
  }
  const { children, own } = split(state)
  const done = deliverIn(widget, { children, own, synced: propsOf(widget, own) }, path, input)
  const synced = syncProps(widget, done.at)
  return [stateOf(synced.at), [...done.outs, ...synced.outs]]
}

/**
 * Delivers an input inside a composite: to its own step, or through capture, the child and bubble
 * @param {AnyComposite} widget - The composite
 * @param {At} at - The delivery, starting
 * @param {Path} path - The widget the input is for, below the composite
 * @param {unknown} input - The input
 * @returns {Done} The delivery after
 */
function deliverIn(widget, at, path, input) {
  const [name, ...rest] = path
  if (name === undefined) {
    const [own, effects] = widget.step(at.own, input)
    return settle(widget, { ...at, own }, effects)
  }
  const type = typeOf(input)
  /** @type {Out[]} */
  const outs = []
  let going = at
  const capture = widget.capture[name]?.[type]
  if (capture !== undefined) {
    const [own, effects] = capture(going.own, input, false)
    const done = settle(widget, { ...going, own }, effects)
    outs.push(...done.outs)
    going = done.at
    if (effects.some((effect) => typeOf(effect) === 'stopPropagation')) {
      return { at: going, outs }
    }
  }
  const synced = syncProps(widget, going)
  const delivered = toChild(widget, synced.at, name, rest, input)
  outs.push(...synced.outs, ...delivered.outs)
  const bubble = widget.bubble[name]?.[type]
  if (bubble === undefined) {
    return { at: delivered.at, outs }
  }
  const [own, effects] = bubble(delivered.at.own, input, delivered.prevented)
  const done = settle(widget, { ...delivered.at, own }, effects)
  outs.push(...done.outs)
  return { at: done.at, outs }
}

/**
 * Starts a widget: its first state, and the effects its `init`, and every descendant's, emit, bubbled as any effects
 * are. Children start first, so the composite's own first effects can `send` to them
 * @param {AnyWidget | AnyGenerated} widget - The widget
 * @param {unknown} props - Its props
 * @returns {Result<unknown, Out>} The state, and the effects that reach the host
 */
function start(widget, props) {
  if (isGenerated(widget)) {
    const recording = recorder(widget.effects)
    const state = widget.init(props, recording.host)
    return [state, recording.outs]
  }
  const [own, given] = widget.init(props)
  if (!isComposite(widget)) {
    return [own, given.map((effect) => ({ effect, from: [] }))]
  }
  // Held while the children start, which may call this widget again
  const effects = [...given]
  /** @type {{ [child: string]: unknown }} */
  const children = {}
  /** @type {[string, readonly Out[]][]} */
  const started = []
  const synced = propsOf(widget, own)
  for (const name of Object.keys(widget.children)) {
    const [child, outs] = start(childOf(widget, name), synced[name])
    children[name] = child
    started.push([name, outs])
  }
  /** @type {Out[]} */
  const outs = []
  /** @type {At} */
  let going = { children, own, synced }
  for (const [name, childOuts] of started) {
    const done = bubbleOuts(widget, going, name, childOuts)
    outs.push(...done.outs)
    going = done.at
  }
  const settled = settle(widget, going, effects)
  const done = syncProps(widget, settled.at)
  return [stateOf(done.at), [...outs, ...settled.outs, ...done.outs]]
}

/**
 * A part named from the outermost widget: the widget that owns it, the part's name, and its item
 * @typedef {Readonly<{ owner: Path, part: string, item: Key | null }>} Target
 */

/**
 * An ARIA attribute's value with its references resolved to targets
 * @typedef {string | number | boolean | Target | readonly Target[] | null} ResolvedAria
 */

/**
 * A part as drawn: the part, the widget that owns it, and its contents resolved down to text and the host's items.
 * `listens` adds the types its ancestors capture or hear bubble from it
 * @typedef {Readonly<{
 *   target: Target,
 *   role: string | null,
 *   aria: Readonly<{ [name: string]: ResolvedAria }>,
 *   data: Readonly<{ [name: string]: string | boolean | null }>,
 *   tabindex: number | null,
 *   hidden: boolean,
 *   listens: readonly string[],
 *   content: readonly Drawn[],
 * }>} Node
 */

/**
 * @typedef {Node | Readonly<{ text: string }> | Readonly<{ item: Key }>} Drawn
 */

/**
 * The target a reference names, from the widget that made it
 * @param {Path} owner - That widget
 * @param {Ref} ref - The reference
 * @returns {Target} The target
 */
function targetOf(owner, ref) {
  const part = ref.part.at(-1)
  if (part === undefined) {
    throw new TypeError('A reference names a part')
  }
  return { item: ref.item, owner: [...owner, ...ref.part.slice(0, -1)], part }
}

/**
 * Whether a value is a reference
 * @param {unknown} value - An ARIA value
 * @returns {value is Ref} Whether it is one
 */
function isRef(value) {
  return isRecord(value) && isList(value['part'])
}

/**
 * The tree a renderer draws: every part from the outermost widget's root down, each repeated part called only for
 * the keys its parent gives (the window)
 * @param {Drawable} widget - The outermost widget
 * @param {unknown} state - Its state
 * @param {unknown} props - Its props
 * @returns {Node} The root part
 */
function resolve(widget, state, props) {
  return resolveAt(widget, state, props, [], [])
}

/**
 * The tree of one widget, inside its ancestors
 * @param {Drawable} widget - The widget
 * @param {unknown} state - Its state
 * @param {unknown} props - Its props
 * @param {Path} owner - Its path
 * @param {readonly string[]} heard - The input types its ancestors capture or hear bubble from it
 * @returns {Node} Its root part
 */
function resolveAt(widget, state, props, owner, heard) {
  const kids = widget.children
  const { children, own } = kids === undefined ? { children: {}, own: state } : split(state)
  const view = widget.view(own, props)

  /**
   * What one content of a part draws
   * @param {Content} content - The content
   * @returns {Drawn[]} What it draws, in order
   */
  const drawn = (content) => {
    if ('part' in content) {
      return [part(content.part, null)]
    }
    if ('each' in content) {
      return content.keys.map((key) => part(content.each, key))
    }
    if ('child' in content) {
      const name = content.child
      const child = kids?.[name]
      const given = widget.props?.[name]
      if (child === undefined || given === undefined) {
        throw new TypeError(`No child ${name}`)
      }
      const heardHere = [...Object.keys(widget.capture?.[name] ?? {}), ...Object.keys(widget.bubble?.[name] ?? {})]
      return [resolveAt(child, children[name], given(own), [...owner, name], [...heard, ...heardHere])]
    }
    return [content]
  }

  /**
   * One part, resolved
   * @param {string} name - The part
   * @param {Key | null} item - Its item
   * @returns {Node} The part as drawn
   */
  const part = (name, item) => {
    const made = view[name]
    if (made === undefined) {
      throw new TypeError(`The view has no part ${name}`)
    }
    const given = typeof made === 'function' ? (item === null ? undefined : made(item)) : made
    if (given === undefined) {
      throw new TypeError(`Part ${name} is drawn per key, and needs one`)
    }
    /** @type {{ [name: string]: ResolvedAria }} */
    const aria = {}
    for (const [attribute, value] of Object.entries(given.aria)) {
      aria[attribute] = isRef(value)
        ? targetOf(owner, value)
        : isList(value)
          ? value.filter((one) => isRef(one)).map((one) => targetOf(owner, one))
          : value
    }
    return {
      aria,
      content: given.content.flatMap((content) => drawn(content)),
      data: given.data,
      hidden: given.hidden,
      listens: [...new Set([...given.listens, ...heard])],
      role: given.role,
      tabindex: given.tabindex,
      target: { item, owner, part: name },
    }
  }

  return part('root', null)
}

export { compose, deliver, isRecord, recorder, resolve, same, start, typeOf }
