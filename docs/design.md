# Design

Status: a proposal for the rebuild, revised after one review, and to be reviewed again before anything is built. No code
exists for it. Every name in it is a proposal (all of them are listed under "Names"). Every behaviour a person would
notice is a proposal too (listed under "UX proposals"), and nothing here decides one.

## The answer in one paragraph

There is no library core. The library is a set of independent modules. Each module owns the abstractions it needs: it
states them as its own parameters, and the app passes in anything that implements them. A module never names another
module, never renders, and never listens to keys. The app combines the modules in two places:

- **Construction.** The app creates each module with implementations of that module's parameters. Some
  implementations happen to be other modules (windowing gives focus "the element for a key"), but the module that takes
  one knows only its own abstraction.
- **Commands.** The app's key bindings call module commands and pass results between them. For example, ArrowDown asks
  navigation for the next key and gives it to focus.

Wiring a module never requires knowing which other modules exist. That is the test each combination below has to pass.
Items are named by their key, a string, never by a position some other module computed.

## The requirement, as tests

- Each module works on its own and owns the abstractions it needs.
- The app combines the modules it wants, by hand. There is no registry and no resolver.
- Nothing every feature has to go through.
- Any module can be left out or replaced. Adding one changes no other module's code, and no other module's parameters.
- Wiring a module (constructing it, binding its commands, putting its output in the view) never needs to know which
  other modules exist.

## Why the current code fails, at the root

Each failure listed in the brief comes from something every feature shares:

1. **A shared positional list.** List-stage transforms rebuild one list (`packages/core/src/list-pipeline.js:448-461`),
   and every feature refers to items by position in it (`list-pipeline.js:76-78, 204, 357-370`).
   - Selection throws when grouping makes a different list (`packages/components/src/list-selection.js:185-190`).
   - Grouping inserts headings as items (`grouped-sections.js:395, 473`).
   - Grouping forwards only `findPrefix` (`grouped-sections.js:532-536`), so reorder gets positions that count
     headings.
2. **A shared dispatch.** One queue holds every feature's transactions. A throw empties it (`packages/core/src/store.js:157-178`,
   `177`). Filters rewrite each other's effects (`packages/core/src/state.js:408-417`, `list-selection.js:127-130`).
3. **A shared input chain with guessed priorities** (`store.js:186-194`, `state.js:7-10`).
   - Typeahead sits at `high` (`typeahead.js:139`) and reorder at `high` (`reorder.js:119`), because navigation doesn't
     check for Alt (`navigation.js:61`).
   - Keys are named inside each feature (`list-selection.js:276-281`, `reorder.js:318-325`).
   - Ctrl and Cmd are merged (`packages/core/src/inputs.js:5-9`, `packages/dom/src/default-rendering.js:59, 75`).
   - One rendering takes keys from every list in its view (`default-rendering.js:53-63`) and finds rows by position
     (`default-rendering.js:74`).
   - Ids default to `listbox-<position>` (`listbox.js:60, 118`).
4. **A shared rendering.**
   - Pipeline stages fix the shape of the DOM (`list-pipeline.js:222-246, 412-440`).
   - Windowing needs rows as direct children, all one height (`windowing.js:35, 304`), so headings sit flat among the
     options (`grouped-sections.js:295`).
   - Roles and the focus model are fixed per component (`listbox.js:75-81`, `active-item.js:95`).
   - Windowing's CSS is in every component (`listbox-styles.js:97`, `menu-styles.js:117`, `combobox-styles.js:108`,
     `palette-styles.js:143`).

The current code also has closed sets:
- the combobox's `kind` (`combobox.js:64-69, 123-134`);
- the menu entry kinds (`menu-entry.js:14-18`);
- the palette's own view (`palette.js:285, 381`), with results copied into a `MemorySource` (`palette.js:107-110`);
- the dismissal reasons (`packages/core/src/layer.js:7`);
- overlay open state kept in the layer (`packages/dom/src/overlay.js:269`);
- fixed bundles (`combobox-extensions.js:23-34`, `menu-extensions.js:26-41`, `palette-extensions.js:21-31`).

`keybinds` has its own shared policies. This design changes them (see "Changes to keybinds"):
- it ignores every key and click inside any open popover or dialog (`packages/keybinds/src/modal.js:8, 41-43`, used at
  `keys.js:239, 276` and `mouse.js:327, 374`);
- it blocks commands in text fields unless they set `captureInput` (`input.js:131-141`, `core.js:342-347`);
- it looks only at the first lookup that has any binding (`core.js:215-223`), and runs the first allowed candidate
  without falling through to other lookups (`core.js:406-410`).

Because of the first of these, overlays add their own `keydown` listeners (`submenus.js:430-471`,
`combobox-field.js:95-101`, `menu-view.js:77`).

Assuming: hydration can't be left out because it sits in one package with rendering (`render-string.js:62-76`,
`markers.js:2`, `adopt.js:47-62`). I didn't trace what a page that never hydrates loads.

## What this keeps from the earlier document

Settled with the owner, and unchanged:
- no runtime dependencies;
- plain JavaScript with type-safe JSDoc;
- one module per part, each with its own test file;
- an app ships only what it uses;
- a module that isn't loaded is an error, not a silent no-op;
- for the ready-made elements: shadow or light DOM per instance, `@scope` styles, registration with no side effects,
  server rendering, tokens at five levels, zero specificity, cascade layers, and generated wrappers.

This design departs from one model the owner had accepted: "a lazy source: a count, items by range, an item's
position". Modules here never share positions. That departure is the owner's to accept (see "Decisions for the owner").

## Concepts

Every concept the document uses is counted here. There are fifteen, and each is the smallest thing the requirement
leaves room for.

| # | Concept | What it is | Why it can't be less |
| --- | --- | --- | --- |
| 1 | **Key** | A string naming one item where it shows. Keys are compared with `===`. When one entry shows in two places, the data gives the two places different keys. | Positions break under any change of view. One kind of key, and only strings, so equality is never in doubt. |
| 2 | **Entry** | What the data answers with: `{ key, value }`, plus `position` and `total` when the data knows them. | A read has to bring the value with the key, so drawing it costs no second request. |
| 3 | **State** | An object with `get()`, `set(value)` and `watch(listener) → stop`. A module keeps its state in one, its own unless the app passes one in. | One source of truth per piece of state, chosen by the app, with no store to put it in. |
| 4 | **Command** | A function a module returns. It does one thing and may return a result (a key, a promise of one). | Modules never see keys or buttons, so keys are rebindable and no module takes a key from another. |
| 5 | **Parameter** | One abstraction a module needs, stated as a JSDoc type in that module's own file. | This is what "each module owns its abstraction" means in code. |
| 6 | **Loader** | The data abstraction: `load(request) → Promise<answer>` and `changes(listener)`. The app's implementation does three things no module knows about. It batches the loads of one action into one request. It never delivers an answer once a newer action has loaded. It keeps a bounded cache. | One action, one request; stale answers that can't cross modules; and the page holding only what it shows. These three need one shared implementation, and only the app can give it. |
| 7 | **Order requests** | The questions about order: `{ first }`, `{ last }`, `{ after, count }`, `{ before, count }`, `{ around, count }`, `{ find, from }`. Each is defined in the module that asks it. They are listed together because one loader answers them all. | The data and the page have to agree on order questions. This is the "source type" in all but name, but it is open: a new module defines a new request, and no existing one changes. |
| 8 | **Description** | An opaque value the loader makes for a set of items, such as "all matching" or "the range from k to m". Only the server interprets it. | A selection of ten billion can't be keys, and the page must not run the server's filter itself. |
| 9 | **Element source** | `elementFor(key) → Promise<Hold>` and `keyOf(element)`. A hold keeps its element in the page until it is released, and says when the item has gone. | Focus, drag and anything else that needs an item's element ask for it, without knowing whether windowing exists. This replaces both "reveal" and the list of keys to keep rendered. |
| 10 | **Decoration** | A function `(key) → attributes` that a module gives for items, and one for the container. The view merges every decoration it was given. `class` and `part` are unioned. Any other attribute given twice is an error that names both attributes. | The view writes attributes without knowing which modules made them, and two modules can't both write one attribute. |
| 11 | **Rows** | What to draw: `{ entries, spaceBefore, spaceAfter }` in a state. Windowing gives it, and so does a plain list. | The view draws without knowing whether the list is windowed. |
| 12 | **Stylesheet** | A module's own structural CSS, exported as `styles`. The app adopts the ones it uses. | An extension can't bring CSS today, and windowing's CSS ships everywhere. |
| 13 | **Scope** (keybinds) | One `keybinds()` per element that takes focus. It holds the commands bound there, the conditions it chooses, and the text takers (below). | Two lists must not hear each other. Keys belong where focus is. |
| 14 | **Condition** (keybinds) | `(event) → boolean`. A scope uses it to ignore events, and a binding's `when` uses it to decide whether it applies. "Inside an open overlay" and "in a text field" become conditions a scope chooses. | It turns keybinds' built-in policies into parts a scope picks. |
| 15 | **Composition** | A ready-made component: a file of plain wiring that uses only public modules. | Most apps want a listbox, not fifteen modules. Taking one apart means not using that file. |

Suggested bindings are not a concept of their own. They are data in keybinds' existing binding format,
`{ commandName: ['ArrowDown'] }`, which an app may use.

Removed since the first draft:
- reads that may or may not return a promise (every load is a promise now);
- "needs" (now Parameter);
- "cell" (now State);
- place keys versus entry keys (now one kind of key, concept 1);
- target filtering as its own idea (now part of the element source and the scope).

## Rules every module follows

- It is a function, `name(parameters) → { states, commands, decorations, styles }`. It has no global state and registers
  nothing.
- Its parameters name abstractions, never other modules.
- It does not render, and it does not set attributes on elements the app renders. It gives decorations, and the view
  writes them.
- It touches the DOM only where state can't:
  - calling `focus()`;
  - setting `scrollTop`;
  - measuring;
  - showing or hiding popovers and dialogs;
  - listening for events on elements or documents it was given.
- It loads only through the loader it was given. It does not deal with stale answers: the loader never delivers one.
- A failing command fails alone. There is no queue for it to empty.

## Data: the loader

The app gives every module that reads data the same loader for one view: `load` and `changes`.

**What the app's loader implementation does** (`serverLoader(transport, query)` for SillyTavern, `memoryLoader(items)`
for small lists):

- **Batching.** Every `load` made during one action goes out as one request. One action is everything that runs
  before the next task. A request that the cache can answer goes nowhere.
- **Staleness.** Each action has a number. The answer to an older action is never delivered once a newer action has
  loaded anything: its promise never settles. A late typeahead `find` therefore can't move focus after an arrow key
  has. No module handles this.
- **Cache.** It keeps runs of entries in order, so `after`, `before` and `around` are often answered without a request.
  The cache is bounded (Assuming: by a fixed number of entries, evicting the least recently used). The page holds only
  what it shows, plus that bound.
- **Changes.** It reports `{ keys }` when entries changed or went, and `{ reset }` when the query changed. These come
  from the server pushing them, or from the app calling `setQuery`. Query, filter and sort are the loader's
  construction parameters and its `setQuery`. No module knows about them.

**Requests are defined by the modules that make them:**

| Request | Defined by | Answer |
| --- | --- | --- |
| `{ first }`, `{ last }`, `{ after: key, count }`, `{ before: key, count }` | `listNavigation` | entries |
| `{ around: key, count }`, `{ after }`, `{ before }`, `{ first }` | `windowing` | entries |
| `{ find: text, from: key }` | `typeahead` | an entry, or none |
| `{ parent: key }`, `{ firstChild: key }` | `treeNavigation` | an entry, or none |
| `{ describe: 'all' \| { from: key, to: key } }` | `selection` | a description, made without a request (it carries the current query) |
| `{ membership: selection, keys }` | `selection` | for each key the server alone can tell about, whether it is in the selection |

A loader that doesn't know a request rejects it, naming it. That is an error at the first use, never a silent no-op.

## The modules

For each module, its parameters are what it needs, and its outputs are what it gives.

### Element sources: `windowing` and `plainList`

Both implement **element source** (concept 9) and **rows** (concept 11). The app picks one per list.

**`plainList({ load, container })`** loads entries (`{ first, count }`, then `{ after }`) as its `loadMore()` command is
called, and gives them all as `rows`. Its decoration writes `data-key`, and `keyOf` reads it. `elementFor(key)` resolves
once the key is drawn. It holds every entry it has loaded, because they are all drawn. Lists that must not hold what
they've scrolled past use windowing.

**`windowing({ load, scroller, container })`** gives:
- `rows`: the entries to draw, with `spaceBefore` and `spaceAfter`;
- `elementFor`, `keyOf` and a decoration;
- `loading`, a state saying whether it is loading;
- `styles`.

How it works:
- **No layout assumed.** It measures the boxes of the first and last drawn elements against the scroller. It loads
  more (`{ after: lastKey }`, `{ before: firstKey }`) when they come within a margin of the viewport, and drops entries
  that have gone past the margin. Rows can be any height, and drawn items can be laid out as a list, a grid or
  nested groups. Its estimate for undrawn space is the drawn block's size divided by the entries drawn.
- **Load as you scroll.** It is windowing loading at its ends, so it is not a separate module.
- **Holds.** `elementFor(key)` returns a hold. If the key is drawn, the hold comes at once. If not, windowing
  re-anchors with `{ around: key }` and resolves once the element is drawn. Held keys stay drawn, visually hidden if
  they are outside the window, until they are released. Windowing knows nothing of focus or drag.
- **Changes.** `{ keys }` reloads those keys if they are drawn, and ends the hold of any that went. `{ reset }` loads
  `{ first }` and ends every hold whose key the new answer lacks.
- **Positions.** If entries carry `position` and `total`, the view can write `aria-posinset` and `aria-setsize`. If the
  data can't give them, there are none (see "What I couldn't fix").
- **Its CSS ships only with it.**

Sticky headings stay possible because headings are not rows. The view wraps each run of drawn entries from one group
in that group's element, with its heading inside. A heading with `position: sticky` sticks while any of its group's
entries are drawn.

### Focus: `activeDescendant` and `rovingFocus`

Both take `{ elements: element source, start: () => Promise<key | undefined> }` and give `active` (a state), `go(key)`,
a decoration for items and a decoration for the container. `start` gives where focus goes when it comes into the list
with nothing active.

- **`go(key)`** asks `elements.elementFor(key)`, keeps that hold and releases the one before. When the hold reports its
  item gone, `active` becomes empty. Neither module knows whether windowing is present.
- **`activeDescendant`** reads its container's `id`, and throws at construction if the container has none. It never
  sets one. Its item decoration writes `id` as that id plus the URI-encoded key. Its container decoration writes
  `aria-activedescendant` while it holds an element.
- **`rovingFocus`** decorates the active item with `tabindex="0"` and the others with `-1`. While nothing is active, the
  container is the tab stop, so Tab always reaches the list, even after the active key was filtered out. When focus
  arrives at the container, it calls `go(await start())`. `go` moves focus to the held element.

### Navigation: `listNavigation`, `gridNavigation`, `treeNavigation`

These are pure order arithmetic over `load`. Every command takes a key and returns a promise of a key. None of them
moves focus or selects anything.

- **`listNavigation({ load, pageSize? })`**: `next(k)`, `previous(k)`, `first()`, `last()`, `pageDown(k)`, `pageUp(k)`.
- **`gridNavigation({ load, columns: () => number })`**: `below(k)`, `above(k)`, `rowStart(k)`, `rowEnd(k)`. The helper
  `columnsIn(container)` counts the drawn items that share the first one's top.
- **`treeNavigation({ load })`**: `parent(k)`, `firstChild(k)`.

The app's commands decide what a returned key means:

```js
down:      async () => focus.go(await nav.next(focus.active.get()))
shiftDown: async () => { const k = await nav.next(focus.active.get()); focus.go(k); selection.extendTo(k) }
ctrlDown:  async () => focus.go(await nav.next(focus.active.get()))   // moves focus without selecting
```

One navigation instance serves them all.

### Typeahead: `typeahead`

**`typeahead({ load, wait? })`** gives:
- `type(character, from) → Promise<key | undefined>`;
- `takes(event)`, which implements keybinds' **text taker**: it takes a single character typed with no Ctrl, Meta or
  Alt, and takes Space only while typing is going on.

The text taken so far is in its own state. It asks `{ find: text, from }` once per character. It never looks at drawn
rows.

### Selection: `selection`

**`selection({ load, mode: 'single' | 'multiple' })`.**

The selection value is `{ ranges: description[], added: Set<key>, removed: Set<key>, anchor?: key }`. It means: what
any description covers, except `removed`, plus `added`.
- "All except" is one description plus a set of exceptions.
- "Group A and group B" is two descriptions.

Membership has one source per fact:
- A key in `added` is selected, and a key in `removed` is not. The page knows both without asking.
- Whether any other key is covered by a description, only the server knows. It answers `{ membership }`.

Selection loads `{ membership }` when the value changes, and when its own decoration is asked about a key it has no
answer for. It doesn't know which module drew that key. The load is batched into the action that caused it. The page never runs the server's filter, so there are not two sources of
truth.

Commands:
- `selectOne(k)`;
- `toggle(k)`;
- `extendTo(k)`: replaces the ranges with one from the anchor to `k`;
- `addRange(k)`;
- `selectAllMatching()`;
- `clear()`.

Reads: `value` (a state) and `isSelected(key)`, which is `undefined` until the server has answered. Its decoration
writes `aria-selected`, or `aria-checked` when it is constructed with `attribute: 'aria-checked'`.

A range runs between two keys in the view's order. Keys are places, so a range is defined even when one entry shows
twice. Which entries a range of places covers is the server's to say. Whether selecting an entry in one place shows it
selected in its other places is the server's membership answer, so it is decided once, on the server (see "Decisions
for the owner").

### Expansion: `expansion`

**`expansion({ expanded?: State<Set<key>> })`** gives `expand(k)`, `collapse(k)`, `toggle(k)`, and a decoration that
writes `aria-expanded`. The app's loader takes the expanded set as part of its query, so expanding a node reports
`{ keys }` around it. Expansion doesn't know the loader exists.

### Reorder: `reorder`

**`reorder({ elements: element source, container, handle?, targets, moved })`.**

`targets` is the app's implementation of **drop target**:
- `at(element, point) → target | undefined`, for the pointer;
- `next(key, direction) → Promise<target | undefined>`, for the keyboard.

A target is opaque to reorder. It is whatever the app needs:
- `{ before: key }` or `{ after: key }` in a list or across groups;
- `{ into: group }` for an empty group's drop area;
- `{ childOf: key }` for the middle of a tree item.

Its `decoration` says how the target is drawn.

Reorder gives:
- `moveUp(k)`, `moveDown(k)`: each asks `targets.next` and calls `moved(k, target, modifiers)`;
- a pointer drag that starts only on elements `handle` accepts;
- `dragging` and `target` (states);
- a decoration;
- `styles`.

During a drag, it holds the dragged item's element (so windowing keeps it drawn) and scrolls the container near its
edges. `modifiers` are `{ alt, ctrl, meta, shift }` unmerged, so the app decides what Alt means.

### Overlays

- **`overlay({ element, modal?, open?: State<boolean>, allowClose? })`** gives `show()` and `close(reason)`.
  - A non-modal overlay is a popover in manual mode, so the state is the only truth. A modal overlay is a `<dialog>`
    shown with `showModal()`.
  - `close` asks `allowClose(reason)` if the app gave it one. A reason is any value.
- **`anchored({ element, anchor, placement })`** places an overlay next to its anchor. Assuming: CSS anchor positioning,
  or `packages/core/src/placement.js`, is enough.
- **`closeOnOutsidePress({ overlay, page: document, inside: (target) => boolean })`** listens on the `page` it was
  given. It listens nowhere else.
- **`closeOnFocusLeaving({ overlay, page, inside })`**.
- **`overlayStack()`** gives `add(overlay, parent?)` and `inside(overlay)`, a `(target) => boolean` that counts an
  overlay's child overlays as inside it. That makes it an implementation of the dismissers' `inside` parameter. It is
  optional.

Escape closing an overlay is a binding to `overlay.close('escape')`, made in the scope that has focus (see Keys). It is
a UX proposal.

### Roles: `listboxRoles`, `menuRoles`, `comboboxRoles`, `treeRoles`, `gridRoles`

These are pure decorations giving each pattern's static ARIA. A menu entry's role comes from the app's
`roleOf(entry)`, so entry kinds are open.

### Submenus: `submenus` and `submenuPointer`

**`submenus({ hasSubmenu(key), openSubmenu(key), closeSubmenu() })`** gives the commands `open(k)` and `close()`. A
submenu is another menu composition in an overlay anchored to its item. **`submenuPointer({ ... })`** handles the
pointer delay and the safe triangle, and is separate.

### Inline completion: `inlineCompletion`

**`inlineCompletion({ input, textOf })`** gives `complete(entry)`, which writes the completion selected after the
caret.

### Cell editing: `cellEditing`

**`cellEditing({ editing?: State<key>, commit(key, value) })`** gives `start(k)`, `commit()` and `cancel()`.

## The view

The view is the app's template, or a composition's. It knows three abstractions and no modules:

```js
view({ rows, item: decorations(...itemDecorations), list: decorations(...listDecorations), draw })
```

- It draws `rows.entries`, with `spaceBefore` and `spaceAfter` as padding.
- On each item element it writes `item(key)`, the merged item decorations. On the container it writes the merged
  list decorations.
- `draw(entry)` gives the item's content.

The app lists the decorations of the modules it constructed. That list is the view's parameter, not a parameter of any
module. Adding a module adds one item to it, and changes no module.

## Changes to keybinds

These are designed here, to be built in `keybinds` itself:

1. **Policies become conditions.**
   - `outsideOpenOverlay` (today's `overlayOpen`, `modal.js:41-43`) becomes an exported condition.
   - `keybinds({ target, unless: [conditions] })` ignores an event when any of its conditions holds. Nothing is built
     in. A page-wide scope can choose `outsideOpenOverlay`. Component scopes don't.
   - This is a breaking change for apps that rely on the current default (see "Decisions for the owner").
   - The overlays' own `keydown` listeners go away.
2. **Text takers replace `captureInput`.** A scope can be given `takesText: [taker]`, where a taker is
   `(event) → boolean`.
   - `textField` is a taker: it takes characters and the keys that edit text (Backspace, Delete, ArrowLeft,
     ArrowRight, Home, End, and in a textarea also ArrowUp, ArrowDown and Enter).
   - `typeahead.takes` is another taker.
   - When a taker takes an event, no ordinary binding runs for it, and `$char` bindings may.
   - When no taker takes it, only ordinary bindings may run.
   - The two kinds are therefore exclusive by construction. Space goes to typeahead while typing goes on, and to
     selection otherwise, and neither module knows of the other.
   - The page-wide scope keeps today's behaviour by being given `textField`. A combobox's input scope is given
     `textField` too, and its Up, Down, Enter and Escape bindings still run, because the taker doesn't take those keys.
     `captureInput` goes.
3. **`$char`** is a new `KeySyntax`, like `symbols()` (`keys-symbols.js:39-50`; the hook is at `keys.js:24-32, 97,
   166`). It accepts `$char` and adds that lookup for any single character with no Ctrl, Meta or Alt. Its command reads
   `event.key`.
4. **No hidden order.**
   - The candidates are every command bound to any of an event's lookups (not only the first lookup that has some), with
     `when` and the scope's conditions applied.
   - Exactly one candidate allowed: it runs.
   - None allowed: the event is left alone, so it bubbles to the next scope out.
   - More than one allowed: none runs, and the scope's `onConflict` reports it in development. A binding whose `when`
     is false can no longer hide a more general one, and the order the commands were given in decides nothing.
   - One tie-break is kept and flagged: a command bound exactly beats an `anyModifiers` command for the same key.
     Today's documentation promises this, and it comes from the bindings themselves, not from the order they were given
     in.
5. **Scopes.** A command runs in the scope of the element that has focus when it should run. A combobox's input scope
   binds the overlay's `close` and the listbox's navigation, because focus stays in the input. A scope that runs a
   command stops the event (`core.js:362-363`), so the scopes around it don't see it.

Assuming: sequences (`g i`), holds and releases still work under rule 4. I didn't trace them.

## Combination tests

Each test shows what the app constructs, what its commands do, and what it puts in the view. Then it checks that each
module's construction names only its own parameters.

### 1. Selection with grouping

```js
const load = serverLoader(transport, { filter, order, groupBy })  // keys are places: "group/entry"
const win = windowing({ load, scroller, container })
const focus = rovingFocus({ elements: win, start: () => nav.first() })
const nav = listNavigation({ load })
const sel = selection({ load, mode: 'multiple' })
bind({ ArrowDown: down, 'Shift+ArrowDown': shiftDown, Space: () => sel.toggle(focus.active.get()) })
view({ rows: win.rows, item: decorations(win.item, focus.item, sel.item, listboxRoles.option), ... })
```

1. ArrowDown on the last item of group A runs `down`. `nav.next` loads `{ after: 'A/k', count: 1 }`. The cache usually
   holds it already, because windowing drew past it. The answer is `'B/m'`.
2. `focus.go('B/m')` gets a hold from `win`. The element is drawn, so the hold comes at once, and `active` is set.
3. Shift+ArrowDown runs `shiftDown`. `sel.extendTo('B/n')` makes the description `{ from: anchor, to: 'B/n' }` with no
   request, then loads `{ membership }` for the drawn keys. That is one request, the action's only one. Rows in A and B
   get `aria-selected` from the answer.
4. Headings are part of each group's element, not entries, so no module ever sees one. No module can throw over a
   "different list".

Wiring check: no module's parameters name another module. `focus.elements` is an element source that windowing
implements. **Passes.**

### 2. Reorder in a grouped, windowed list, across groups and into an empty group

```js
const re = reorder({ elements: win, container, handle: isGrip, targets: groupTargets(load), moved: server.move })
```

`groupTargets` is the app's drop-target implementation:
- `at` gives `{ before | after: key }` from the half of the item under the pointer, or `{ into: group }` over an empty
  group's drop area;
- `next(k, 'down')` loads `{ after: k }` and gives `{ after: that }`. At the end of a group that is the next group's
  first place, so an item can move across groups from the keyboard. Whether that is wanted is a UX proposal.

1. Alt+ArrowDown runs `re.moveDown('A/k')`. `targets.next` gives `{ after: 'A/j' }`, and `moved` calls the server: one
   request, which writes the one entry's fractional order key. The answer arrives through `changes` as `{ keys }`.
   Windowing reloads the drawn keys, and focus's hold on `'A/k'` survives the move.
2. A pointer drag starts on a grip. `re` holds `'A/k'`, so windowing keeps it drawn while the list scrolls. `target`
   follows the pointer, and the target's decoration draws it.
3. Dropping over an empty group gives `{ into: 'D' }`. Dropping over B's items gives `{ before: 'B/x' }`. `moved` gets
   the target unchanged, plus the modifiers. What a move across groups means, and what Alt does, is the app's
   handler's decision.

Wiring check: reorder's parameters are an element source, a drop target and a callback. **Passes.**

### 3. Typeahead over ten billion items on a server

```js
const ta = typeahead({ load })
scope({ target: container, takesText: [ta.takes], bindings: { $char: async (event) => focus.go(await ta.type(event.key, focus.active.get())) } })
```

1. The person types "s". `ta.takes` takes it, so `$char` runs. `ta.type` loads `{ find: 's', from }`: one request,
   answered from the server's index.
2. The person types "a" before the answer arrives. That is a new action with a new load. The answer for "s" is never
   delivered, so it can't move focus. Nor can it move focus after an ArrowDown pressed meanwhile.
3. `focus.go(key)` gets a hold from windowing. If the key isn't drawn, windowing loads `{ around: key }`. Assuming: the
   server answers `find` with the entries around what it found. Then the cache answers that load, and the action stays
   one request. If not, it is two.
4. Space while typing goes on is taken by `ta.takes`, so it reaches `$char`. Otherwise Space goes to selection's
   binding. The two can't both run.

Assuming: the server can answer "the first place at or after `from`, in this order, under this filter, whose text
starts with T" from an index. **Passes, on that assumption.**

### 4. Two listboxes in one view

Everything above, twice:
- Each list has its own loader, windowing, focus, selection and scope, on its own container.
- `keyOf` reads only its own windowing's attribute, inside its own container.
- `activeDescendant` takes its ids from its own container's `id`.
- Each scope listens on its own container, and a command that runs stops the event.
- Two loaders batch separately. Assuming: one transport can merge two lists' loads made in one action into one
  request. Otherwise two lists changed by one action cost one request each.

Wiring check: nothing is shared. **Passes.**

### 5. A feature nobody planned: a grid of cards

```js
const grid = gridNavigation({ load, columns: () => columnsIn(container) })
bind({ ArrowDown: async () => focus.go(await grid.below(focus.active.get())), ArrowRight: down, ... })
view({ ..., item: decorations(win.item, focus.item, sel.item, gridRoles.cell) })
```

- Windowing measures boxes, not stacking, so a grid layout needs nothing from it.
- Focus, selection, typeahead and reorder take keys and are unchanged.
- Inline cell editing (`cellEditing`) needs no other module to change either. The editor is an input inside the
  item, and the list's scope has `textField` as a taker, so the list's character and editing-key bindings don't run
  while text is typed. Arrow-key navigation still runs on Up and Down.

  Whether the list's other keys should do nothing while a cell is edited is a UX proposal. If so, the editor gets its
  own scope with only Enter and Escape bound.

**Passes.**

### 6. A tree with multiple selection

```js
const exp = expansion()
const load = serverLoader(transport, { query, expanded: exp.expanded })
const tree = treeNavigation({ load })
bind({
  ArrowRight: async () => { const k = focus.active.get(); exp.isExpanded(k) ? focus.go(await tree.firstChild(k)) : exp.expand(k) },
  ArrowLeft:  async () => { const k = focus.active.get(); exp.isExpanded(k) ? exp.collapse(k) : focus.go(await tree.parent(k)) },
  ArrowDown: down, 'Shift+ArrowDown': shiftDown, Space: toggle,
})
view({ ..., item: decorations(win.item, focus.item, sel.item, exp.item, treeRoles.item) })
```

1. Expanding a node changes the loader's query. The loader reports `{ keys }` around that node, and windowing loads the
   children that come into view.
2. ArrowDown walks the visible places in order, because the loader answers `{ after }` over the expanded tree.
3. Shift+ArrowDown and Shift-click make range descriptions over visible places. Ctrl+Space toggles. The server answers
   membership, including for a collapsed subtree's descendants when the range covers its parent. That last point is a
   UX proposal.
4. `aria-level` and `aria-setsize` come from the entry's value, through `treeRoles` reading the entry.

Wiring check: expansion knows nothing of the loader. The loader takes a state of expanded keys, its own parameter.
**Passes.**

### 7. A combobox with server-side suggestions, under windowing

```js
const load = serverLoader(transport, { query: '' })
const pop = overlay({ element: popup })
const win = windowing({ load, scroller: popup, container: listElement })
const focus = activeDescendant({ elements: win, start: () => Promise.resolve(undefined) })  // container: the input
input.addEventListener('input', () => { load.setQuery(input.value); pop.show() })
scope({ target: input, takesText: [textField], bindings: { ArrowDown: down, ArrowUp: up, Enter: choose, Escape: () => pop.close('escape') } })
view: input gets decorations(focus.list, comboboxRoles.input); options get decorations(win.item, focus.item, comboboxRoles.option)
```

1. Typing goes to the input, because `textField` takes characters and caret keys.
2. Each change of text is an action. `setQuery` reports `{ reset }`. Windowing loads `{ first }` and ends the hold on
   the active option if the new answer lacks it, so `aria-activedescendant` disappears instead of pointing at nothing.
   Answers to earlier text are never delivered.
3. ArrowDown runs in the input's scope, because `textField` doesn't take it. `focus.go` sets `aria-activedescendant` on
   the input once windowing has drawn the option.
4. Escape runs in the input's scope too. That is where focus is, so it fires. This is the fix for an Escape bound on
   the overlay's scope never running.

Wiring check: overlay, windowing and focus each take only their own parameters. **Passes.**

### The command palette

The palette is test 7 with `memoryLoader(searchCommands(commands, query))`. The command list is in memory anyway, as the
app's data, and the search makes one array of scored results, which the loader reads from. There is no second copy.
But that array is a copy of the matching commands, so the palette does still copy its results once. See "What I
couldn't fix".

### What the worldbuilding page needs

- **Views, axes, saved views and filters** are the loader's query.
- **Regions with "+N more" and repeats** are drawn by the app over places. A path key catches repeats along the drawing
  path.
- **Selection as a filter plus exceptions**: `selection`'s value, which the server interprets for bulk actions.
- **Reordering from a grip only, and only under the author's order**: `handle`, plus the app drawing the grip only then.
- **Moving between groups**: drop targets, as in test 2.
- **Marks in text**: `rovingFocus` over a `domElements(container, selector)` element source, with `overlay` and
  `anchored` for the hover card.
- **A card's menu with "Move to…"**: the menu composition, with a combobox from test 7 in it.

## What I couldn't fix

1. **Positions without an order-statistic index.** `aria-posinset`, `aria-setsize` and a proportional scrollbar need the
   server to say where a place is in the whole order. Anchor-only windowing has no other source for them. Without them
   the attributes are left out. `aria-setsize="-1"` means "unknown", and using it is a UX proposal. I don't know
   whether SillyTavern's engine can give positions.
2. **The palette copies once.** In-memory search has to produce its ranked results somewhere. They are one array, made
   by the search. They aren't copied again into a source, but they do exist apart from the commands.
3. **Staleness is per action, not per question.** The loader drops every answer from an older action once a newer one
   has loaded. Scrolling while a typeahead search is pending therefore drops the search. Whether that is right is a UX
   proposal. Making it finer would mean the loader knowing what each request is for.
4. **One tie-break in keybinds** (exact over `anyModifiers`) remains, flagged under "Changes to keybinds".
5. **Two lists in one action** cost one request each, unless the transport merges loads across loaders (Assuming
   above).
6. **The changes to keybinds are designed, not checked.** I read the code they change (`core.js:200-260, 335-410`,
   `modal.js`, `keys.js:20-49, 90-100, 236-278`, `mouse.js:322-376`, `input.js:120-161`). I haven't traced
   sequences, holds or gamepad input through them.

## Decisions for the owner

- Names items by key instead of sharing positions, which replaces the accepted positional source model.
- keybinds' overlay and text-field policies become opt-in, which breaks apps that rely on today's defaults.
- Whether selecting an entry in one place selects it in every place it shows. The server's membership answer decides
  it, so it is one rule on the server.
- What a range across groups, or across a collapsed subtree, covers.
- Whether a selection survives a query change. The current code clears it (`list-selection.js:99-101`).
- Where focus goes when its item disappears: nowhere (this design), or to a neighbour.
- On a query change, whether windowing goes to the top (this design) or keeps its place.

## UX proposals

Each of these is a proposal for the owner, not a decision:

- In single selection, selection follows focus (an app command, as in test 1).
- Shift+Arrow extends the selection, and Ctrl/Cmd+Arrow moves focus without selecting.
- Space toggles the active item's selection in multiple mode.
- Ctrl/Cmd+A selects all matching.
- Typeahead: characters search, Space continues a search in progress, and the `wait` length.
- Escape closes the top overlay, in the scope that has focus.
- A press outside closes an overlay, and focus leaving closes it.
- Alt+ArrowUp and Alt+ArrowDown move an item.
- A keyboard move at a group's end crosses into the next group.
- The list auto-scrolls while dragging near its edges.
- Dragging starts only from a grip.
- Drop-target halves: before or after; in a tree, the middle as "child of".
- Alt held while dropping is left to the app (worldbuilding: "keep both").
- While a cell is edited, list keys that type text do nothing.
- ArrowRight and ArrowLeft in a tree expand, collapse and move to child or parent.
- In a menu, ArrowRight and ArrowLeft open and close a submenu, with a pointer delay and a safe triangle.
- With nothing active, focus entering a list goes where the app's `start` says (first item, or first selected).
- When the active item disappears, nothing is active and the container becomes the tab stop.
- `aria-setsize="-1"` when the total isn't known.
- Staleness drops an older action's answers when any newer action loads.

## Names (proposals)

Every name here is the owner's to approve. The reviewer found eight of the first draft's names unclear. They are
replaced:

| Old | New |
| --- | --- |
| `only` | `selectOne` |
| `span` | the range description, `{ from, to }` |
| `everything` | `selectAllMatching` / `'all'` |
| `cell` | **state** |
| `needs` | **parameter** |
| `descendant` | the container decoration |
| `shown` | `rows` |
| `read` | `load` |

- **Concepts:** key, entry, state, command, parameter, loader, order request, description, element source, hold,
  decoration, rows, stylesheet, scope, condition, text taker, composition, drop target.
- **Modules and helpers:** `windowing`, `plainList`, `domElements`, `activeDescendant`, `rovingFocus`, `listNavigation`,
  `gridNavigation`, `treeNavigation`, `columnsIn`, `typeahead`, `selection`, `expansion`, `reorder`, `overlay`,
  `anchored`, `closeOnOutsidePress`, `closeOnFocusLeaving`, `overlayStack`, `submenus`, `submenuPointer`,
  `inlineCompletion`, `cellEditing`, `listboxRoles`, `menuRoles`, `comboboxRoles`, `treeRoles`, `gridRoles`,
  `decorations`, `view`, `state`, `serverLoader`, `memoryLoader`.
- **Commands:**
  - focus: `go`;
  - navigation: `next`, `previous`, `first`, `last`, `pageDown`, `pageUp`, `below`, `above`, `rowStart`, `rowEnd`,
    `parent`, `firstChild`;
  - typeahead: `type`;
  - selection: `selectOne`, `toggle`, `extendTo`, `addRange`, `selectAllMatching`, `clear`;
  - expansion: `expand`, `collapse`, `toggle`;
  - reorder: `moveUp`, `moveDown`;
  - overlay: `show`, `close`;
  - submenus: `open`, `close`;
  - inline completion: `complete`;
  - cell editing: `start`, `commit`, `cancel`;
  - plain list: `loadMore`.
- **States and reads:** `active`, `value`, `isSelected`, `expanded`, `isExpanded`, `dragging`, `target`, `open`,
  `loading`, `rows`, `entries`, `spaceBefore`, `spaceAfter`, `position`, `total`.
- **Parameters:** `load`, `changes`, `setQuery`, `elements`, `elementFor`, `keyOf`, `release`, `gone`, `start`,
  `container`, `scroller`, `pageSize`, `columns`, `wait`, `mode`, `attribute`, `handle`, `targets`, `at`, `moved`,
  `modifiers`, `element`, `modal`, `allowClose`, `anchor`, `placement`, `page`, `inside`, `parent`, `hasSubmenu`,
  `openSubmenu`, `closeSubmenu`, `input`, `textOf`, `editing`, `commit`, `roleOf`, `draw`, `styles`.
- **Order requests:** `first`, `last`, `after`, `before`, `around`, `count`, `find`, `from`, `parent`, `firstChild`,
  `describe`, `membership`.
- **Selection value:** `ranges`, `added`, `removed`, `anchor`.
- **Changes:** `keys`, `reset`.
- **Drop targets:** `before`, `after`, `into`, `childOf`.
- **keybinds additions:** `unless`, `outsideOpenOverlay`, `takesText`, `textField`, `$char`, `onConflict`.
- **Element names** for the compositions: `<interact-listbox>`, `<interact-menu>`, `<interact-combobox>`,
  `<interact-palette>`, `<interact-tree>`. The prefix is the app's, at registration.
