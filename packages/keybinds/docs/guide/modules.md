# Modules

`keybinds()` is a few dozen lines wiring the modules below. An app that wants something it doesn't do wires them itself.
Each module takes small functions and records (the shapes it declares) and gives the same; nothing registers anything.

## The shapes

```ts
type Modifiers = Readonly<{ ctrl: boolean; alt: boolean; shift: boolean; meta: boolean }>
// A press's lookups, best first; the same without modifiers; and the modifiers held
type Query = Readonly<{ exact: readonly string[]; bare: readonly string[]; mods: Modifiers }>
// Runs unless when() is false; returning false leaves the event to others; typing: also in a text field
type Handler = Readonly<{ run: (event: Event) => boolean | void; when?: () => boolean; typing?: boolean }>
// Every handler bound to a query, best first
type Find = (query: Query) => readonly Handler[]
type Press = Readonly<{ id: string; query: Query; event: Event; typing: boolean; repeat: boolean }>
type Release = Readonly<{ id: string; event: Event; typing: boolean; blocked: boolean }>
// down gives the handler that took the press, if one did
type Sink = Readonly<{ down: (press: Press) => Handler | undefined; up: (release: Release) => void }>
```

An input (`keyListen`, `mouseListen`, `padButtons`) turns events into presses and hands them to a Sink. The engine
(`presses`, `releases`, `holds`, `sequences`) is Sinks over Finds; a table (`bindingTable`, `looseTable`, `anyOf`) is a
Find. A binding string is parsed by its input's parser (`keyParse`, `mouseParse`, `padParse`) to the lookup a table keys
it by.

## The keyboard, by hand

```js
import { bindingTable, keyListen, keyParse, keyQuery, outsideOverlay, presses } from '@pterror/interact-keybinds'

const find = bindingTable([[keyParse('$mod+s').lookup, { run: () => save() }]])
const listening = keyListen({
  blocked: outsideOverlay(window),
  query: (event) => keyQuery(event),
  target: window,
  to: presses(find),
})
// listening.stop(); listening.held is the keys down, for axes
```

`blocked` is the overlay rule for where this listener listens: `outsideOverlay(target)` leaves alone an event that
happened inside an open dialog or popover lying between its target and `target`. Gamepads have no event target:
`padButtons` takes `blocked: focusInOverlay(target)`, the same rule applied to the focused element.

## Releases, holds and sequences

Each wraps the Sink it hands presses on to; the listener feeds the outermost:

```text
keyListen → sequences → releases → holds → presses
```

```js
const pressing = presses(bindingTable(pressBindings))
const holding = holds({ hold: bindingTable(holdBindings), tap: bindingTable(tapBindings), to: pressing })
const took = (id) => [...holding.took(id), ...pressing.took(id)]
const releasing = releases({ find: bindingTable(upBindings), to: holding, took })
const sequenced = sequences({ entries: [[['g', 'i'], { run: goToInbox }]], to: releasing })
keyListen({ blocked: outsideOverlay(window), query: (event) => keyQuery(event), target: window, to: sequenced })
```

- `presses(find)` runs the first handler that applies (its `when` holds, it may run while typing, it doesn't return
  `false`), prevents the event's default and stops it. A repeat runs again. `held` and `took(id)` say what a press that
  is down took.
- `releases({ find, to, took })` runs release handlers as a press comes up. A handler that took the press's down
  (`took(id)`) always gets its release, so a hold can't be left open; the others run only if they apply.
- `holds({ hold, tap, delay, to })` runs hold handlers once a press lasts `delay` ms (default 500), tap handlers on a
  shorter press; `stop()` clears its timer.
- `sequences({ entries, timeout, to })`: a press that starts or continues a sequence is the sequence's; one that
  completes it runs its handler; anything else goes on to `to`. Each step within `timeout` ms (default 1000).

A table finds every lookup's handlers, best first: `bindingTable` by `query.exact`, `looseTable` by `query.bare` with
the binding's own modifiers required (`anyModifiers`), `anyOf(...finds)` each in turn. So a handler on the first lookup
that doesn't apply leaves the press to those on later ones.

## Typeahead: printed()

```js
const syntax = [printed()]
const find = bindingTable([
  [keyParse('Space', syntax).lookup, { run: select, when: () => !typing.get() }],
  [keyParse('printed', syntax).lookup, { run: (event) => type(event.key) }],
])
keyListen({ blocked: outsideOverlay(box), query: (event) => keyQuery(event, syntax), target: box, to: presses(find) })
```

`printed` is a fallback lookup, after every other, so Space selects unless a prefix is being typed, and is typed then.

## The mouse and gamepads

`mouseListen({ target, to, blocked, wheel })` gives buttons as presses (`click`, `middle`, `back`, ...), and with
`wheel: { bound, step, idle }` scrolling as presses; `bound(query)` says whether a step has a binding that applies, so
the page is held still only during a bound gesture. `pads()` reads the connected pads each frame, only while one is
connected and something watches; `padButtons({ pads, to, blocked })` gives their buttons as presses. Recording uses the
same `pads()`.

## Axes

An axis is a Value, `() → { position, delta }`, read when the app asks: `keyPairAxis(held, negative, positive)` over
`keyListen`'s `held`, `mouseAxis({ target, axis })` (`{ read, stop }`), `padAxis(pads, axis)`, `sumAxis(values)`,
`scaleAxis(value, factor)` (−1 inverts), `axisWhen(value, when)` (zero while `when` is false). `axisParse` reads
`mouse:x`, `-pad:ry`, `keys:a/d`.

## Showing bindings

`formatKey(binding, layout)`, `formatMouse`, `formatPad` and `formatAxis` give one step's display parts (`$mod+k` is
`["⌘", "K"]` on a Mac); `formatSteps(binding, format)` adds `then` between steps and `Release`, `Hold` or `Tap` for a
suffix; `bindingParts(entry, layout)` gives every binding of a command. `layout()` is the person's keyboard layout as a
Watched glyph map, where the browser can tell.

## Modifiers alone

`modifierHold({ modifiers, delay, to })` is true once a modifier is held on its own for `delay` ms, false when let go;
`modifierTaps({ modifiers, count, within, run })` runs on a modifier tapped `count` times; both are made from
`modifierAlone`. The cheatsheet's trigger (`cheatsheetTrigger`) is the two together.
