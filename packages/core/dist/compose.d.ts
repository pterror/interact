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
import type { HostEvent, Key, Outside, Path, Result, View } from './contract.js';
export type Send<C extends string> = Readonly<{
    type: 'send';
    to: C;
    input: unknown;
}>;
export type StopPropagation = Readonly<{
    type: 'stopPropagation';
}>;
export type AnyHandler = Readonly<{
    handle(state: unknown, value: unknown, detail: Path | boolean): Result<unknown, unknown>;
}>['handle'];
export type AnyHandlers = Readonly<{
    [child: string]: Readonly<{
        [type: string]: AnyHandler;
    }>;
}>;
export type AnyLeaf = Readonly<{
    init(props: unknown): Result<unknown, unknown>;
    step(state: unknown, input: unknown): Result<unknown, unknown>;
    view(state: unknown, props: unknown): View;
}>;
export type AnyComposite = AnyLeaf & Readonly<{
    children: Readonly<{
        [child: string]: AnyWidget;
    }>;
    props: Readonly<{
        [child: string]: Readonly<{
            props(own: unknown): unknown;
        }>['props'];
    }>;
    on: AnyHandlers;
    capture: AnyHandlers;
    bubble: AnyHandlers;
}>;
export type AnyWidget = AnyLeaf | AnyComposite;
export type Methods = Readonly<{
    [method: string]: Readonly<{
        type: string;
        fields: readonly string[];
        tuples?: Readonly<Record<string, number>>;
    }>;
}>;
export type AnyHost = Readonly<{
    [method: string]: (from: Path, ...fields: readonly never[]) => void;
}>;
export type AnyGenerated = Readonly<{
    effects: Methods;
    init(props: unknown, host: AnyHost): unknown;
    deliver(state: unknown, path: Path, at: number, input: unknown, host: AnyHost): unknown;
    view(state: unknown, props: unknown): View;
    children?: Readonly<{
        [child: string]: AnyGenerated;
    }>;
    props?: Readonly<{
        [child: string]: Readonly<{
            props(own: unknown): unknown;
        }>['props'];
    }>;
    capture?: Readonly<{
        [child: string]: Readonly<{
            [type: string]: unknown;
        }>;
    }>;
    bubble?: Readonly<{
        [child: string]: Readonly<{
            [type: string]: unknown;
        }>;
    }>;
}>;
export type Drawable = Readonly<{
    view(state: unknown, props: unknown): View;
    children?: Readonly<{
        [child: string]: Drawable;
    }>;
    props?: Readonly<{
        [child: string]: Readonly<{
            props(own: unknown): unknown;
        }>['props'];
    }>;
    capture?: Readonly<{
        [child: string]: Readonly<{
            [type: string]: unknown;
        }>;
    }>;
    bubble?: Readonly<{
        [child: string]: Readonly<{
            [type: string]: unknown;
        }>;
    }>;
}>;
export type CompositeState<O, C> = Readonly<{
    own: O;
    children: { readonly [K in keyof C]: StateOf<C[K]>; };
}>;
export type PropsOf<W> = W extends Readonly<{
    init: (props: infer P) => unknown;
}> ? P : never;
export type StateOf<W> = W extends Readonly<{
    children: infer C;
    init: (props: never) => Result<infer O, unknown>;
}> ? CompositeState<O, C> : W extends Readonly<{
    init: (props: never) => Result<infer S, unknown>;
}> ? S : never;
export type InputOf<W> = W extends Readonly<{
    step: (state: never, input: infer I) => unknown;
}> ? I : never;
export type EffectOf<W> = W extends Readonly<{
    step: (state: never, input: never) => Result<unknown, infer E>;
}> ? Exclude<E, Readonly<{
    type: 'send' | 'stopPropagation';
}>> : never;
export type TypeOf<T> = T extends Readonly<{
    type: infer N;
}> ? N & string : never;
export type OnHandlers<O, E, C> = {
    readonly [K in keyof C]?: {
        readonly [T in TypeOf<EffectOf<C[K]>>]?: (own: NoInfer<O>, effect: Extract<EffectOf<C[K]>, Readonly<{
            type: T;
        }>>, from: Path) => Result<NoInfer<O>, E | Send<keyof C & string> | StopPropagation>;
    };
};
export type EventOf<T extends string> = HostEvent extends infer E ? E extends Readonly<{
    type: infer U;
}> ? T extends U ? E : never : never : never;
export type InputHandlers<O, E, C, Extra> = {
    readonly [K in keyof C]?: {
        readonly [T in TypeOf<HostEvent>]?: (own: NoInfer<O>, input: EventOf<T>, defaultPrevented: boolean) => Result<NoInfer<O>, E | Send<keyof C & string> | Extra>;
    };
};
export type CompositeSpec<P, O, I, E, C> = Readonly<{
    children: C;
    props: { readonly [K in keyof C]: (own: NoInfer<O>) => PropsOf<C[K]>; };
    init: (props: P) => Result<O, E | Send<keyof C & string>>;
    step: (own: NoInfer<O>, input: I) => Result<NoInfer<O>, E | Send<keyof C & string>>;
    view: (own: NoInfer<O>, props: NoInfer<P>) => View;
    on?: OnHandlers<O, E, C>;
    capture?: InputHandlers<O, E, C, StopPropagation>;
    bubble?: InputHandlers<O, E, C, never>;
}>;
export type Composite<P, O, I, E, C> = Readonly<{
    children: C;
    props: CompositeSpec<P, O, I, E, C>['props'];
    init: CompositeSpec<P, O, I, E, C>['init'];
    step: (own: O, input: I) => Result<O, E | Send<keyof C & string> | EffectOf<C[keyof C]>>;
    view: CompositeSpec<P, O, I, E, C>['view'];
    on: NonNullable<CompositeSpec<P, O, I, E, C>['on']>;
    capture: NonNullable<CompositeSpec<P, O, I, E, C>['capture']>;
    bubble: NonNullable<CompositeSpec<P, O, I, E, C>['bubble']>;
}>;
export type Out = Readonly<{
    from: Path;
    effect: unknown;
}>;
/** @import { Content, HostEvent, Key, Outside, Path, Ref, Result, View } from './contract.js' */
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
 * The host event of a type, of the events whose `type` is one of several (a pointer event's)
 * @template {string} T
 * @typedef {HostEvent extends infer E ? E extends Readonly<{ type: infer U }> ? T extends U ? E : never : never : never} EventOf
 */
/**
 * `capture` or `bubble` handlers per child, per host event type: told (`bubble`) whether the target prevented the
 * default
 * @template O, E, C, Extra
 * @typedef {{ readonly [K in keyof C]?: {
 *   readonly [T in TypeOf<HostEvent>]?: (
 *     own: NoInfer<O>,
 *     input: EventOf<T>,
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
declare function isRecord(value: unknown): value is Readonly<{
    [field: string]: unknown;
}>;
/**
 * Whether two plain values are the same data
 * @param {unknown} a - One
 * @param {unknown} b - The other
 * @returns {boolean} Whether they are equal all the way down
 */
declare function same(a: unknown, b: unknown): boolean;
/**
 * An input's or effect's type
 * @param {unknown} value - The input or effect
 * @returns {string} Its `type`, or `''` if it has none
 */
declare function typeOf(value: unknown): string;
/**
 * A host that turns a generated widget's calls back into effects, as the source widget gives them: what the runtime
 * hands on is the same either way
 * @param {Methods} methods - The widget's host methods
 * @returns {Readonly<{ host: AnyHost, outs: Out[] }>} The host, and the effects it has been given so far
 */
declare function recorder(methods: Methods): Readonly<{
    host: AnyHost;
    outs: Out[];
}>;
/**
 * Makes a composite from children, its own parts and the handlers that join them. Written inline, every handler's
 * names and arguments are checked against the children's types
 * @template P, O, I
 * @template {Readonly<{ type: string }>} E
 * @template {Readonly<{ [child: string]: AnyWidget }>} C
 * @param {CompositeSpec<P, O, I, E, C>} spec - The children and how they are joined
 * @returns {Composite<P, O, I, E, C>} The composite, a widget
 */
declare function compose<P, O, I, E extends Readonly<{
    type: string;
}>, C extends Readonly<{
    [child: string]: AnyWidget;
}>>(spec: CompositeSpec<P, O, I, E, C>): Composite<P, O, I, E, C>;
export type At = Readonly<{
    own: unknown;
    children: Readonly<{
        [child: string]: unknown;
    }>;
    synced: Readonly<{
        [child: string]: unknown;
    }>;
}>;
export type Done = Readonly<{
    at: At;
    outs: readonly Out[];
}>;
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
declare function deliver(widget: AnyWidget | AnyGenerated, state: unknown, path: Path, input: unknown): Result<unknown, Out>;
/**
 * Starts a widget: its first state, and the effects its `init`, and every descendant's, emit, bubbled as any effects
 * are. Children start first, so the composite's own first effects can `send` to them
 * @param {AnyWidget | AnyGenerated} widget - The widget
 * @param {unknown} props - Its props
 * @returns {Result<unknown, Out>} The state, and the effects that reach the host
 */
declare function start(widget: AnyWidget | AnyGenerated, props: unknown): Result<unknown, Out>;
export type Target = Readonly<{
    owner: Path;
    part: string;
    item: Key | null;
}>;
export type ResolvedAria = string | number | boolean | Target | readonly Target[] | Outside | null;
export type Node = Readonly<{
    target: Target;
    role: string | null;
    aria: Readonly<{
        [name: string]: ResolvedAria;
    }>;
    data: Readonly<{
        [name: string]: string | boolean | null;
    }>;
    tabindex: number | null;
    hidden: boolean;
    popup: Readonly<{
        anchor: Target | null;
    }> | null;
    listens: readonly string[];
    content: readonly Drawn[];
}>;
export type Drawn = Node | Readonly<{
    text: string;
}> | Readonly<{
    item: Key;
    source: string;
}>;
/**
 * The tree a renderer draws: every part from the outermost widget's root down, each repeated part called only for
 * the keys its parent gives (the window)
 * @param {Drawable} widget - The outermost widget
 * @param {unknown} state - Its state
 * @param {unknown} props - Its props
 * @returns {Node} The root part
 */
declare function resolve(widget: Drawable, state: unknown, props: unknown): Node;
export { compose, deliver, isRecord, recorder, resolve, same, start, typeOf };
