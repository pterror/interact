# Design

Status: a proposal for the rebuild, in its fifth draft after four reviews. No code exists for it, and it is the owner's
to approve before anything is built.

- Every name in it is a proposal ("Names").
- Every behaviour a person would notice, and every policy, is a parameter or a listed UX proposal ("UX proposals").
- Kept from the last draft: navigation, typeahead, selection and expansion, each owning its own questions.
- Redrawn in this draft:
  - the geometry, split by who asks;
  - the drawing range, now a set of requests;
  - the keymap rules for text fields nested in widgets;
  - the contracts between modules, now removed by construction.

## The design in one paragraph

There is no library core: only independent modules. Each owns the abstractions it needs as its own parameters, and the
app passes in anything that implements them. The app wires by hand, with no registry and no central mechanism. Writing
or wiring a module never needs knowledge of another module.

Any case stays possible, a huge server-held list included. Modules ask questions, and an array or a server's indexes
answer them. Batching, prefetching and stale answers belong to the implementation.

## Tests the design has to pass

1. Each module works alone and owns the abstractions it needs.
2. The app combines modules by hand. Nothing every feature has to go through.
3. Adding, removing or replacing a module changes no other module's code or parameters.
4. No module depends on a behaviour of another module that it can't check through its own abstraction. Each contract
   the last draft only documented is removed by construction.
5. Wiring a module needs no knowledge of other modules. The test code runs as written, in declaration order, with no
   forward references.
6. Each abstraction can be implemented from an index.

## What there is to learn

There are eight abstractions, plus four conventions that come with them: twelve things in all.

### Abstractions

1. **Key and item.** A key is a string naming one thing, compared with `===`. An item is `{ key, value }`.
   - A layout's stream may also hold **section starts**, `{ key, section: true, value }`, so sections can be addressed,
     jumped to and highlighted, empty ones included.
   - Navigation's questions return only item keys, so focus and selection never get a section.
   - The data chooses keys that survive every move it supports, so moving an item between sections keeps its key.
2. **State.**
   - `get()`, `set(value)`, `watch(listener) → stop`.
   - `derive(state, f)` makes a read-only state from another.
   - The app may create a state and pass it in, and then that is the only copy.
3. **Data function.** A function a module calls to ask its own question. It returns a value, a promise or a state.
   - The implementation must settle every promise it returns.
   - An answer that changes over time is a state.
   - Nothing else is required: batching, prefetching and caching are the implementation's.
4. **Attribute writer.** `{ attributes: { name: 'single' | 'tokens' }, apply(element, item?) → stop }`.
   - It keeps the attributes it declares in step with its own states until it is stopped.
   - It applies to any element: a drawn item, a row, a section, a container, an input.
   - `combine(...writers)` takes the union of `'tokens'` attributes. Two writers that declare the same `'single'`
     attribute are an error when `combine` is called.
5. **Drawing requests.** The layout's own abstraction for "what to draw", with any number of writers. It is created
   first, so the layout reads it and modules write to it without referring to each other.
   - `requests = drawRequests()`.
   - `requests.add(request)` returns `{ settled: Promise<void>, remove() }`. `settled` resolves once the layout has drawn
     what it can for the request, including when it reached the end of the list or the key doesn't exist. It always
     settles.
   - A request is one of:
     - `{ everything: true }`;
     - `{ key }`: keep this item or section drawn;
     - `{ key, ahead, behind }`: keep it drawn, with that many pixels of neighbours along the layout's flow;
     - `{ dimension, anchor, ahead, behind }`: a run along one dimension. `anchor` is `'start'`, `'end'`, `{ key }`,
       `{ position }` or `{ offset }`. `dimension` names one of the layout's dimensions (`'items'` for a one-axis
       layout; `'rows'` and `'columns'` for a sheet).
   - With no requests, a layout draws nothing. So a layout built before windowing never draws a huge list whole.
6. **Drawn elements.** A state of `Map<key, { element, item }>`, in the layout's order, which the layout keeps equal to
   what it has drawn. Sections are in it too.
   - Modules that ask about drawn items read it and compute with `getBoundingClientRect`: focus, revealing, grid
     movement, drop places, counting what's on screen.
   - It is created first.
7. **Windowing geometry.** Windowing's own abstraction, which each of a layout's dimensions implements:
   - `name`;
   - `axis`: `'block'` or `'inline'`;
   - `origin()`: where the container's start edge is in the scroller's content, along the axis;
   - `extentOf(key)`: `{ start, end }` in container space, measured or estimated, or `undefined`;
   - `keyAt(offset, toward: 'start' | 'end')`;
   - `watch`.

   No other module uses it.
8. **Keymap** (keybinds). One `keybinds()` on one element, with five parts: per-command conditions, text takers,
   per-command event handling, one command per binding string per keymap, and releases that follow their press (see
   "keybinds").

### Conventions

- **Module shape.** `name(parameters) → { ...states, ...functions, ...writers, styles?, stop() }`. `stop()` undoes
  everything the module started, so modules made per row don't leak. No parameter is another module.
- **Step functions.** Focus's `go(f, options?)` takes `f(currentKey) → key | undefined | Promise<...>`, and calls apply
  in order. When `f` gives `undefined`, nothing moves.
- **Overlay shape.** What the overlay helpers take: `{ element, shown: State<boolean>, close(reason) }`.
- **Coordinate spaces.**
  - **Viewport:** `getBoundingClientRect`.
  - **Scroller content:** along an axis, the distance from the scroller's content start edge. That is `scrollTop`, or
    `scrollLeft` with its sign normalised for right-to-left.
  - **Container:** along an axis, the distance from the container's own start edge.
  - Content offset = `origin()` + container offset. A container under a 1200px header, two lists in one scroller, and a
    popup with padding all work, because `origin()` is measured, not assumed to be 0.
  - Axes are logical (block and inline), so vertical writing modes and right-to-left use the right edges. Assuming:
    `getBoundingClientRect` with the computed `direction` and `writing-mode` is enough to find them.

Drop places are opaque values the app passes through reorder. They are not a concept.

## Modules

### Layouts

A layout draws its stream of items and section starts into its container, as `requests` says. It writes `drawn`, and
gives one windowing geometry per dimension as `layout.dimensions`.

All layouts take:

```
container, scroller, items, requests, drawn, fill, write, writeSection?, placeholder
```

- `items(dimensionAnchors) → State<stream>` is the layout's own data function.
- `fill(element, item) → stop` draws an item's content. It may watch states (cell editing), so it redraws itself.
- `write` is the writer for items. `writeSection` is the writer for section elements.
- `placeholder(element, estimatedSize) → stop` draws an item that has been requested but hasn't arrived, so a
  scrollbar dragged into an unloaded region shows placeholders, never a blank.

A layout owns:

- **Scroll anchoring.** When drawn content before the viewport changes size, it moves the scroller by the difference,
  so nothing on screen shifts. Assuming: CSS `overflow-anchor` is not enough, because Safari lacks it.
- **Keeping focus when it moves an element.** It moves drawn elements with `moveBefore` where the browser has it. If
  not, it calls `focus()` again when the moved element contained the focused element.
- **Its CSS,** in `styles`. That includes `scroll-margin-block-start` on items under sticky headings, so `scrollIntoView`
  never leaves an item hidden under one.

It writes no ARIA of its own.

- **`listLayout({ ..., axis })`.** Items along one axis: a list (block) or a carousel (inline). One dimension,
  `'items'`.
- **`gridLayout({ ..., minColumnWidth, writeRow? })`.** Rows of as many columns as fit. It draws whole rows, so a row
  never shifts. Rows are plain elements, and `writeRow` is applied to them, `gridRoles.row` for an ARIA grid and
  nothing in a listbox. One dimension, `'items'`, over rows.
- **`masonryLayout({ ..., columns })`.** Each item goes in the shortest column, ties going to the first column (a UX
  proposal).
- **`sectionsLayout({ ..., arrange, drawSectionHeading, emptySections })`.** Each section is one element holding its
  heading and its items, which `arrange` places (`listArrangement` or `gridArrangement`, pure arithmetic). Section
  starts come from the data, so empty sections exist. `emptySections` says whether they are drawn.

A third-party layout implements the same parameters, `drawn`, and a geometry per dimension. Every module below works
with it unchanged (test 14).

### Windowing

**`windowing({ scroller, geometry, requests, margin, startAt?, at? })`** keeps one request for its dimension:
`{ dimension: geometry.name, anchor, ahead: viewport + margin, behind: margin }`.

- On scroll, it computes the scroller's offset in container space (scroll offset minus `origin()`). The anchor is then
  `{ key: keyAt(that, 'start') }`, or `{ offset }` where the geometry doesn't know the key.
- `startAt` is the first anchor. `at` is a state holding the anchor it has now, so an app can restore a carousel's
  place when its row is drawn again.
- It draws nothing and scrolls nothing. A sheet uses two of them, one per dimension.
- It doesn't keep the focused item drawn: focus does that itself.

### Revealing: `keepInView`

**`keepInView({ key: State, requests, drawn, align, behavior })`.** When `key` changes:

1. It adds `{ key }` to `requests` and waits for it to settle.
2. It calls `scrollIntoView({ block: align, inline: align, behavior })` on the drawn element.
3. It removes its request.

It works for items and sections alike, and needs no windowing.

### Asking about drawn items

Each of these owns its own question and reads only `drawn` (and `requests` where it needs more drawn):

- **`countInView({ drawn, scroller })`**: how many drawn elements lie wholly inside the scroller's box.
- **`firstInView({ drawn, scroller })`**: the first drawn key whose box meets the scroller's box.
- **`cellBelowByBoxes({ drawn, requests })`** and **`cellAboveByBoxes`**. Below `k`:
  1. It adds `{ key: k, ahead: 2 × k's height, behind: 0 }` and waits for it to settle.
  2. Among the drawn items whose box starts below k's, in the nearest such row, it takes the one whose centre is
     nearest k's centre (a UX proposal).
  3. In a short last row, that is the nearest item there is (a UX proposal).

  The cell below therefore can't be undrawn, because the helper asked for it to be drawn itself.
- **`dropPlaceByBoxes({ drawn })(point)`**: the drawn item or section nearest the point.
  - Over a section element with no item nearer: `{ into: sectionKey }`.
  - Over an item: `{ precedes: key }` or `{ follows: key }`, split along the item's *flow direction*: the direction from
    its box to the next drawn item's box, or to the previous one's for the last item. Horizontal flow splits left and
    right, and right-to-left flips them.

### Navigation

- **`listNavigation({ order, pageSize })`**: `first()`, `last()`, `next(k)`, `previous(k)`, `pageDown(k)`, `pageUp(k)`.
  `order` is a data function. `pageSize` is `() => number`, for example `() => countInView({ drawn, scroller })`. At the
  list's ends the answer is `undefined`, and nothing moves.
- **`gridNavigation({ below, above })`** owns `below(k)` and `above(k)`. Implementations:
  - `cellBelowByBoxes` for card grids;
  - the data's own `cellBelow` for a sheet.
- **`treeNavigation({ tree })`**: `parent(k)`, `firstChild(k)`.

### Typeahead

**`typeahead({ textSearch, wait, wrap })`.**

- `textSearch(from, text)` is a data function.
- `type(character)` returns a step function, so focus applies it in order. With no match, it gives `undefined`, and
  nothing moves.
- `typing` is a state: a character was typed within `wait`.

### Selection

- **`singleSelection({ selected?, checked? })`**: `select(k)`, and `itemWriter` (`aria-selected`, or `aria-checked`).
- **`multipleSelection({ setOf, selectedAmong, checked? })`.**
  - The value is `{ sets, alsoSelected, notSelected, rangeStart }`.
  - `setOf.allMatching()` and `setOf.between(a, b)` make opaque sets.
  - `selectedAmong(value, keys)` is a data function returning a state.
  - Functions: `setRangeStart(k)`, `toggleSelected(k)`, `extendTo(k)`, `addRangeTo(k)`, `selectAllMatching()`,
    `clear()`, `count(value, cap)`.
  - `itemWriter` asks only about the keys it is applied to.

### Expansion

**`expansion({ expanded?, expandable: (item) => boolean })`.**

- The value is `{ allExpanded, except }`.
- Functions: `isExpanded(k)`, `expand(item)`, `collapse(item)`, `toggleExpanded(item)`, `expandAll()`. Each takes an
  item, so it can check `expandable` and refuse a leaf.
- `itemWriter` writes `aria-expanded` only on expandable items.

### Focus: `rovingFocus`, `activeDescendant`

Both take `{ container, active: State, drawn, requests, exists, whenRemoved, entry }`.

- **`exists(k) → State<boolean | undefined>`** is watched for whatever key is active, not only when it is undrawn, so
  a stale active key is noticed whenever the data reports it. When it becomes `false`, focus does
  `go(() => whenRemoved(k))`.
- **The active item is always drawn.** Focus keeps one `{ key: active }` request. It therefore never depends on
  windowing or on an element staying the same: it reads `drawn` each time it needs the element.
- **`go(f, { takeFocus? })`** applies step functions in order. `takeFocus` moves DOM focus to the result even when DOM
  focus is outside the container, which is what `returnFocus` uses. It works when the key is already active.
- **`clear()`** makes nothing active.
- **`rovingFocus`:**
  - DOM focus follows the active element only while DOM focus is in the container. That is tracked with `focusin` and
    `focusout`, including when the element holding focus is removed with focus inside it. It never takes focus from
    elsewhere.
  - `itemWriter` writes `tabindex`. `listWriter` makes the container the tab stop while nothing is active.
- **`activeDescendant`:**
  - `itemWriter` writes `id` from the container's `id` (it throws at construction if there is none) plus the encoded
    key.
  - `listWriter` writes `aria-activedescendant`. The app applies it to whatever holds focus: the list, or a combobox's
    input.
- Both have `stop()`.

### Reorder

**`reorder({ container, drawn, handle, dropAt, moveTarget, moved, ghost, autoScroll? })`.**

- `dropAt(point)` gives an opaque place, for example `dropPlaceByBoxes({ drawn })`.
- `moveTarget(k, 'forward' | 'back')` is a data function.
- `ghost(key)` gives the element that follows the pointer.
- `autoScroll` is `{ scroller, speed }`.
- On drop it calls `moved(k, place, { alt, ctrl, meta, shift })`.
- It gives `moveForward(k)`, `moveBack(k)`, the states `dragging` and `dropPlace`, an `itemWriter` and a
  `sectionWriter` for `data-drop` (tokens), `styles`, and `stop()`.

### Cell editing

**`cellEditing({ editing? })`.** The state is `{ key, draft }`. Functions: `edit(k)`, `setDraft(text)`, `commit()`,
`cancel()`.

- The app's `fill` watches `editing`, so the editor appears in the right item and goes when editing ends.
- The app keeps the edited item drawn with `requests.add({ key })` while editing, so typing (and IME composition) is
  never interrupted by windowing.

### Overlays

- **`overlay({ element, modal?, shown?, allowClose?, returnFocus })`** gives `show()`, `close(reason)`, `shown`, an
  `openerWriter` (`aria-expanded`, `aria-controls`), and `stop()`. A modal's native `cancel` becomes `close('escape')`.
- **`anchored({ element, anchor: State<Element | undefined>, placement, anchorGone })`.** For an item, the app keeps the
  item drawn while the overlay is open, and derives `anchor` from `drawn`. `anchorGone` then fires only if the item is
  deleted.
- **`closeOnOutsidePress`**, **`closeOnFocusLeaving`** (each `{ overlay, page, inside }`), and **`overlayStack()`**
  (`add(overlay, within?)`, `inside(overlay)`, and closing children with their parent). Each takes the overlay shape.

### Roles and pointer

- **Role writers:**
  - `listboxRoles.list` / `.option` / `.section` (`role="group"` with `aria-labelledby`);
  - `menuRoles(roleOf)`;
  - `comboboxRoles({ listId })` / `.input` (`role="combobox"`, `aria-controls`, `aria-autocomplete`) / `.option`;
  - `treeRoles.item` (`aria-level`, `aria-setsize` and `aria-posinset` from item data);
  - `gridRoles.row` / `.cell`.
- **Pointer** goes through keybinds' mouse input, which already binds `Click`, `shift+Click` and `$mod+Click`
  (`mouse.js:2`). The app's commands find the key with `keyFromEvent(drawn, event)`, the drawn element containing the
  event's target:
  - `Click`: focus and select one;
  - `shift+Click`: extend;
  - `$mod+Click`: toggle;
  - all UX proposals.

  Assuming: the mouse input can tell a double click, for activation. I didn't check.

## keybinds

The changes, designed here and built in `keybinds`:

1. **Per-command conditions.** A command may have `unless: Condition[]`, where a condition is
   `(context, event | undefined) → boolean`. A keymap's `unless` is the default for its commands.
   - The conditions: `notInOpenOverlay` (matching `dialog[open]`, `:popover-open` and `[data-keybinds-modal][open]`,
     `modal.js:8`; with no event, the whole page) and `notFromTextField` (today's `inInput`, `keys.js:245`).
   - `captureInput` stays, as shorthand for leaving out `notFromTextField` (`command.js:28`, `core.js:346`).
   - The checks built into keys, mouse, gamepad and axes (`keys.js:239, 276`, `mouse.js:327, 348, 374`,
     `gamepad.js:100, 105`, `axes.js:249`) go. A breaking change.
2. **Text fields nested in widgets.** A text field inside a widget gets its own keymap with a text taker that *keeps*
   the keys a field edits with: characters, Space, Backspace, Delete, ArrowLeft, ArrowRight, Home and End (the set is a
   UX proposal).
   - A kept key is left to the field (its default happens) and stopped, so no keymap outside sees it.
   - Keys the field doesn't keep (Escape, Enter, Tab, ArrowUp, ArrowDown) are bound there or pass outward.
   - So a menu around a combobox's input never fires Home or Space while the person types, and still gets the Escape
     the input passes on.
3. **Text takers.** `textTakers: [{ wants(event), take?(event) }]`.
   - With `take`, keybinds calls it, prevents the default and stops the event (typeahead).
   - Without `take`, it keeps the key (point 2).
   - When a taker wants an event, no ordinary binding runs for it.
   - `typedCharacter(event)` is defined once, in keybinds: one character, with no Ctrl or Meta unless AltGraph is set
     (Windows reports AltGr as Ctrl+Alt, `binding-mods.js:103-105`). Option counts (a UX proposal).
4. **Per-command event handling.** `preventDefault` and `stopPropagation` are command fields, both `true` by default,
   as today (`core.js:362-363`).
5. **Lookups as today.** The first lookup with any binding decides, with no fall-through (`core.js:215-223`), so Ctrl+Z
   on QWERTZ never runs redo. The order (typed key, physical key, layout letter, syntax, `anyModifiers`) is today's
   policy, listed as a UX proposal.
6. **Conflicts per keymap.**
   - One command per binding string within a keymap. A duplicate among defaults is a `validateCommands` error.
   - The hub records which keymap each command belongs to (a source's `keymap` name). `findConflict` in the settings
     panel (`settings.js:500`) and the hub's checks (`hub.js:651`) compare only commands of the same keymap.
   - A component's ArrowDown shadowing a page command is not a conflict, and the settings panel shows it as shadowing
     (a UX proposal).
   - A person's binding that still collides wins over the default, which is dropped and reported.
7. **Releases.** While a keymap holds a press, it listens for `keyup` on the window as well as its target
   (`keys.js:212-213`), so the release reaches the press's command even if focus moved. `stop()` releases held presses
   first, as blur does (`keys.js:284-290`), instead of clearing them (`core.js:521-522`).
8. **Async commands.** `when` decides synchronously, so Escape with the popup closed passes on.
9. **The hub.**
   - `bindingsFor(id, field, { raw: true })` returns binding strings, not display text (`hub.js:719-723`).
   - Component keymaps rebuild on the hub's change event, since the hub makes a new store each refresh
     (`hub.js:645-647`).
   - Component schemas are sources with `listen: false` and their `keymap` name. They need no `execute`
     (`hub.js:171-174`).

## Combination tests

All the tests share one wiring function. It is ordinary app code, and it runs top to bottom, with no forward
references.

```js
function wireList({ data, container, scroller, makeLayout, fill, writers = [] }) {
  const active = state(undefined)
  const drawn = state(new Map())
  const requests = drawRequests()
  const focus = rovingFocus({ container, active, drawn, requests, exists: data.exists, whenRemoved: data.neighbour, entry: data.first })
  const sel = multipleSelection({ setOf: data.setOf, selectedAmong: data.selectedAmong })
  const nav = listNavigation({ order: data.order, pageSize: () => countInView({ drawn, scroller }) })
  const write = combine(focus.itemWriter, sel.itemWriter, listboxRoles.option, ...writers)
  const layout = makeLayout({ container, scroller, items: data.itemsNear, requests, drawn, fill, write, placeholder: drawPlaceholder })
  const windows = layout.dimensions.map((geometry) => windowing({ scroller, geometry, requests, margin: 400 }))
  const reveal = keepInView({ key: active, requests, drawn, align: 'nearest', behavior: 'auto' })
  const listWriting = combine(focus.listWriter, listboxRoles.list).apply(container)
  const move = (step) => focus.go(async (k) => {
    const n = k === undefined ? await nav.first() : await step(k)
    if (n !== undefined) sel.setRangeStart(n)
    return n
  })
  const extend = (step) => focus.go(async (k) => {
    const n = k === undefined ? await nav.first() : await step(k)
    if (n !== undefined) sel.extendTo(n)
    return n
  })
  const stop = () => {
    listWriting(); reveal.stop(); windows.forEach((w) => w.stop())
    layout.stop(); nav.stop(); sel.stop(); focus.stop()
  }
  return { active, drawn, requests, focus, sel, nav, layout, move, extend, stop }
}
```

The keymap for a list (`listKeymap(list, extraCommands)`, the app's) binds:

| Key | Command |
| --- | --- |
| ArrowDown | `list.move(list.nav.next)` |
| Shift+ArrowDown | `list.extend(list.nav.next)` |
| ArrowUp, Shift+ArrowUp | likewise, with `previous` |
| Space | `toggleSelected` |
| $mod+A | `selectAllMatching` |

Its default `unless` is `[notFromTextField]`.

Every test checks that every module parameter is a state, a function, an element, a writer, or the drawing requests,
and never another module.

### 1. Selection with grouping

```js
const list = wireList({ data, container, scroller, fill, makeLayout: (p) => sectionsLayout({ ...p, arrange: listArrangement, drawSectionHeading, emptySections: true, writeSection: listboxRoles.section }) })
listKeymap(list)
```

1. ArrowDown on A's last item: `nav.next` gives B's first item, and focus requests it drawn. `keepInView` scrolls it in,
   below B's sticky heading (`scroll-margin`). DOM focus follows if it was in the list.
2. Shift+ArrowDown: `extendTo`, and `selectedAmong` answers for the drawn keys.

Sections are section starts. Navigation returns only item keys. **Passes.**

### 2. Reorder in a grouped, windowed list: across sections and into an empty one

```js
const re = reorder({ container, drawn: list.drawn, handle: (el) => el.matches('[part~=grip]'), dropAt: dropPlaceByBoxes({ drawn: list.drawn }), moveTarget: data.moveTarget, moved: data.move, ghost: drawGhost, autoScroll: { scroller, speed: 600 } })
```

1. Alt+ArrowDown on A's last item: `moveTarget` gives `{ precedes: B's first }`, or `{ into: B }`. `moved` sends it.
   The key survives, so `exists` stays true and focus stays put.
2. A drag over the empty section D: `dropPlaceByBoxes` gives `{ into: D }`. The ghost is reorder's own element.

Reorder's writers are added through `wireList`'s `writers` and the section writer. **Passes.**

### 3. Typeahead over a huge server-held list

```js
const ta = typeahead({ textSearch: data.textSearch, wait: 500, wrap: true })
listKeymap(list, [], { textTakers: [{ wants: (e) => { const c = typedCharacter(e); return c !== undefined && (c !== ' ' || ta.typing.get()) }, take: (e) => list.focus.go(ta.type(typedCharacter(e))) }] })
```

1. "s" then "a": two step functions, applied in order. "sa" searches from where "s" landed.
2. No match: `undefined`, and nothing moves.
3. Each search is a data function the server answers from an index (see the table).

**Passes**, on that table's typeahead assumption.

### 4. Two listboxes in one view

Two `wireList` calls, with two containers, two keymaps and two of every state. Their ids come from each container's
`id`, and each `drawn` belongs to its own layout. **Passes.**

### 5. A grid of cards, and cell editing

```js
const list = wireList({ data, container, scroller, fill, makeLayout: (p) => gridLayout({ ...p, minColumnWidth: 240 }) })
const grid = gridNavigation({ below: cellBelowByBoxes({ drawn: list.drawn, requests: list.requests }), above: cellAboveByBoxes({ drawn: list.drawn, requests: list.requests }) })
const edit = cellEditing()
listKeymap(list, [{ id: 'grid.down', keys: ['ArrowDown'], execute: () => list.move(grid.below) }])
```

The grid keymap replaces the list's ArrowDown. `fill` draws the editor when `edit.editing.get()?.key === item.key`,
and the app keeps that item drawn while editing. The editor's input has its own keymap that keeps text keys.

**Passes.**

### 6. A tree with multiple selection

```js
const expanded = state({ allExpanded: false, except: new Set() })
const treeSource = treeData(transport, { expanded })
const exp = expansion({ expanded, expandable: (item) => item.value.hasChildren })
const list = wireList({ data: treeSource, container, scroller, fill, makeLayout: (p) => listLayout({ ...p, axis: 'block' }), writers: [exp.itemWriter, treeRoles.item] })
const tree = treeNavigation({ tree: treeSource.tree })
const right = () => list.focus.go(async (k) => {
  const item = list.drawn.get().get(k)?.item
  if (item === undefined || !item.value.hasChildren) return undefined
  if (!exp.isExpanded(k)) { exp.expand(item); return undefined }
  return tree.firstChild(k)
})
```

1. Expanding changes `treeSource`'s stream state, and the children appear.
2. `expandAll()` is one value.

**Passes.**

### 7. A combobox with server-side suggestions, under windowing

```js
const pop = overlay({ element: popup, returnFocus: () => input.focus() })
const active = state(undefined); const drawn = state(new Map()); const requests = drawRequests()
const focus = activeDescendant({ container: listElement, active, drawn, requests, exists: data.suggestionExists, whenRemoved: async () => undefined, entry: async () => undefined })
const layout = listLayout({ container: listElement, scroller: popup, items: data.suggestionsNear, requests, drawn, fill, write: combine(focus.itemWriter, comboboxRoles.option), placeholder: drawPlaceholder, axis: 'block' })
const win = windowing({ scroller: popup, geometry: layout.dimensions[0], requests, margin: 200 })
combine(focus.listWriter, pop.openerWriter, comboboxRoles({ listId: listElement.id }).input).apply(input)
input.addEventListener('input', () => { data.setSuggestionText(input.value); pop.show() })
```

The input's keymap:

- has a text taker that keeps text keys;
- binds ArrowDown and ArrowUp;
- binds Enter and Escape with `when: () => pop.shown.get()`.

1. Typing replaces the suggestions. A vanished active option gives `exists` false, and focus clears.
2. With the popup closed, Escape passes on.

**Passes.**

### 8. A live list, with pushes while navigating and selecting

`wireList` over a pushing server.

1. An insert above the viewport: the layout's scroll anchoring keeps the screen still.
2. A new item covered by "all matching": `selectedAmong`'s state turns it on.
3. The active item deleted: `exists` turns false, and `whenRemoved` gives the neighbour.

**Passes.**

### 9. A context menu on a windowed item, with a "Move to…" combobox

```js
function openMenuFor(list, k) {
  const held = list.requests.add({ key: k })
  const menu = overlay({ element: menuEl, returnFocus: () => list.focus.go(() => k, { takeFocus: true }) })
  const anchor = derive(list.drawn, (map) => map.get(k)?.element)
  const placed = anchored({ element: menuEl, anchor, placement: 'right-start', anchorGone: () => menu.close('anchor gone') })
  const stopWatch = menu.shown.watch((shown) => { if (!shown) { stopWatch(); held.remove(); placed.stop(); menu.stop() } })
  menu.show()
}
```

The menu's keymap is on `menuEl`, and test 7's combobox is inside it.

1. In the combobox input, Home, Space and ArrowLeft are kept by the input's text taker, so the menu never sees them.
2. Escape with the popup open closes the popup. With it closed, Escape passes on and the menu closes. `returnFocus`
   makes `k` active with `takeFocus`.
3. Windowing can't drop the anchor, because the menu holds it drawn. `anchorGone` fires only if the item is deleted.

**Passes.**

### 10. The command palette in a modal dialog, with a nested menu

```js
const dlg = overlay({ element: dialog, modal: true, returnFocus: () => opener.focus() })
const more = overlay({ element: resultMenu, returnFocus: () => paletteInput.focus() })
const stack = overlayStack(); stack.add(dlg); stack.add(more, dlg)
const outside = closeOnOutsidePress({ overlay: more, page: document, inside: stack.inside(more) })
```

The results list is test 7's wiring over `memoryCommands(hub.commandSystem())`.

1. The page keymap has `notInOpenOverlay`, so page commands stop.
2. Closing `dlg` closes `more`.
3. Escape in `more` closes only `more`.

**Passes.**

### 11. A windowed tree with grouped sections

Test 6 with `sectionsLayout({ ..., arrange: listArrangement, ... })`. `treeRoles.item` writes the levels from item data,
and no layout writes `aria-level`.

Open: APG has no pattern for sections in a tree, and choosing one is the owner's call. **Passes** in the wiring.

### 12. A horizontal carousel with drag to reorder

```js
const list = wireList({ data, container: strip, scroller: strip, fill, makeLayout: (p) => listLayout({ ...p, axis: 'inline' }) })
```

Plus test 2's reorder. `dropPlaceByBoxes` splits by flow direction, which here is left and right, flipped under
right-to-left. Alt+ArrowLeft and Alt+ArrowRight move items (a UX proposal). **Passes.**

### 13. A module written later that asks about the layout

`firstInView({ drawn: list.drawn, scroller })` reads `drawn` and the boxes. "The item nearest to the right" is the same
kind of helper. No layout changes. **Passes.**

### 14. A third-party spreadsheet layout, windowed in both directions

```js
const list = wireList({ data: sheetSource, container, scroller, fill, makeLayout: (p) => sheetLayout({ ...p, columnsNear: sheetSource.columnsNear }) })
const grid = gridNavigation({ below: sheetSource.cellBelow, above: sheetSource.cellAbove })
```

- `sheetLayout` is a third party's. It has `dimensions` `[rows, columns]`, each a windowing geometry, variable sizes
  both ways, and writes `drawn` for cells.
- `wireList` makes one windowing per dimension.
- Focus's `{ key: cell }` request keeps the cell's row and column drawn, since the layout maps a cell to both.

No library module changes. **Passes.**

### 15. An A–Z section index, written later

```js
const current = state(undefined)
const reveal = keepInView({ key: current, requests: list.requests, drawn: list.drawn, align: 'start', behavior: 'auto' })
const marker = keyMarker({ key: current, attribute: 'data-current' })   // an attribute writer: one key gets the attribute
// The app adds `marker` to the sections layout's `writeSection`, and the index's buttons call
// current.set(data.sectionKeyFor(letter)).
```

Sections are section starts with keys, empty ones included, so the jump and the highlight work for them. **Passes.**

### 16. Nested scrolling: a windowed list in the page scroller under a 1200px header, each row a windowed carousel

```js
const page = document.scrollingElement
const rows = wireList({ data, container: feed, scroller: page, fill: fillRow, makeLayout: (p) => listLayout({ ...p, axis: 'block' }) })
function fillRow(element, item) {
  const strip = element.appendChild(document.createElement('div'))
  const cards = wireList({ data: data.cardsOf(item.key), container: strip, scroller: strip, fill: fillCard, makeLayout: (p) => listLayout({ ...p, axis: 'inline' }) })
  return () => { cards.stop(); strip.remove() }
}
```

`fillRow` is a function declaration, so it is hoisted.

- The outer windowing's `origin()` is the feed's offset in the page, 1200px. Each carousel's `origin()` is measured
  against its own strip.
- When a row is undrawn, its carousel is stopped, and nothing leaks.
- To restore a carousel's place, the app stores `windowing.at` per row key and passes it as `startAt`.
- Which ARIA roles nest here (a list of listboxes) is the owner's call.

**Passes.**

## A huge server-held list: each abstraction from an index

| Abstraction (owner) | From an array | From an index |
| --- | --- | --- |
| `order` (listNavigation) | arithmetic | keyset seek on the order index |
| `textSearch` (typeahead) | scan | a seek when the order is by text; otherwise, Assuming an index giving a prefix's items in view order |
| `itemsNear` (layouts), including section starts | slices | keyset reads both ways, and relation indexes for sections; `{ position }` anchors need an index that keeps counts |
| `setOf`, `selectedAmong`, `count` (multipleSelection) | evaluate | order-key comparison per key; a count up to a cap |
| `tree` (treeNavigation) | walk | parent and child indexes |
| `exists`, `whenRemoved` (focus) | lookup | key lookup; the neighbour from the order index |
| `moveTarget` (reorder) | neighbours | section indexes |
| `cellBelow` (gridNavigation, sheet) | arithmetic | row and column indexes |

## What I couldn't fix

1. **Typeahead for any order.** I know no index that gives "the first item after k, in this order, starting with t" at
   a cost that doesn't grow with the matches, unless the order is by text.
2. **Exact scrollbar positions** need an index that keeps counts. Without one, `{ offset }` anchors land near the target,
   and placeholders fill the gap until the items arrive.
3. **Sections in an ARIA tree, and ARIA roles for lists inside list rows,** have no APG pattern.
4. **The palette copies its ranked results once.**
5. **Not traced:**
   - keybinds sequences and holds under rules 1-7;
   - how layouts adopt server-drawn items for hydration;
   - whether `moveBefore` is available everywhere this must run (Assuming: the re-focus fallback is enough where it
     isn't).
6. **I don't have the fourth review's list of nine contracts.** I removed the four it named:
   - grid movement now draws what it needs;
   - the anchor is held drawn;
   - sticky headings are handled by `scroll-margin`;
   - focus reads `drawn` each time.

   The rest I can't check against its list.

## Decisions for the owner

- Keys instead of the positional source model accepted earlier.
- keybinds' policies become per-command conditions, a breaking change.
- Conflicts are checked per keymap, and inner keymaps shadow outer ones.
- The hub's `listen: false` and `keymap` on sources.
- How an entry shown in two places is selected.

## UX proposals

- **Selection:**
  - follows focus in single mode;
  - plain arrow keys move `rangeStart`;
  - Shift+Arrow extends, and `extendTo` empties the exceptions;
  - Ctrl/Cmd+Arrow moves without selecting;
  - Space toggles;
  - Ctrl/Cmd+A selects all matching;
  - `aria-checked` where `checked` is set;
  - a state not known yet shows as not selected;
  - the count is capped at "1,000+".
- **Pointer:** Click focuses and selects one; Shift+Click extends; Ctrl/Cmd+Click toggles; double click activates.
- **Focus:**
  - with nothing active, ArrowDown goes to the first item;
  - at the list's ends, and on a typeahead search with no match, nothing moves;
  - focus goes to `entry` on entering;
  - DOM focus follows only while it is in the list;
  - the container is the tab stop while nothing is active;
  - a removed item's focus goes to `whenRemoved`;
  - keys queue behind slow answers, in order;
  - headings are not focusable.
- **Revealing:** `keepInView` aligns `'nearest'`, without animation, on every change of the active key, clicks
  included.
- **Page size:** the items wholly in view.
- **Typeahead:**
  - `typing` means a character came within `wait`;
  - Space continues a search in progress;
  - `wrap`;
  - letters go to typeahead instead of letter bindings;
  - what counts as a typed character, Option and AltGr included.
- **Text fields:** a field keeps characters, Space, Backspace, Delete, ArrowLeft, ArrowRight, Home and End.
- **keybinds:**
  - today's lookup order (typed key, then physical key, then layout letter, then syntax, then `anyModifiers`);
  - a person's binding beats a default;
  - an inner keymap shadows an outer one, and the settings panel shows it;
  - a command prevents the default and stops the event unless it says otherwise.
- **Overlays:**
  - Escape and Enter pass on when the popup is closed;
  - the combobox popup shows on every input;
  - a modal's Escape goes through the native `cancel`;
  - `returnFocus` targets;
  - a press outside, or focus leaving, closes;
  - nested overlays close with their parent;
  - an anchored menu closes only if its item is deleted.
- **Reorder:**
  - Alt+Arrow moves along the axis;
  - at a section's end, the item moves to the next section's start;
  - drag only from a grip;
  - the ghost;
  - auto-scroll;
  - drop halves along the flow direction;
  - `{ into }` for sections;
  - the modifiers passed to `moved`.
- **Sections:** sticky headings; `emptySections` drawn and droppable.
- **Grid:** whole rows drawn; moving up and down takes the nearest centre; in a short last row, the nearest item.
- **Masonry:** the shortest column, ties to the first.
- **Sizes:** items not yet drawn are estimated as the average of those drawn.
- **Placeholders:** shown while requested items load.
- **Writing modes:** logical axes, so right-to-left and vertical writing modes follow the page.

## Names (proposals)

- **Replaced since the last draft:**

  | Old | New |
  | --- | --- |
  | `range` (the drawing range) | drawing requests: `requests`, `add`, `settled`, `remove` |
  | `span`, `hit`, `box` | gone |
  | the geometry's extent | `extentOf` |
  | `terms` | `setOf` (`allMatching`, `between`), `sets` |
  | `plus`, `minus` | `alsoSelected`, `notSelected` |
  | `whichSelected` | `selectedAmong` |
  | `open` (expansion) | `expanded`, `allExpanded` |
  | `open` (overlay) | `shown` |
  | `item` / `list` (writers) | `itemWriter`, `listWriter`, `sectionWriter`, `openerWriter` |
  | `pageSize` (the helper) | `countInView`; `pageSize` stays navigation's parameter |
  | `under` | dropped |

- **Abstractions:** key, item, section start, state, `derive`, data function, attribute writer, `combine`, drawing
  requests (`drawRequests`, `add`, `settled`, `remove`, `everything`, `key`, `ahead`, `behind`, `dimension`, `anchor`,
  `'start'`, `'end'`, `position`, `offset`), drawn elements (`drawn`, `element`, `item`), windowing geometry (`name`,
  `axis`, `'block'`, `'inline'`, `origin`, `extentOf`, `keyAt`, `toward`, `watch`), keymap.
- **Conventions:** `stop`, step function, overlay shape (`element`, `shown`, `close`), viewport, scroller content,
  container space.
- **Layouts:** `listLayout`, `gridLayout`, `masonryLayout`, `sectionsLayout`, `listArrangement`, `gridArrangement`,
  `dimensions`. Parameters: `container`, `scroller`, `items`, `fill`, `write`, `writeSection`, `writeRow`,
  `placeholder`, `minColumnWidth`, `columns`, `arrange`, `drawSectionHeading`, `emptySections`, `styles`.
- **Windowing and helpers:**
  - windowing: `windowing`, `margin`, `startAt`, `at`;
  - revealing: `keepInView`, `key`, `align`, `behavior`;
  - drawn items: `countInView`, `firstInView`, `cellBelowByBoxes`, `cellAboveByBoxes`, `dropPlaceByBoxes`, `point`,
    `keyFromEvent`, `keyMarker`, `attribute`.
- **Navigation:** `listNavigation`, `order`, `pageSize`, `first`, `last`, `next`, `previous`, `pageDown`, `pageUp`,
  `gridNavigation`, `below`, `above`, `cellBelow`, `cellAbove`, `treeNavigation`, `tree`, `parent`, `firstChild`.
- **Typeahead:** `typeahead`, `textSearch`, `wait`, `wrap`, `type`, `typing`.
- **Selection:** `singleSelection`, `selected`, `select`, `checked`, `multipleSelection`, `setOf`, `allMatching`,
  `between`, `selectedAmong`, `sets`, `alsoSelected`, `notSelected`, `rangeStart`, `setRangeStart`, `toggleSelected`,
  `extendTo`, `addRangeTo`, `selectAllMatching`, `clear`, `count`, `cap`.
- **Expansion:** `expansion`, `expanded`, `allExpanded`, `except`, `expandable`, `isExpanded`, `expand`, `collapse`,
  `toggleExpanded`, `expandAll`.
- **Focus:** `rovingFocus`, `activeDescendant`, `active`, `exists`, `whenRemoved`, `entry`, `go`, `takeFocus`, `clear`.
- **Reorder:** `reorder`, `handle`, `dropAt`, `moveTarget`, `'forward'`, `'back'`, `moved`, `ghost`, `autoScroll`,
  `speed`, `moveForward`, `moveBack`, `dragging`, `dropPlace`, `data-drop`, places `precedes`, `follows`, `into`.
- **Cell editing:** `cellEditing`, `editing`, `draft`, `edit`, `setDraft`, `commit`, `cancel`.
- **Overlays:** `overlay`, `modal`, `allowClose`, `returnFocus`, `show`, `reason`, `anchored`, `anchor`, `placement`,
  `anchorGone`, `closeOnOutsidePress`, `closeOnFocusLeaving`, `page`, `inside`, `overlayStack`, `add`, `within`.
- **Roles:** `listboxRoles` (`list`, `option`, `section`), `menuRoles`, `roleOf`, `comboboxRoles` (`listId`, `input`,
  `option`), `treeRoles`, `gridRoles` (`row`, `cell`).
- **keybinds:** `unless`, `notInOpenOverlay`, `notFromTextField`, `textTakers`, `wants`, `take`, `typedCharacter`,
  `preventDefault`, `stopPropagation`, `keymap`, `listen`, `raw`.
- **App names in the tests:** `wireList`, `listKeymap`, `move`, `extend`, `right`, `openMenuFor`, `fillRow`,
  `fillCard`, `drawGhost`, `drawPlaceholder`, `drawSectionHeading`, `treeData`, `treeSource`, `sheetLayout`,
  `sheetSource`, `memoryCommands`, `suggestionsNear`, `setSuggestionText`, `suggestionExists`, `sectionKeyFor`,
  `cardsOf`, `neighbour`, `transport`, `data`, `feed`, `strip`, `option`, `input`.
- **Element names:** `<interact-listbox>`, `<interact-menu>`, `<interact-combobox>`, `<interact-palette>`,
  `<interact-tree>`, with the prefix the app's.
