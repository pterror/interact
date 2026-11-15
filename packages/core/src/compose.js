/**
 * Widgets built from widgets, by the DOM's event model. An input goes to the widget owning the part it happened on;
 * an ancestor that declared `capture` for that child and input type hears it first and may stop it, and one that
 * declared `bubble` hears it after, told whether the target prevented its default. Effects bubble up through the
 * ancestors, each handling only the effect types it names in `on`, and reach the host with the path of the widget that
 * made them, which is where an `answer` or `time` goes back. A composite's state is plain data: its own fields, and
 * each child's state under the child's name. A composite's own step hands a child an input with `send`.
 */

/** @import { Content, HostEvent, Key, Path, Ref, Result, View } from './contract.js' */

/**
 * Hands a child an input, as the composite's own effect; the child's effects bubble back as any of its effects do
 * @template {string} C
 * @typedef {Readonly<{ type: 'send', to: C, input: unknown }>} Send
 */

/**
 * Keeps an input a capturing ancestor heard from reaching its target
 * @typedef {Readonly<{ type: 'stopPropagation' }>} StopPropagation
 */

/**
 * A widget the runtime can run: a leaf or a composite, its types erased. Every function's parameters are bivariant
 * (method syntax), so a typed widget is one
 * @typedef {Readonly<{
 *   init(props: unknown): unknown,
 *   step(state: unknown, input: unknown): Result<unknown, unknown>,
 *   view(state: unknown, props: unknown): View,
 * }>} AnyLeaf
 */

/**
 * @typedef {Readonly<{
 *   handle(state: unknown, value: unknown, detail: Path | boolean): Result<unknown, unknown>,
 * }>['handle']} AnyHandler
 */

/**
 * @typedef {Readonly<{ props(state: unknown): unknown }>['props']} AnyProps
 */

/**
 * @typedef {Readonly<{ [child: string]: Readonly<{ [type: string]: AnyHandler }> }>} AnyHandlers
 */

/**
 * @typedef {AnyLeaf & Readonly<{
 *   children: Readonly<{ [child: string]: AnyWidget }>,
 *   props: Readonly<{ [child: string]: AnyProps }>,
 *   on: AnyHandlers,
 *   capture: AnyHandlers,
 *   bubble: AnyHandlers,
 * }>} AnyComposite
 */

/** @typedef {AnyLeaf | AnyComposite} AnyWidget */

/**
 * The type of a widget's props, state, inputs or effects, read from its functions. A composite's effects are its own
 * (its `send`s aside) and its children's
 * @template W
 * @typedef {W extends Readonly<{ init: (props: infer P) => unknown }> ? P : never} PropsOf
 */
/**
 * @template W
 * @typedef {W extends Readonly<{ view: (state: infer S, props: never) => unknown }> ? S : never} StateOf
 */
/**
 * @template W
 * @typedef {W extends Readonly<{ step: (state: never, input: infer I) => unknown }> ? I : never} InputOf
 */
/**
 * @template W
 * @typedef {W extends Readonly<{ children: infer C, step: (state: never, input: never) => Result<unknown, infer E> }>
 *   ? Exclude<E, Readonly<{ type: 'send' }>> | EffectOf<C[keyof C]>
 *   : W extends Readonly<{ step: (state: never, input: never) => Result<unknown, infer E> }>
 *     ? E
 *     : never} EffectOf
 */

/**
 * A composite's state: its own fields and each child's state under the child's name
 * @template O, C
 * @typedef {O & { readonly [K in keyof C]: StateOf<C[K]> }} StateWith
 */

/**
 * Handlers per child, per type of what it handles: every name is checked against the child's effect types (`on`) or
 * the host's event types (`capture`, `bubble`: any can happen on a child's parts). An `on` handler is told where under
 * the child the effect came from (`[]`: the child itself), as a DOM listener reads `event.target`; a `bubble`
 * handler, whether the target prevented the default
 * @template S, E, C, Of, Extra
 * @typedef {{ readonly [K in keyof C]?: {
 *   readonly [T in TypeOf<Of extends 'effect' ? EffectOf<C[K]> : HostEvent>]?: (
 *     state: S,
 *     value: Extract<Of extends 'effect' ? EffectOf<C[K]> : HostEvent, Readonly<{ type: T }>>,
 *     detail: Of extends 'effect' ? Path : boolean,
 *   ) => Result<S, E | Send<keyof C & string> | Extra>
 * } }} Handlers
 */

/**
 * @template T
 * @typedef {T extends Readonly<{ type: infer N }> ? N & string : never} TypeOf
 */

/**
 * What `compose` takes. `init` gives the composite's own fields; each child starts from `props[child](own)`, and is
 * delivered `props` again whenever that changes. `step` handles inputs on the composite's own parts; `view` gives its
 * own parts, placing each child's root with `{ child }`. `on` handles children's effects (what a handler returns is
 * the composite's own), `capture` hears a child's inputs before the child (a `stopPropagation` effect keeps them from
 * it), `bubble` after it
 * @template P, O, I, E, C
 * @typedef {Readonly<{
 *   children: C,
 *   props: { readonly [K in keyof C]: (state: O) => PropsOf<C[K]> },
 *   init: (props: P) => O,
 *   step: (state: StateWith<O, C>, input: I) => Result<StateWith<O, C>, E | Send<keyof C & string>>,
 *   view: (state: StateWith<O, C>, props: P) => View,
 *   on?: Handlers<StateWith<O, C>, E, C, 'effect', never>,
 *   capture?: Handlers<StateWith<O, C>, E, C, 'input', StopPropagation>,
 *   bubble?: Handlers<StateWith<O, C>, E, C, 'input', never>,
 * }>} CompositeSpec
 */

/**
 * A composite, as `compose` makes it: `init` gives the whole state, children's included; `step` is its own
 * @template P, O, I, E, C
 * @typedef {Readonly<{
 *   children: C,
 *   props: CompositeSpec<P, O, I, E, C>['props'],
 *   init: (props: P) => StateWith<O, C>,
 *   step: CompositeSpec<P, O, I, E, C>['step'],
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
      fields.every((field) => Object.hasOwn(b, field) && same(a[field], b[field]))
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
 * Whether a widget is a composite
 * @param {AnyWidget} widget - The widget
 * @returns {widget is AnyComposite} Whether it has children
 */
function isComposite(widget) {
  return 'children' in widget
}

/**
 * A field of a composite's state
 * @param {unknown} state - The state
 * @param {string} name - The field
 * @returns {unknown} Its value
 */
function fieldOf(state, name) {
  if (!isRecord(state) || !Object.hasOwn(state, name)) {
    throw new TypeError(`The state has no field ${name}`)
  }
  return state[name]
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
 * @param {unknown} state - Its state
 * @param {string} name - The child
 * @returns {unknown} The child's props
 */
function propsFor(widget, state, name) {
  const props = widget.props[name]
  if (props === undefined) {
    throw new TypeError(`No props for ${name}`)
  }
  return props(state)
}

/**
 * Makes a composite from children, its own parts and the handlers that join them. The handlers' names are checked
 * against the children's types
 * @template P, O, I, E
 * @template {Readonly<{ [child: string]: AnyWidget }>} C
 * @param {CompositeSpec<P, O, I, E, C>} spec - The children and how they are joined
 * @returns {Composite<P, O, I, E, C>} The composite, a widget
 */
function compose(spec) {
  return {
    bubble: spec.bubble ?? {},
    capture: spec.capture ?? {},
    children: spec.children,
    init(given) {
      const own = spec.init(given)
      const state = { ...own, ...initChildren(spec.children, spec.props, own) }
      if (!hasChildren(state, spec.children)) {
        throw new TypeError('A composite state holds every child')
      }
      return state
    },
    on: spec.on ?? {},
    props: spec.props,
    step: spec.step,
    view: spec.view,
  }
}

/**
 * Whether a composite's state holds a state for every child
 * @template O
 * @template {Readonly<{ [child: string]: AnyWidget }>} C
 * @param {O} state - The state
 * @param {C} children - The children
 * @returns {state is StateWith<O, C>} Whether it does
 */
function hasChildren(state, children) {
  return isRecord(state) && Object.keys(children).every((name) => Object.hasOwn(state, name))
}

/**
 * Each child's first state
 * @param {Readonly<{ [child: string]: AnyWidget }>} children - The children
 * @param {Readonly<{ [child: string]: AnyProps }>} props - Each child's props, from the composite's own fields
 * @param {unknown} own - The composite's own fields
 * @returns {{ [child: string]: unknown }} Each child's state, by name
 */
function initChildren(children, props, own) {
  /** @type {{ [child: string]: unknown }} */
  const states = {}
  for (const [name, child] of Object.entries(children)) {
    const childProps = props[name]
    if (childProps === undefined) {
      throw new TypeError(`No props for ${name}`)
    }
    states[name] = child.init(childProps(own))
  }
  return states
}

/**
 * A composite's state with one child's state replaced
 * @param {unknown} state - The composite's state
 * @param {string} name - The child
 * @param {unknown} child - Its new state
 * @returns {unknown} The new state
 */
function withChild(state, name, child) {
  if (!isRecord(state)) {
    throw new TypeError('A composite state is a plain object')
  }
  return { ...state, [name]: child }
}

/**
 * Effects from a widget's own step, as they leave it
 * @param {readonly unknown[]} effects - The effects
 * @returns {Out[]} Each, from the widget itself
 */
function fromSelf(effects) {
  return effects.map((effect) => ({ effect, from: [] }))
}

/**
 * A delivery inside a composite as it goes: the composite's state, and the state its children last had their props
 * from
 * @typedef {Readonly<{ state: unknown, synced: unknown }>} At
 */

/**
 * A delivery inside a composite, done: where it got to, and the effects that left the composite on the way
 * @typedef {Readonly<{ at: At, outs: readonly Out[] }>} Done
 */

/**
 * Delivers each child whose props changed since `at.synced` its new props
 * @param {AnyComposite} widget - The composite
 * @param {At} at - The delivery under way
 * @returns {Done} The delivery after
 */
function syncProps(widget, at) {
  /** @type {Out[]} */
  const outs = []
  let { state, synced } = at
  for (let round = 0; round < 16; round += 1) {
    const before = synced
    const now = state
    const changed = Object.keys(widget.children).filter(
      (name) => !same(propsFor(widget, before, name), propsFor(widget, now, name)),
    )
    if (changed.length === 0) {
      return { at: { state, synced }, outs }
    }
    synced = now
    for (const name of changed) {
      const done = toChild(widget, { state, synced }, name, [], { props: propsFor(widget, now, name), type: 'props' })
      ;({ state } = done.at)
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
  for (const effect of effects) {
    if (typeOf(effect) === 'send' && isRecord(effect) && typeof effect['to'] === 'string') {
      const synced = syncProps(widget, going)
      const done = toChild(widget, synced.at, effect['to'], [], effect['input'])
      outs.push(...synced.outs, ...done.outs)
      going = done.at
    } else {
      outs.push({ effect, from: [] })
    }
  }
  return { at: going, outs }
}

/**
 * Delivers an input to a child (or one of its descendants, by `rest`) and bubbles what comes out through the
 * composite's `on` handlers for that child
 * @param {AnyComposite} widget - The composite
 * @param {At} at - The delivery under way
 * @param {string} name - The child
 * @param {Path} rest - The path below the child
 * @param {unknown} input - The input
 * @returns {Done & Readonly<{ prevented: boolean }>} The delivery after, and whether anything down there prevented
 *   the input's default
 */
function toChild(widget, at, name, rest, input) {
  const [child, childOuts] = deliver(childOf(widget, name), fieldOf(at.state, name), rest, input)
  const handlers = widget.on[name]
  /** @type {Out[]} */
  const outs = []
  /** @type {At} */
  let going = { ...at, state: withChild(at.state, name, child) }
  for (const out of childOuts) {
    const handler = handlers?.[typeOf(out.effect)]
    if (handler === undefined) {
      outs.push({ effect: out.effect, from: [name, ...out.from] })
    } else {
      const [next, effects] = handler(going.state, out.effect, out.from)
      const done = settle(widget, { ...going, state: next }, effects)
      outs.push(...done.outs)
      going = done.at
    }
  }
  return { at: going, outs, prevented: childOuts.some((out) => typeOf(out.effect) === 'preventDefault') }
}

/**
 * Delivers an input to the widget at a path below `widget`, and gives the new state and the effects that reach
 * `widget`'s parent. Pure: the same state and input always give the same result
 * @param {AnyWidget} widget - The outermost widget
 * @param {unknown} state - Its state
 * @param {Path} path - The widget the input is for: the owner of the part it happened on, or the one that asked or
 *   woke
 * @param {unknown} input - The input
 * @returns {Result<unknown, Out>} The new state, and the effects with where each came from
 */
function deliver(widget, state, path, input) {
  if (!isComposite(widget)) {
    if (path.length > 0) {
      throw new TypeError(`A leaf widget has no child ${path.join('/')}`)
    }
    const [next, effects] = widget.step(state, input)
    return [next, fromSelf(effects)]
  }
  const done = deliverIn(widget, { state, synced: state }, path, input)
  const synced = syncProps(widget, done.at)
  return [synced.at.state, [...done.outs, ...synced.outs]]
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
    const [next, effects] = widget.step(at.state, input)
    return settle(widget, { ...at, state: next }, effects)
  }
  const type = typeOf(input)
  /** @type {Out[]} */
  const outs = []
  let going = at
  const capture = widget.capture[name]?.[type]
  if (capture !== undefined) {
    const [next, effects] = capture(going.state, input, false)
    const done = settle(
      widget,
      { ...going, state: next },
      effects.filter((effect) => typeOf(effect) !== 'stopPropagation'),
    )
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
  const [next, effects] = bubble(delivered.at.state, input, delivered.prevented)
  const done = settle(widget, { ...delivered.at, state: next }, effects)
  outs.push(...done.outs)
  return { at: done.at, outs }
}

/**
 * Starts a widget: its first state, after it and every descendant, outermost first, were delivered their props once
 * (so a widget that needs something from the host, such as its first window of keys, asks for it then)
 * @param {AnyWidget} widget - The widget
 * @param {unknown} props - Its props
 * @returns {Result<unknown, Out>} The state, and the effects that reach the host
 */
function start(widget, props) {
  return mount(widget, widget.init(props), [], props)
}

/**
 * Delivers props to a widget and then to each of its descendants
 * @param {AnyWidget} root - The outermost widget
 * @param {unknown} state - Its state
 * @param {Path} path - The widget to mount, below `root`
 * @param {unknown} props - That widget's props
 * @returns {Result<unknown, Out>} The new state, and the effects
 */
function mount(root, state, path, props) {
  const [first, firstOuts] = deliver(root, state, path, { props, type: 'props' })
  let next = first
  const outs = [...firstOuts]
  const widget = widgetAt(root, path)
  if (isComposite(widget)) {
    for (const name of Object.keys(widget.children)) {
      const [after, more] = mount(root, next, [...path, name], propsFor(widget, stateAt(next, path), name))
      next = after
      outs.push(...more)
    }
  }
  return [next, outs]
}

/**
 * The widget at a path
 * @param {AnyWidget} root - The outermost widget
 * @param {Path} path - The path
 * @returns {AnyWidget} The widget there
 */
function widgetAt(root, path) {
  let widget = root
  for (const name of path) {
    if (!isComposite(widget)) {
      throw new TypeError(`No child ${name}`)
    }
    widget = childOf(widget, name)
  }
  return widget
}

/**
 * The state of the widget at a path
 * @param {unknown} state - The outermost widget's state
 * @param {Path} path - The path
 * @returns {unknown} That widget's state
 */
function stateAt(state, path) {
  let here = state
  for (const name of path) {
    here = fieldOf(here, name)
  }
  return here
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
 * @param {AnyWidget} widget - The outermost widget
 * @param {unknown} state - Its state
 * @param {unknown} props - Its props
 * @returns {Node} The root part
 */
function resolve(widget, state, props) {
  return resolveAt(widget, state, props, [], [])
}

/**
 * The tree of one widget, inside its ancestors
 * @param {AnyWidget} widget - The widget
 * @param {unknown} state - Its state
 * @param {unknown} props - Its props
 * @param {Path} owner - Its path
 * @param {readonly string[]} heard - The input types its ancestors capture or hear bubble from it
 * @returns {Node} Its root part
 */
function resolveAt(widget, state, props, owner, heard) {
  const view = widget.view(state, props)

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
      if (!isComposite(widget)) {
        throw new TypeError('A leaf widget has no children')
      }
      const name = content.child
      const heardHere = [...Object.keys(widget.capture[name] ?? {}), ...Object.keys(widget.bubble[name] ?? {})]
      return [
        resolveAt(
          childOf(widget, name),
          fieldOf(state, name),
          propsFor(widget, state, name),
          [...owner, name],
          [...heard, ...heardHere],
        ),
      ]
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

/**
 * Whether two targets name the same part
 * @param {Target} a - One
 * @param {Target} b - The other
 * @returns {boolean} Whether they are the same
 */
function sameTarget(a, b) {
  return a.part === b.part && a.item === b.item && same(a.owner, b.owner)
}

export { compose, deliver, isRecord, resolve, same, sameTarget, start, stateAt, typeOf }
