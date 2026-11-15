# Ready-made UI

Each builds into the element it is given: light DOM, no shadow root, no stylesheet, state only as `aria-*` and `data-*`
attributes; the only inline style is geometry that is behaviour. Each is a short composition of the pieces below and
`@pterror/interact-list`, so an app can copy it and replace one piece.

```ts
type Entry = Readonly<{
  label: string
  category?: string
  hidden?: boolean
  keys?: readonly string[]
  mouse?: readonly string[]
  pad?: readonly string[]
  axes?: readonly string[]
}>
type Facet = Readonly<{
  apply: (key: string | Header, element: Element) => void
  watch: (listener: () => void) => () => void
}>
```

## cheatsheet(options)

```ts
function cheatsheet(
  options: CheatsheetOptions,
): Readonly<{ open: Watched<boolean> & { set: (open: boolean) => void }; stop: () => void }>
type CheatsheetOptions = Readonly<{
  element: HTMLElement
  schema: Readonly<Record<string, Entry>>
  overrides?: Watched<Overrides>
  applies?: (id: string) => boolean
  layout?: Watched<Layout>
  modifier?: string // default "$mod"
  delay?: number // default 1000 ms
  target?: EventTarget
  strings?: StringsOption
}>
```

Every bound id not hidden, grouped by category (`role=group`, labelled by its header row), its bindings as spans of
`<kbd>`s, axes included; `aria-disabled` where `applies(id)` is false. Opens while `modifier` is held alone for `delay`
ms, until let go, or tapped twice, until tapped twice again; Escape or a press outside closes it. Open, it is a manual
popover centred on the viewport with focus, given back as it closes.

Pieces: `cheatsheetKeys({ bindings, open })` (the ids, as a Drawn), `cheatsheetRow({ entryOf, parts, watch })` (a row's
contents, as a Facet), `cheatsheetTrigger({ open, to, modifier?, delay?, target? })` (when it opens),
`categoryHeaders({ drawn, categoryOf, prefix })` (a header row before each category, for groupMount),
`focusReturn({ element, open })` (focus back on closing), and `bindingParts`.

## radialMenu(options)

```ts
function radialMenu(
  options: RadialMenuOptions,
): Readonly<{ openAt: (point?: Point) => void; close: () => void; open: Watched<boolean>; stop: () => void }>
type RadialMenuOptions = Readonly<{
  element: HTMLElement
  items: () => readonly Item[]
  radius?: number
  size?: number
  rest?: number
}>
type Item = Readonly<{ label: string; run: () => void; when?: () => boolean }>
type Point = Readonly<{ x: number; y: number }>
```

The first eight items, evenly round `point` (default the viewport's centre); read each time it opens. `role=menu`, items
`role=menuitem`, the active one `data-active` and named by `aria-activedescendant`, one that doesn't apply
`aria-disabled`. Open, it is a manual popover centred on the point, with focus; its keys are bound on itself (arrows,
Tab, Shift+Tab, Enter, Space). `rest` is how long the pointer rests on an item to make it active.

Pieces: `radialPlace({ radius?, size? })` (a Place: slot `rank` round the circle, rank 0 at the top, clockwise, in a box
`extent` px square), `radialStep(keys)` (a Step round the filled slots, and `toward(slot)`, the filled slot nearest a
direction), `focusReturn`.

## palette(options)

```ts
function palette(options: PaletteOptions): Readonly<{ open: Cell<boolean>; stop: () => void }>
type PaletteOptions = Readonly<{
  element: HTMLElement
  commands: () => readonly PaletteCommand[]
  matches?: (command: PaletteCommand, query: string) => boolean
  strings?: StringsOption // `commands` labels the dialog, `typeCommand` is the field's placeholder
  layout?: Readonly<{ get: () => ReadonlyMap<string, string> | undefined }>
  rest?: number
}>
type PaletteCommand = Readonly<{
  id: string
  label: string
  run: (event: Event) => boolean | void
  when?: () => boolean
  keys?: readonly string[]
  mouse?: readonly string[]
  pad?: readonly string[]
}>
type Cell<T> = Readonly<{ get: () => T; set: (value: T) => void; watch: (listener: () => void) => () => void }>
```

A command is one keybinds() binds, with an `id` and a `label`. Opening reads `commands()` and keeps those whose `when`
holds; the field starts empty and the first command is active. Typing keeps the commands `matches` accepts (default:
every word typed is in the label, ignoring case), in their order, and makes the first active. `role=dialog` holding a
`role=combobox` field (naming the active option by `aria-activedescendant`) and a `role=listbox`; each option holds a
`<span>` with the label and a span of `<kbd>`s per binding; the active one is `data-active` and `aria-selected=true`. Up
and Down move (wrapping), Enter or a click runs (closing first, focus back where it was, `run` given the press or
click), the pointer resting `rest` ms makes one active, Escape or a press outside closes. Open, it is a manual popover
centred on the viewport with focus in its field.

Pieces: list's `textValue({ field })` (the query) and `filtered({ list, query, matches })` (the matching keys, a list
with holds of its own), `cheatsheetRow`, `bindingParts`, `focusReturn`.

## contextMenu(options)

```ts
function contextMenu(options: ContextMenuOptions): Readonly<{
  openAt: (anchor: Anchor, commands: readonly PaletteCommand[]) => void
  close: () => void
  open: Watched<boolean>
  stop: () => void
}>
type ContextMenuOptions = Readonly<{
  element: HTMLElement
  strings?: StringsOption // `actions` labels the menu
  layout?: Readonly<{ get: () => ReadonlyMap<string, string> | undefined }>
  rest?: number
}>
type Anchor = Readonly<{
  getBoundingClientRect: () => Readonly<{ left: number; top: number; right: number; bottom: number }>
}>
```

`openAt` opens the commands below an anchor (a point: `{ getBoundingClientRect: () => new DOMRect(x, y, 0, 0) }`, or an
element), afresh if open; with no commands it stays closed. `role=menu`, items `role=menuitem` (label and `<kbd>`s as in
the palette), the active one `data-active` and named by `aria-activedescendant`, one whose `when` is false
`aria-disabled` (it doesn't run). Open, it is a manual popover kept inside the window, with focus; Up and Down move
(wrapping), Home and End go to the ends, Enter, Space or a click runs (closing first, focus back), Escape or a press
outside closes. A `RightClick` binding that runs cancels the browser's own menu (`mouseListen`).

## settings(options)

```ts
function settings(options: SettingsOptions): () => void
type SettingsOptions = Readonly<{
  element: HTMLElement
  schema: Readonly<Record<string, Entry>>
  overrides: Watched<Overrides> & Readonly<{ set: (overrides: Overrides) => void }>
  inputs: readonly Input[]
  releases?: boolean
  holds?: boolean
  sequences?: boolean
  pause?: number // default 1000 ms
  strings?: StringsOption
}>
type Input = Readonly<{
  field: 'axes' | 'keys' | 'mouse' | 'pad'
  label: string
  prompt: (release: boolean) => string
  record: (options: RecordOptions) => () => void
  lookup: (binding: string) => string
  parts: (binding: string) => readonly string[]
  available?: () => boolean
  watch?: (listener: () => void) => () => void
}>
```

Rows per id not hidden, grouped by category; each piece names itself in `data-keybinds` (`reset-all`, `bindings`,
`binding`, `keys`, `invert`, `release`, `remove`, `add`, `reset`, `prompt`, `record-release`, `record-hold`,
`record-tap`, `record-steps`, `record-done`, `conflict`, `replace`, `cancel`); switches are `aria-pressed`; a changed
row is `data-changed`. Returns stopping, which takes out what it put in.

## Strings

```ts
const defaultStrings: Strings // every word, in English
type Strings = Readonly<Record<string, string | ((value: string) => string)>> // by name: resetAll, reset, remove, ...
type StringsOption = Readonly<Partial<Strings>> | undefined
function withStrings(strings?: StringsOption): Strings
```

Every word the cheatsheet, settings panel, palette and menu show comes from a `strings` option holding any of
`defaultStrings` to replace; the rest stay English. The panel's inputs (`rebindKeys`, `rebindMouse`, `rebindPad`,
`rebindAxes`) take their own, for their names, prompts and how a binding's parts read (`bindingParts`, `formatKey`,
`formatMouse`, `formatPad`, `formatAxis`, `formatSteps` and `formatModifier` take it last). A string that holds a value
is a function of it: `alreadyBound(label)`, `add(input)`, `stepsSoFar(steps)`. Symbols (arrows, ⌘, key letters) are not
words and are not in it. Modifiers show as symbols on a Mac and as `ctrl`, `alt` and `shift` elsewhere.

## byPlatform({ mac, other })

Chooses by the platform `$mod` is decided by: `keys: byPlatform({ mac: ['alt+Escape'], other: ['ctrl+Space'] })` is the
Mac's binding on a Mac and the other elsewhere. Its second argument, whether this is a Mac, defaults to whether it is.

## rebindKeys(options?), rebindMouse(), rebindPad(options), rebindAxes(options?)

```ts
function rebindKeys(options?: KeysOptions): Input
type KeysOptions = Readonly<{ syntax?: readonly KeySyntax[]; layout?: Watched<Layout>; strings?: StringsOption }>
```

Each input as the settings panel shows and records it. `rebindPad({ pads })` is recordable only while a pad is
connected; `rebindAxes({ pads?, syntax?, layout? })` records an axis.

## settingsKeys(schema), settingsRow(options), settingsChip(options), settingsPrompt(options), settingsQuestion(options), settingsRecorder(options), conflictQuestion(options)

The settings panel's pieces: the ids shown (a Drawn), a row's contents (a Facet), one binding's chip, the prompt in
place of the binding being recorded, the question asked when a binding is another id's, the recorder that follows a
`recording()`, and the question's state (`offer(slot, binding)`, `accept()`, `cancel()`) over `rebind()`'s `put` and
`replace`.
