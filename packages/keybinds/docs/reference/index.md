# API Reference

## keybinds(commands, getContext?, options?)

Main entry point. Listens through the inputs it's given.

```ts
function keybinds(
  commands: Command[],
  getContext?: () => Record<string, unknown>,
  options?: {
    inputs?: Input[]
    releases?: Phase // releases()
    anyModifiers?: AnyModifiers // anyModifiers()
    holds?: Phase // holds()
    sequences?: Sequences // sequences()
    target?: EventTarget
    onExecute?: (cmd, ctx) => void
    capture?: boolean
    axes?: AxisDef[]
  },
): (() => void) & { held(id: string): boolean; axis(id: string): { position: number; delta: number } }
```

| Option         | Default  | Description                                                                                                                                                                                                   |
| -------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `inputs`       | `[]`     | What to listen to, e.g. `[keys(), mouse()]`. A command with bindings no input reads (gamepad bindings without `gamepad()`, say) is an error                                                                   |
| `releases`     | -        | `releases()`: bindings to an input coming up (`k:up`). Without it, such a binding is an error                                                                                                                 |
| `anyModifiers` | -        | `anyModifiers()`: commands with `anyModifiers: true` match whatever other modifiers are held. Without it, such a command is an error                                                                          |
| `holds`        | -        | `holds({ delay? })`: `k:hold` runs once held `delay` ms (default 500), `k:tap` on a shorter press                                                                                                             |
| `sequences`    | -        | `sequences({ timeout? })`: bindings of several steps (`g i`, `ctrl+k ctrl+s`), each within `timeout` ms (default 1000) of the last                                                                            |
| `target`       | `window` | Where to listen                                                                                                                                                                                               |
| `onExecute`    | -        | Called after a command consumes an event                                                                                                                                                                      |
| `capture`      | `false`  | Listen in the capture phase, so a bound key reaches its command before anything under `target` (an editor, say) handles it. A key with no active command, or whose command returns `false`, goes on as usual. |
| `axes`         | `[]`     | Continuous inputs, read with `axis(id)`; needs `axes()` among the inputs                                                                                                                                      |

**Returns:** Cleanup function to remove listeners. It also has `held(id)`: whether a command is held right now (its
press fired, and that key or button hasn't come up), for controls read every frame rather than per event, and
`axis(id)`.

```js
import { keybinds, keys } from '@pterror/interact-keybinds'

const kb = keybinds(commands, () => ({ editing: false }), { inputs: [keys()] })
if (kb.held('forward')) walk()
// Later:
kb()
```

---

## Inputs

Each kind of input is its own module, so an app only ships the ones it uses. Each also has a UI half, which shows and
records its bindings for the settings panel, the cheatsheet, and a command system's menus and palette; an app without
those components doesn't ship it.

| Input                                     | With its UI half                         | Bindings                                                      |
| ----------------------------------------- | ---------------------------------------- | ------------------------------------------------------------- |
| `keys()` from `keybinds/keys`             | `keysUI()` from `keybinds/keys-ui`       | `keys: ['$mod+k', 'Escape', '?', 'k:up']`                     |
| `mouse({ wheel? })` from `keybinds/mouse` | `mouseUI()` from `keybinds/mouse-ui`     | `mouse: ['$mod+Click', 'MiddleClick', 'Back:up', 'ScrollUp']` |
| `gamepad()` from `keybinds/gamepad`       | `gamepadUI()` from `keybinds/gamepad-ui` | `gamepad: ['a', 'rt', 'start:up']`                            |
| `axes()` from `keybinds/axes`             | `axesUI()` from `keybinds/axes-ui`       | an axis's `axes: ['mouse:x', '-pad:ry', 'keys:a/d']`          |

A UI half is the input plus more, so it goes in the same `inputs` list: `[keysUI(), mouseUI()]`.

`mouse({ wheel: { step, idle } })`: a scroll binding runs once per `step` pixels scrolled (default 50, about one
mouse-wheel notch), and `idle` ms without scrolling (default 200) ends a gesture.

An input is a plain object, so a new kind of input (a MIDI controller, say) is written the same way:

```ts
interface Input {
  field: string // the command field holding its bindings
  axis?: boolean // its bindings are an axis's sources
  parse(step: string, suffix: string): { lookup: string; loose: string; mods: Modifiers } // one step, without its suffix; throws if invalid
  matches?(cmd: Command, event: Event): boolean
  listen(d: Dispatch): (() => void) & { axis?(id: string): AxisValue }
}

interface InputUI extends Input {
  ui: true // says it's a UI half; a bare input has no ui, or ui: false
  label: string // what one binding is called, for "+ Key"
  format(binding: string): string[]
  release?(binding: string): boolean // whether a binding can be its ":up" form
  invert?: boolean // bindings can be inverted with a leading "-"
  available?(): boolean // whether it can be recorded right now
  watch?(onChange: () => void): () => void
  record?(
    options: { release: boolean; ignore(e: Event): boolean; target?: Window },
    done: (binding: string) => void,
  ): () => void
  prompt?(release: boolean): string
}
```

`listen` gets a `Dispatch`: the target, the context, this input's held presses, and `down(id, event, { mods, lookups })`
/ `up(id, event)` to report a press starting and ending. The core runs what's bound and lets releases, holds and
sequences do their part. `lookups(suffix, mods)` gives the event's lookups. See `src/keys.js` for a complete one.

---

## formatKeyParts(binding, syntax?) and formatBinding(input, binding)

A binding as the parts shown for it, each on its own key cap.

```ts
function formatKeyParts(binding: string, syntax?: KeySyntax[]): string[]
function formatBinding(input: InputUI, binding: string): string[]
```

```js
formatKeyParts('$mod+k') // ["⌘", "K"] on a Mac, ["Ctrl", "K"] elsewhere
formatBinding(keysUI(), 'Escape') // the same, through an input's UI half: ["Esc"]
```

`syntax` is what was given to `keys()`; with a `layout()` among it, physical keys show as the layout types them.
`formatMouseParts`, `formatGamepadParts` and `formatAxisParts` do the same for the other inputs.
---

## defineSchema(schema)

Identity function for type inference when defining binding schemas.

```ts
function defineSchema<T extends Schema>(schema: T): T
```

```js
const schema = defineSchema({
  save: { label: 'Save', keys: ['$mod+s'] },
})
```

---

## withOverride(binding, override)

One command's or axis's bindings with a person's override laid over them. The fields an override can set (`keys`,
`mouse`, `gamepad`, `axes`) come back typed as any list of bindings, since an override can hold any binding.

```ts
function withOverride<B extends BindingSchema>(binding: B, override: BindingOverride | undefined): Bound<B>
type Bound<B> = Readonly<Omit<B, 'axes' | 'gamepad' | 'keys' | 'mouse'>> & Rebindable
```

---

## fromBindings(bindings, handlers, options?)

Create commands from a schema, or from a store (its overrides apply), and handlers. Handler and option ids are the
schema's ids, so a misspelled one is a type error.

```ts
function fromBindings<T extends Schema>(
  bindings: T | BindingsStore<T>,
  handlers: Partial<Record<Id<T>, (ctx, event?) => unknown>>,
  options?: Partial<Record<Id<T>, { when?: (ctx) => boolean; captureInput?: boolean; anyModifiers?: boolean }>>,
): Command[]
```

Throws if a handler has no bindings, since it would never run (for a schema whose ids aren't known to the types).

---

## listBindings(bindings) and entriesOf(bindings)

Each id with its bindings, in the schema's order: from a store as they are in effect, from a schema as given.
`listBindings` leaves out hidden ones, for a settings UI.

```ts
function entriesOf<T extends Schema>(bindings: T | BindingsStore<T>): { binding: Bound<T[Id<T>]>; id: Id<T> }[]
function listBindings<T extends Schema>(bindings: T | BindingsStore<T>): { binding: Bound<T[Id<T>]>; id: Id<T> }[]
```

---

## BindingsStore

Reactive store of people's overrides, kept in localStorage or anywhere else. The schema and the overrides stay apart:
each id's bindings in effect are read one id at a time, typed by that id's own schema entry.

```ts
class BindingsStore<T extends Schema> extends EventTarget {
  constructor(schema: T, storage: string | BindingsStorage)
  readonly schema: T
  ids(): Id<T>[]
  get<K extends Id<T>>(id: K): Bound<T[K]> // a misspelled id is a type error
  entries(): { binding: Bound<T[Id<T>]>; id: Id<T> }[]
  has(id: string): id is Id<T>
  lookup(id: string): Bound<T[Id<T>]> | undefined // for ids from elsewhere
  defaults(id: string): T[Id<T>] | undefined
  getOverrides(): BindingOverrides
  save(overrides: BindingOverrides): void
  dispose(): void
}

type AnyBindingsStore // what code taking a store over any schema reads: everything but get(id), whose ids are T's

type BindingsStorage = {
  load(): BindingOverrides
  save(overrides: BindingOverrides): void
  subscribe?(onChange: (overrides: BindingOverrides) => void): () => void
}

function localStorageBindings(key: string): BindingsStorage
```

A string is a localStorage key (the same as `localStorageBindings(key)`), whose overrides are read back field by field:
anything stored that isn't a list of bindings is left out. Any other storage only needs `load` and `save`. If it can
change from elsewhere (another tab, an undo, sync), give it `subscribe` too and the store follows it; `dispose()` stops
following.

Dispatches a `BindingsChangeEvent` (`'change'`, with the `overrides` now) when overrides are saved, or when the storage
changes. Read the bindings in effect from the store.

```js
const store = new BindingsStore(schema, 'app:keybinds')
store.addEventListener('change', () => {
  console.log(store.get('save').keys)
})
store.save({ save: { keys: ['$mod+Shift+s'] } })
```

---

## eventToBindingString(event)

Convert a KeyboardEvent to a canonical binding string.

```ts
function eventToBindingString(event: KeyboardEvent, syntax?: readonly KeySyntax[]): string | undefined
```

Returns `undefined` for bare modifier presses and keys that can't be bound.

```js
// In a keydown handler:
const binding = eventToBindingString(event) // e.g. "$mod+shift+k"
```

---

## eventToMouseBindingString(event)

Convert a MouseEvent or WheelEvent to a canonical binding string.

```ts
function eventToMouseBindingString(event: MouseEvent): string | undefined
```

```js
// In a mousedown handler:
const binding = eventToMouseBindingString(event) // e.g. "$mod+click"

// Also works with WheelEvent:
const scroll = eventToMouseBindingString(wheelEvent) // e.g. "$mod+scrollup"

// Side buttons are "back" and "forward"; a mouseup / keyup event gives a ":up" binding:
eventToMouseBindingString(mouseupEvent) // e.g. "middle:up"
```

---

## findConflict(bindings, { binding, input, except? })

Check if a binding conflicts with any command in a schema, or in a list of entries such as `store.entries()` (the
bindings in effect). `except` is a command not to check, usually the one being rebound.

```ts
function findConflict(
  bindings: Schema | readonly { binding: BindingSchema; id: string }[],
  candidate: { binding: string; input: Input; except?: string },
): { commandId: string; label: string } | undefined
```

```js
const conflict = findConflict(schema, { binding: '$mod+s', except: 'save', input: keys() })
if (conflict) {
  console.log(`Conflicts with ${conflict.label}`)
}
```

---

## Types

```ts
interface Command {
  id: string
  label: string
  description?: string
  category?: string
  keys?: string[]
  mouse?: string[]
  gamepad?: string[]
  when?: (ctx: Record<string, unknown>) => boolean
  execute: (ctx: Record<string, unknown>, event?: Event) => unknown
  hidden?: boolean
  captureInput?: boolean
  anyModifiers?: boolean // match whatever other modifiers are held
}

interface BindingSchema {
  label: string
  description?: string
  category?: string
  keys?: string[]
  mouse?: string[]
  gamepad?: string[]
  axes?: string[] // an axis's sources, for axes
  hidden?: boolean
}

type Schema = Record<string, BindingSchema>
type BindingOverrides = Record<string, { keys?: string[]; mouse?: string[]; gamepad?: string[]; axes?: string[] }>

interface AxisDef {
  id: string
  label: string
  category?: string
  description?: string
  axes: string[] // "mouse:x", "pad:rx", "keys:a/d", ... with a leading "-" to invert
  when?: (ctx: Record<string, unknown>) => boolean
  hidden?: boolean
}
```
