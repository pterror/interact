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

## rebindKeys(options?), rebindMouse(), rebindPad(options), rebindAxes(options?)

```ts
function rebindKeys(options?: KeysOptions): Input
type KeysOptions = Readonly<{ syntax?: readonly KeySyntax[]; layout?: Watched<Layout> }>
```

Each input as the settings panel shows and records it. `rebindPad({ pads })` is recordable only while a pad is
connected; `rebindAxes({ pads?, syntax?, layout? })` records an axis.

## settingsKeys(schema), settingsRow(options), settingsChip(options), settingsPrompt(options), settingsQuestion(options), settingsRecorder(options), conflictQuestion(options)

The settings panel's pieces: the ids shown (a Drawn), a row's contents (a Facet), one binding's chip, the prompt in
place of the binding being recorded, the question asked when a binding is another id's, the recorder that follows a
`recording()`, and the question's state (`offer(slot, binding)`, `accept()`, `cancel()`) over `rebind()`'s `put` and
`replace`.
