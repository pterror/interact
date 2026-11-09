# API

Every function here is exported from the package and from its own module (`@pterror/interact-keybinds/<file>`, the
kebab-case name: `key-listen` for `keyListen`). The ready-made UI and its pieces are in [Ready-made UI](./ui).

## Shapes

```ts
type Modifiers = Readonly<{ ctrl: boolean; alt: boolean; shift: boolean; meta: boolean }>
type Query = Readonly<{ exact: readonly string[]; bare: readonly string[]; mods: Modifiers }>
type Handler = Readonly<{ run: (event: Event) => boolean | void; when?: () => boolean; typing?: boolean }>
type Find = (query: Query) => readonly Handler[]
type Press = Readonly<{ id: string; query: Query; event: Event; typing: boolean; repeat: boolean }>
type Release = Readonly<{ id: string; event: Event; typing: boolean; blocked: boolean }>
type Sink = Readonly<{ down: (press: Press) => Handler | undefined; up: (release: Release) => void }>
type Test<T> = Readonly<{
  has: (value: T) => boolean
  watch: (listener: (values?: readonly T[]) => void) => () => void
}>
type Watched<T> = Readonly<{ get: () => T; watch: (listener: () => void) => () => void }>
type AxisValue = Readonly<{ position: number; delta: number }>
```

The engine's modules are generic over the query and handler types (`presses<Q, H>`); the signatures below write them as
Query and Handler.

## keybinds(bindings, options?)

```ts
function keybinds(
  bindings: readonly Binding[],
  options?: KeybindsOptions,
): (() => void) & { axis: (axis: Axis) => AxisValue }
type Binding = Command | Axis
type Command = Readonly<{
  keys?: readonly string[]
  mouse?: readonly string[]
  pad?: readonly string[]
  run: (event: Event) => boolean | void
  when?: () => boolean
  typing?: boolean
  anyModifiers?: boolean
}>
type Axis = Readonly<{ axes: readonly string[]; when?: () => boolean }>
type KeybindsOptions = Readonly<{
  target?: EventTarget // default the window
  capture?: boolean
  syntax?: readonly KeySyntax[]
  releases?: boolean // "k:up"
  holds?: boolean | Readonly<{ delay?: number }> // "k:hold", "k:tap"; default 500 ms
  sequences?: boolean | Readonly<{ timeout?: number }> // "g i"; default 1000 ms
  wheel?: Readonly<{ step?: number; idle?: number }> // default 50 px, 200 ms
  pads?: Pads
}>
```

The ready-made composition: routes each binding string by its suffix and steps to the table that runs it, and listens to
each input with the overlay rule (`outsideOverlay(target)`; `focusInOverlay(target)` for gamepads and axes). Returns
stopping, and `axis(axis)`: one of the axes given, read now (zero while its `when` is false or an overlay holds focus).
Throws, naming the binding, for invalid syntax, syntax whose option is off, a sequence ending in a suffix, a binding
that is also the start of a sequence, or `axis()` given an axis it wasn't.

## presses(find)

```ts
function presses(find: Find): Presses
type Presses = Sink & Readonly<{ held: Test<Handler>; took: (id: string) => readonly Handler[] }>
```

Runs the first handler that applies and doesn't return `false`, and takes the event (prevents its default, stops it). A
repeat runs again; an up ends the press. `held` holds a handler while a press it took is down.

## releases({ find, to, took })

```ts
function releases(options: ReleasesOptions): Sink
type ReleasesOptions = Readonly<{ find: Find; to: Sink; took: (id: string) => readonly Handler[] }>
```

Release handlers (`k:up`), found by the press's query as it went down, run as it comes up. A handler that took the
press's down (`took`) gets its release whatever its `when` says; the others run as usual, not while `blocked`.

## holds({ hold, tap, delay?, to })

```ts
function holds(options: HoldsOptions): Holds
type HoldsOptions = Readonly<{ hold: Find; tap: Find; delay?: number; to: Sink }>
type Holds = Sink & Readonly<{ held: Test<Handler>; took: (id: string) => readonly Handler[]; stop: () => void }>
```

Hold handlers run once a press lasts `delay` ms (default 500); tap handlers on an up before that. The press goes on to
`to` as usual.

## sequences({ entries, timeout?, to })

```ts
function sequences(options: SequencesOptions): Sink
type SequencesOptions = Readonly<{
  entries: readonly (readonly [readonly string[], Handler])[]
  timeout?: number
  to: Sink
}>
```

Bindings of several steps, each a lookup. A press that starts or continues a sequence that may run is taken; one that
completes it runs its first handler that applies; others go on to `to`. Each step within `timeout` ms (default 1000).

## bindingTable(entries), looseTable(entries), anyOf(...finds)

```ts
function bindingTable(entries: readonly (readonly [string, Handler])[]): Find
function looseTable(entries: readonly (readonly [string, Modifiers, Handler])[]): Find
function anyOf(...finds: readonly Find[]): Find
```

`bindingTable` finds every one of `query.exact`'s lookups' handlers, best first. `looseTable` finds by `query.bare`,
whatever other modifiers are held, the binding's own required. `anyOf` is each in turn, each handler once.

## runFirst(handlers, event, typing), applies(handler, typing), take(event)

```ts
function runFirst(handlers: readonly Handler[], event: Event, typing: boolean): Handler | undefined
function applies(handler: Handler, typing: boolean): boolean
function take(event: Event): void
```

The rule the engine runs by: a handler applies when its `when` holds and, while typing, it has `typing`. `take` prevents
the default and stops the event.

## keyListen({ target, to, capture?, blocked?, query? })

```ts
function keyListen(options: KeyListenOptions): Readonly<{ held: Test<string>; stop: () => void }>
type KeyListenOptions = Readonly<{
  target: EventTarget
  to: Sink
  capture?: boolean
  blocked?: (event: Event) => boolean
  query?: (event: KeyboardEvent) => Query
}>
```

Keys as presses, known by `event.code`; typing is a press in an input, textarea or contenteditable. A modifier alone
never presses; every held key is released when the window loses focus. `held` has each held key's lookups without
modifiers (for `keyPairAxis`).

## mouseListen({ target, to, capture?, blocked?, wheel? })

```ts
function mouseListen(options: MouseListenOptions): () => void
type MouseListenOptions = Readonly<{
  target: EventTarget
  to: Sink
  capture?: boolean
  blocked?: (event: Event) => boolean
  wheel?: WheelOptions
}>
type WheelOptions = Readonly<{ bound: (query: Query) => boolean; step?: number; idle?: number }>
```

Buttons as presses; a side button whose press or release was taken doesn't navigate. With `wheel`, scrolling is a press
per notch or per `step` px (default 50); the page is held still while `bound` says a step has a binding, and a pause of
`idle` ms (default 200) ends the gesture.

## pads(view?), padButtons({ pads, to, blocked? })

```ts
function pads(view?: EventTarget): Pads
type Pads = Readonly<{ get: () => readonly Pad[]; watch: (listener: () => void) => () => void }>
type Pad = Readonly<{
  index: number
  axes: readonly number[]
  buttons: readonly Readonly<{ pressed: boolean; value: number }>[]
}>
function padButtons(options: PadButtonsOptions): () => void
type PadButtonsOptions = Readonly<{ pads: Pads; to: Sink; blocked?: () => boolean }>
```

`pads` reads the connected gamepads each animation frame, only while one is connected and something watches.
`padButtons` gives each button going down as a press, looked up by its standard name.

## outsideOverlay(listener), focusInOverlay(listener)

```ts
function outsideOverlay(listener: EventTarget): (event: Event) => boolean
function focusInOverlay(listener: EventTarget): () => boolean
```

The overlay rule: true when an open `<dialog>`, popover or `[data-keybinds-modal][open]` lies between the event's target
(or the focused element) and `listener`, inside shadow roots too.

## keyParse(binding, syntax?), keyQuery(event, syntax?)

```ts
function keyParse(binding: string, syntax?: readonly KeySyntax[]): ParsedKey
function keyQuery(event: KeyEvent, syntax?: readonly KeySyntax[]): Query
type ParsedKey = Readonly<{ lookup: string; bare: string; mods: Modifiers }>
type KeySyntax = Readonly<{
  alias?: (name: string) => string | undefined
  accepts?: (key: string, mods: Modifiers) => boolean
  shifted?: (key: string) => string | undefined
  lookups?: (key: string, mods: Modifiers, held: Modifiers) => readonly string[]
  fallback?: (key: string, held: Modifiers) => readonly string[]
}>
```

One step of a key binding, and a key event's lookups (the key typed, its code, its letter, then the syntax's, then the
syntax's fallbacks). Syntax whose piece isn't given throws, naming the piece.

## symbols(), aliases(), printed()

```ts
function symbols(): Symbols
function aliases(): KeySyntax
function printed(): Printed
```

Key syntax pieces: any typed character as itself; `up`/`down`/`left`/`right`/`plus` (also `keyAliases`); the key
`printed`, a fallback lookup for any key typing one character with no Ctrl, Alt or Meta.

## mouseParse(binding, suffix?), padParse(binding), splitBinding(binding)

```ts
function mouseParse(binding: string, suffix?: string): ParsedMouse
function padParse(binding: string): ParsedPad
function splitBinding(binding: string): Readonly<{ steps: readonly string[]; suffix: Suffix }>
```

One step of a mouse or gamepad binding (`mouseButtons`, `padAliases` and `padButtonNames` are their names; `mouseName`
names an event's button); and a binding's steps and suffix (`:up`, `:hold`, `:tap`), whatever syntax is on.

## Modifiers: parseModifiers(parts), eventModifiers(event), modifierPrefix(mods), eventModifierParts(event), formatModifier(part)

`$mod` is Meta when `isMac`, Ctrl elsewhere; `noModifiers` has none held.

## Axes: keyPairAxis(held, negative, positive), mouseAxis(options), padAxis(pads, axis), sumAxis(values), scaleAxis(value, factor), axisWhen(value, when), axisParse(binding, syntax?)

```ts
function keyPairAxis(
  held: Readonly<{ has: (lookup: string) => boolean }>,
  negative: string,
  positive: string,
): () => AxisValue
function mouseAxis(
  options: Readonly<{ target: EventTarget; axis: 'x' | 'y'; capture?: boolean }>,
): Readonly<{ read: () => AxisValue; stop: () => void }>
function padAxis(pads: Readonly<{ get: () => readonly Pad[] }>, axis: string): () => AxisValue
function sumAxis(values: readonly (() => AxisValue)[]): () => AxisValue
function scaleAxis(value: () => AxisValue, factor: number): () => AxisValue
function axisWhen(value: () => AxisValue, when: () => boolean): () => AxisValue
function axisParse(binding: string, syntax?: readonly KeySyntax[]): ParsedAxis
```

Each axis is read when the app asks: its position from -1 to 1 and its movement since the last read. `sumAxis` keeps the
position from -1 to 1; `axisWhen` reads zero (still reading, so nothing is kept for later) while `when` is false.

## Showing: formatKey(binding, layout?), formatMouse(binding), formatPad(binding), formatAxis(binding, layout?), formatSteps(binding, format), bindingParts(entry, layout?), layout(view?)

```ts
function formatKey(binding: string, layout?: ReadonlyMap<string, string>): string[]
function formatSteps(binding: string, format: (step: string) => readonly string[]): string[]
function bindingParts(entry: Entry, layout?: ReadonlyMap<string, string>): readonly (readonly string[])[]
function layout(view?: EventTarget): Watched<Layout>
```

`formatKey`, `formatMouse`, `formatPad` and `formatAxis` format one step; `formatSteps` adds `then` between steps and
`Release`, `Hold` or `Tap` for a suffix. `bindingParts` is every binding of an entry (keys, mouse, pad, axes).
`layout()` is the keyboard layout's glyph map (`navigator.keyboard.getLayoutMap()`), followed as it changes; undefined
where the browser can't tell. `punctuation` is the table of punctuation keys parsing and formatting share.

## Modifiers alone: modifierAlone(options), modifierHold(options), modifierTaps(options)

```ts
function modifierHold(options: ModifierHoldOptions): () => void
type ModifierHoldOptions = Readonly<{
  modifiers: readonly string[]
  to: (held: boolean) => void
  delay?: number
  target?: EventTarget
}>
function modifierTaps(options: ModifierTapsOptions): () => void
type ModifierTapsOptions = Readonly<{
  modifiers: readonly string[]
  run: () => void
  count?: number
  within?: number
  target?: EventTarget
}>
```

A modifier pressed and let go on its own: held for `delay` ms (default 200); tapped `count` times (default 2), each
within `within` ms (default 400). Anything else while it is down spoils it.

## Modifiers held: modifierHeld(options)

```ts
function modifierHeld(options: ModifierHeldOptions): ModifierHeld
type ModifierHeldOptions = Readonly<{
  modifier: 'Alt' | 'Control' | 'Meta' | 'Shift'
  target?: EventTarget
}>
type ModifierHeld = Readonly<{ get: () => boolean; watch: (listener: () => void) => () => void; stop: () => void }>
```

Whether a modifier is held now, alone or with other keys, as a Watched (Alt held during a drag to keep both places). It
follows the modifier flags every key and pointer event carries, so a press it missed is caught up by the next event; the
window losing focus lets go.

## Rebinding: bindingStore(storage), localStorageBindings(key, view?), bound(schema, overrides), rebind(options), changedFields(defaults, bindings), findConflict(bindings, candidate), bindingLookup(parse), flipRelease(binding)

```ts
function bindingStore(
  storage: Storage,
): Watched<Overrides> & Readonly<{ set: (overrides: Overrides) => void; stop: () => void }>
type Storage = Readonly<{
  load: () => Overrides
  save: (overrides: Overrides) => void
  subscribe?: (listener: (overrides: Overrides) => void) => () => void
}>
type Overrides = Readonly<Record<string, Fields>>
type Fields = Readonly<{
  keys?: readonly string[]
  mouse?: readonly string[]
  pad?: readonly string[]
  axes?: readonly string[]
}>
function bound(schema: Readonly<Record<string, Rebindable>>, overrides: Overrides): Readonly<Record<string, Rebindable>>
```

`bindingStore` keeps people's overrides in a storage; `localStorageBindings` is one in localStorage, read leniently,
that hears other tabs. `bound` lays the overrides over a schema. `rebind({ schema, overrides })` gives the edits, each
one write (`put`, `remove`, `replace`, `reset`, `resetAll`) and `changed(id)`; `changedFields` is what an override
keeps. `findConflict` is the id a binding already belongs to, by `bindingLookup`'s normal form. `flipRelease` turns `k`
into `k:up` and back.

## Recording: recording(options), recordKey(options), recordMouse(options), recordPad(options), recordAxis(options)

```ts
function recording(options: RecordingOptions<Slot>): Recording<Slot>
type RecordingOptions<S> = Readonly<{
  done: (slot: S, binding: string) => void
  pause?: number
  takesSuffix?: (slot: S, binding: string) => boolean
}>
function recordKey(options: RecordKeyOptions): () => void
type RecordKeyOptions = Readonly<{
  done: (binding: string) => void
  target?: EventTarget
  release?: boolean
  syntax?: readonly KeySyntax[]
  ignore?: (event: Event) => boolean
}>
```

`recording` is the state of recording one slot (a suffix, or steps taken after a pause of `pause` ms, default 1000),
handing `done(slot, binding)`. Each recorder records from what is done next: a key (Escape and modifiers alone left
alone), a click or scroll, a gamepad button, or an axis (the mouse moved, a stick pushed, or two keys).
`keyBinding(event)` and `mouseBinding(event)` are an event as a binding.
