# Design

Status: a proposal for the rebuild, to be reviewed before anything is built. No code exists for it yet. Every name in it
is a proposal (listed at the end). Nothing in it decides a UX behaviour: where one has to be chosen, it is under
"Decisions for the owner".

## The answer in one paragraph

There is no library core. The library is a set of independent modules. Each is a plain function that takes what it
needs as arguments and returns its own state and its own commands. A module never renders and never listens to keys. It
reaches another module only through a function the app handed it. The app does the combining: it creates the modules it
wants, passes each the functions it asks for, binds keys to commands with `keybinds`, and renders the DOM from the
modules' state. The ready-made components are this same app code, shipped with the library. Items are always named by
their key, never by a position another module made, so there is no shared list for modules to disagree about.

The requirement, restated as tests this design must pass:

- each module works on its own and defines its own interface;
- the app combines the modules it wants;
- there is nothing every feature has to go through;
- any module can be left out or replaced, and adding one changes no other module.

"Changes nothing else" means: no other module's code, no priority, no registry. The app's own wiring does mention the
new module, because that wiring is the combining.

## Why the current code fails, at the root

Each failure in the brief comes from one of four things every feature shares in the current code. This design has none
of them.

1. **A shared positional list.** Every feature reads one list. List-stage transforms rebuild it
   (`packages/core/src/list-pipeline.js:448-461`), and features refer to items by their position in it (`Press`,
   `reveal`, `mapPosition`, `list-pipeline.js:76-78, 204, 357-370`). A transform that makes a different list breaks
   every feature that held positions:
   - Selection refuses and throws (`packages/components/src/list-selection.js:185-190`).
   - Grouping inserts its headings as items, so every position counts them
     (`packages/components/src/grouped-sections.js:395, 473`).
   - Grouping forwards only the one query it knows by name, `findPrefix` (`grouped-sections.js:532-536`). Any other
     question, such as reorder's, gets positions that count headings.
2. **A shared dispatch.** One store applies every feature's transactions from one queue
   (`packages/core/src/store.js:157-178`). If one throws, the `finally` empties the queue (`store.js:177`) and drops
   other features' pending updates. Transaction filters rewrite each other's effects by type
   (`packages/core/src/state.js:408-417`); selection's filter runs at `highest` (`list-selection.js:127-130`).
3. **A shared input chain with priorities.** Every input goes down one list of handlers until one takes it
   (`store.js:186-194`), and the list is ordered by guessed levels (`state.js:7-10`):
   - Typeahead is at `high` (`packages/components/src/typeahead.js:139`) so it takes Space before selection does.
   - Reorder is at `high` (`packages/components/src/reorder.js:119`) because navigation steps aside for the toggle
     modifier but not for Alt (`packages/components/src/navigation.js:61`).

   The same chain causes the other input failures:
   - Each feature names its keys in its own code (`list-selection.js:276-281`, `reorder.js:318-325`).
   - The toggle modifier merges Control and Command (`packages/core/src/inputs.js:5-9`,
     `packages/dom/src/default-rendering.js:59, 75`).
   - The default rendering gives every key pressed in any `[data-list]` of its view to its one store
     (`default-rendering.js:53-63`), and finds rows by `data-position` (`default-rendering.js:74`). Two lists in one
     view therefore share both.
   - Option ids default to `listbox-<position>` (`packages/components/src/listbox.js:60, 118`), so two instances
     collide.
4. **A shared rendering.** The pipeline's row, item and container stages (`list-pipeline.js:222-246, 412-440`) decide
   the shape of the DOM:
   - Windowing assumes rows are the direct children of one scroller (`windowing.js:304`) and all have one height
     (`windowing.js:35`). Grouping can therefore only put its headings flat among the options, with
     `role="presentation"` (`grouped-sections.js:295`).
   - Each component fixes its roles and its focus model as attributes (`listbox.js:75-81`, `active-item.js:95`).
   - Every component's stylesheet includes windowing's (`listbox-styles.js:97`, `menu-styles.js:117`,
     `combobox-styles.js:108`, `palette-styles.js:143`).

The other failures come from closed sets inside components:

- the combobox's `kind` switch (`packages/components/src/combobox.js:64-69, 123-134`);
- the menu's entry kinds (`packages/components/src/menu-entry.js:14-18, 51-57`);
- the palette's own view (`palette.js:285, 381`), with search results copied into a `MemorySource`
  (`palette.js:107-110`);
- the dismissal reasons (`packages/core/src/layer.js:7`);
- overlay open state kept in the layer rather than the component (`packages/dom/src/overlay.js:269`);
- bundles that are functions returning fixed lists (`combobox-extensions.js:23-34`, `menu-extensions.js:26-41`,
  `palette-extensions.js:21-31`).

Assuming: hydration "can't be left out" because the renderer's hydration markers and adoption live in the same
`@interact/dom` package as plain rendering (`render-string.js:62-76`, `markers.js:2`, `adopt.js:47-62`). I did not
trace whether a page that never hydrates still loads that code.

## What this keeps from the current design document

These sections of the earlier document were settled with the owner, and nothing here changes them:

- no runtime dependencies;
- plain JavaScript with fully type-safe JSDoc, so "type" below means a JSDoc type;
- one module per part, with one test file per module;
- an app ships only what it uses;
- a module that isn't loaded is an error that names it, never a silent no-op;
- the DOM decisions for the ready-made elements: shadow or light DOM per instance, styles scoped with `@scope`,
  registration with no side effects on import, and server rendering;
- styling: tokens at five levels, zero specificity, and cascade layers;
- generated wrappers and types.

All of these apply to the ready-made elements, which are compositions (see "Roles and the components").

This design departs from one model the owner accepted: "a lazy source: a count, items by range, an item's position"
(earlier document, Questions for the owner, 2). Here modules never share positions, and no shared source type exists.
That departure is the owner's to accept or refuse (see "Decisions for the owner").

## The concepts

A person using the library learns four things, plus each module's own small API.

1. **Key.** What names an item: a string or number from the app's data, the same wherever the item moves and whatever
   view shows it. Every module that holds an item holds its key. Positions exist only inside the module that computes
   them and never pass to another module.

   *Why:* this makes the first root failure impossible. No module can be handed a position counted in a list it doesn't
   know.

   One item can show in several places: worldbuilding's "an entry in several groups appears in each". There, the app
   chooses which key each module gets. Focus and navigation get the key of the *place* where it shows, such as the path
   `[group, entry]`. Selection gets the entry's own key. That choice shows in the wiring, one line per module.

2. **Cell.** Any object with `get()`, `set(value)` and `subscribe(listener) → unsubscribe`. A module that has state keeps
   it in a cell. It makes its own cell unless the app passes one in; then the app's cell is the only copy.

   *Why:* it gives every piece of state one source of truth, chosen by the app piece by piece, with no store to hold
   them. The app's renderer re-renders from the cells it reads. The library ships a ten-line `cell(initial)`, and any
   object of the same shape works.

3. **Command.** A function a module returns that does one thing: `next()`, `toggle(key)`, `close('escape')`. Modules
   never see keys or pointer buttons. The app binds keys to commands with `keybinds`. Each module also exports suggested
   bindings as plain data, which the app may use or ignore.

   *Why:* keys become rebindable, and Control and Command stay separate keys
   (`packages/keybinds/src/binding-mods.js:17-27`). No module can take a key from another, because no module takes
   keys.

4. **Needs.** A module's options name the functions it calls, and nothing else, as its own JSDoc type. Everything comes
   in this way: the data it reads (`after(key)`, `find(text, from)`), the elements it touches (`container`,
   `keyFrom(element)`), and other modules' commands it should call (`go(key)`). The library has no shared `Source`
   type. One app adapter object can meet several modules' needs, because JSDoc types are structural.

   *Why:* this is what "each module defines its own interface" means in code. A new module that needs something new
   declares it, and nothing else changes.

That is the whole vocabulary at the library level. `keybinds` has its own (command, binding, `when`, `target`,
`BindingsStore`), which any app that rebinds keys learns anyway.

The library does not have effects, transactions, facets, fields, plugins, input handlers, levels, a store, a pipeline, a
query registry, a source type, or a rendering.

## Rules every module follows

- It is a function `name(needs) → { cells, commands, reads }`. It has no global state and registers nothing anywhere.
- It names items by key.
- It does not render, and it does not set attributes on elements the app renders. It exposes values, such as
  `descendant()` or `isSelected(key)`, and the app's template writes them.
- It touches the DOM only for what can't be state:
  - calling `focus()`;
  - setting `scrollTop`;
  - measuring;
  - listening to pointer or scroll events on an element it was given;
  - `showPopover()`, `hidePopover()` and `showModal()`.
- It listens only on elements it was given. It acts only on events whose target its `keyFrom` or `inside` accepts, so
  two instances in one view never hear each other.
- If it needs structural CSS, it exports its own stylesheet (`styles`). The app adopts the stylesheets of the modules it
  uses, and no component carries another module's CSS.
- When one of its commands fails, that command has failed and nothing else. There is no queue for it to empty.
- Its data reads may return a value or a promise. Each module keeps its own request counter and drops an answer that
  arrives after it made a newer request.

## Data

The page holds only what it shows. The data lives behind the app's adapter: the server, for SillyTavern; an in-memory
helper, for a small list.

Filter and sort are not modules of this library. They are the app's query, and the app makes its adapter from that
query (`server.view({ filter, order })`). Every module reads data through functions of that adapter, so the data's own
indexes answer whatever a module asks.

When the query changes, the app passes the new adapter's functions. Modules that hold keys keep them, because keys
survive a query change. The windowing module re-anchors (below).

Each data function is defined by the module that calls it:

| Function | Called by | Meaning |
| --- | --- | --- |
| `read({ after \| before \| around: key, count })` → entries | windowing, load as you scroll | the entries next to a key in the view's order, each `{ key, value }` |
| `first()`, `last()`, `after(key, n)`, `before(key, n)` → entry | navigation, grid navigation, reorder, focus entering | one entry by order, `n` steps away |
| `find(text, from)` → entry | typeahead | the first entry at or after `from`, wrapping round, whose text starts with `text` |
| `everything()`, `span(fromKey, toKey)` → filter | selection | an opaque filter the server understands |
| `matches(filter, value)` → boolean | selection | whether an item held in memory is in a filter |
| `firstIn(filter, except)` → key | focus entering (optional) | where a selection starts |
| `count()`, `keyAt(index)`, `indexOf(key)` | windowing (optional) | only for a scrollbar that is proportional to the whole list |

Each function returns the entry, not only its key. The action that asked can then draw its result from that one answer:
one user action, one request.

The in-memory helper, `fromArray(items, keyOf, textOf)`, implements all of these for lists that fit in memory. It is an
adapter, not a type every module depends on.

The server may push changes, such as another tab editing an entry. They go to the app's cache of what is shown, and the
app re-renders. No module maps positions through changes, because no module holds positions.

## The modules

For each module: what it needs, what it gives, and what it does not do.

### Focus: `activeDescendant` and `rovingFocus`

Two modules with the same commands. The app picks one.

- `activeDescendant({ container, active?: Cell<Key>, exists(key) })` gives `active` (a cell), `go(key)`, `idOf(key)` and
  `descendant()`.
  - The app writes `id=${idOf(key)}` on each item and `aria-activedescendant=${descendant()}` on the container.
  - `descendant()` is undefined while `exists(active)` is false, so the attribute never points at a missing element.
  - An id is the container's own `id` (the module gives the container one if it has none) plus the encoded key. Two
    instances never collide, and server-rendered ids match the browser's without any coordination.
- `rovingFocus({ container, active?: Cell<Key>, elementFor(key) })` gives `active`, `go(key)` and `tabIndexOf(key)`: 0
  for the active item, -1 for the others. `go` moves focus to `elementFor(key)` once that element exists.

Neither module knows what the items are, what roles they have, or how the next item is found.

### Navigation: `listNavigation`

`listNavigation({ order: { first, last, after, before }, current: () => Key | undefined, go(key), page?: () => number })`
gives the commands `next`, `previous`, `first`, `last`, `pageDown` and `pageUp`. Each asks `order` for one entry and
calls `go` with its key.

Its suggested bindings are the arrow, Home, End and Page keys with no modifiers. `keybinds` matches modifiers exactly, so
Alt+ArrowDown is a different binding, and navigation never sees it.

It does not skip headings. Headings are never in its `order` (see Grouping).

### Typeahead: `typeahead`

`typeahead({ find(text, from), current, go, now?, wait? })` gives `type(character)` and `typing()`. `typing()` says
whether a character was typed within `wait`.

`type` keeps what was typed in its own cell and asks `find` once. It never looks at rendered rows, so under windowing or
over a server it finds what the data finds.

It needs characters typed, and `keybinds` has no binding for "any character typed". See "What I couldn't make work".

### Selection: `selection`

`selection({ mode: 'single' | 'multiple', everything, span, matches, chosen?: Cell<Selection> })`.

A `Selection` is `{ filter?, added: Set<Key>, removed: Set<Key>, anchor?: Key }`: every item the filter matches except
those in `removed`, plus those in `added`. "All except" over ten billion items is one filter and a set of exceptions,
and nothing is read to select.

It gives:

- the commands `only(key)`, `toggle(key)`, `extendTo(key)` (from the anchor), `selectEverything()` and `clear()`;
- the reads `isSelected(key, value)` and `chosen` (the cell).

It does not know about the active item. In single selection, the selected item follows focus because the app passes
navigation `go: (key) => { focus.go(key); selection.only(key) }`: one line in the wiring.

It does not write `aria-selected`. The app's template writes that, or `aria-checked` in a menu, from `isSelected`.

### Focus entering: `focusEntering`

`focusEntering({ container, current, go, choose: () => Key | Promise<Key> })`: when focus comes into the container and
nothing is active, it calls `go(await choose())`.

The app's `choose` decides where focus goes (the first selected item, the first item, the item last chosen), built from
whichever modules the app has.

### Windowing: `windowing`

`windowing({ scroller, read, pinned?: () => Key[], estimate?: (key) => number, sizes? })` gives:

- a cell, `shown`: `{ before: px, keys: Key[], after: px }`;
- `measure(key, element)`;
- `reveal(key)`;
- `styles`.

How it works:

- **Anchor.** It keeps an anchor: a key and its offset from the top of the viewport. It fills the viewport and a margin
  by calling `read({ after | before: key, count })`, so it never needs a count. With the optional `count`, `keyAt` and
  `indexOf` it can also map a proportional scrollbar.
- **Row heights.** Rows can be any height. The app registers row elements with `measure(key, element)`. The module
  measures their boxes relative to the scroller, so the rows don't have to be its children, and it estimates the rows
  it hasn't measured. It keeps sizes only for keys it rendered recently, so its memory does not grow with the list.
- **DOM structure.** It does not decide any. The app renders `shown.keys` however it likes, in groups, a table or a
  grid. It puts the `before` and `after` space wherever it wants, as padding or as spacer elements.
- **Pinned keys.** `pinned` keys are rendered even outside the window, visually hidden, so a focused or dragged item
  never leaves the DOM. The app passes `() => [focus.active.get(), reorder.dragging.get()]` for the modules it has.
- **Reveal.** `reveal(key)` scrolls a rendered key into view. If the key isn't rendered, it re-anchors at it with
  `read({ around: key })`, which is one request.
- **CSS.** Its stylesheet ships only with it.

Earlier designs rejected a "render range". I don't know exactly what that proposal was. `shown` is this module's own
output: only the app's template reads it, no other module goes through it, and without windowing the app renders every
key it has. Reviewers should check whether that still counts as the rejected idea.

### Load as you scroll: `loadAsYouScroll`

This is for lists the app renders whole rather than windowed.

`loadAsYouScroll({ sentinel, read, last: () => Key | undefined, loaded(entries) })` watches the sentinel element. When
the sentinel shows, it calls `read({ after: last(), count })` and hands the page of entries to `loaded`. It gives a
`loading` cell the app can show, and it keeps no items.

With windowing it isn't needed, because windowing reads as the list scrolls.

### Grouping: a way of rendering, plus `nestedOrder`

Grouping is not a module. A grouped list is nested lists: a list of groups, each holding its members. The DOM is the
WAI-ARIA grouped listbox because the app renders it that way: `role="listbox"` › `role="group"`, labelled by its heading
through `aria-labelledby` › `role="option"`. Groups are not items of anything, and headings never enter navigation,
selection or typeahead.

What grouping does need is an order across the nesting, for the modules that walk it:

- **Server data.** The app's adapter answers in that order itself, keyed by place, so `after([group, entry])` is one
  request. Worldbuilding's indexes per relation and target provide this order.
- **In-memory data.** `nestedOrder({ groups, membersOf })` composes one order from the list of groups and an order per
  group.

Windowing over a grouped list reads the order of *rows*, headings and members. Navigation reads the order of members
only. They are two functions of the adapter, and each module gets the one it needs.

### Reorder: `reorder`

`reorder({ container, keyFrom, handle?, siblings: { after, before }, moved({ key, before? | after?, modifiers }), scroller? })`
gives:

- the commands `moveUp(key)` and `moveDown(key)`, which move an item to just before its previous sibling or just after
  its next one;
- a pointer drag on the items under `container`, starting only from elements `handle` accepts (Assuming: this option,
  one more need of reorder's);
- the cells `dragging` (the key) and `target` (`{ key, side }`), for the app to draw;
- `styles`, for its drop indicator.

It reports a move by the neighbours' keys, never by positions, so nothing it says depends on what else is rendered.
During a drag it scrolls `scroller` near its edges, and windowing, if present, follows that scroll like any other.
`modifiers` are `{ alt, ctrl, meta, shift }` as they were at the drop, not merged, so the app decides what Alt means
(worldbuilding's "keep both").

### Overlays: `overlay`, `anchored`, and one module per way of dismissing

- **`overlay({ element, modal?, open?: Cell<boolean>, onClose? })`** shows and hides `element`, and gives the commands
  `show()` and `close(reason)`.
  - A non-modal overlay is a popover in manual mode, so the cell stays the only truth. The browser's light dismiss would
    otherwise change the open state behind the cell's back.
  - A modal overlay is a `<dialog>` shown with `showModal()`, as the earlier document settled.
  - `close(reason)` calls the app's `onClose(reason)` if it gave one, and that decides whether the overlay closes. A
    reason can be any value, so there is no closed set of reasons.
- **`anchored({ element, anchor, placement })`** places an overlay next to its anchor. Assuming: CSS anchor positioning,
  or the existing placement code (`packages/core/src/placement.js`), is enough. I did not check what browser support
  that needs.
- **Dismissal** is one module per way of dismissing:
  - `closeOnOutsidePress({ overlay, inside: (target) => boolean })`;
  - `closeOnFocusLeaving({ overlay, inside })`;
  - Escape is a key, so it is a binding to `overlay.close('escape')` in the overlay's own `keybinds` scope.

  A new way of dismissing is a new module.
- **`layers()`** (optional) is a stack the app creates for overlays that nest. It gives `push(overlay)`, `top()` and
  `contains(overlay, target)`. The app passes `contains` as `inside`, so a press in a submenu doesn't count as outside
  its parent menu. The stack covers only the overlays the app gives it.

### Roles and the components

A component is a role pattern, not a module with state. The role modules, `listboxRoles`, `menuRoles` and
`comboboxRoles`, are pure functions that give the static ARIA a pattern needs, and the app's template writes it. A menu
entry's role comes from the app's `roleOf(entry)`, so entry kinds belong to the app: `menuitem`, `menuitemcheckbox`,
`menuitemradio`, `separator`, or any other the app needs.

- **Listbox.**
  - Always: a focus module, navigation, a `keybinds` scope on the listbox element, and `listboxRoles`.
  - As wanted: typeahead, selection, windowing, grouping, reorder, focus entering.
- **Menu with submenus.**
  - A menu is a listbox-shaped composition, with `menuRoles`, inside an `overlay`.
  - A submenu is another menu instance, whose overlay is anchored to its item.
  - `submenus({ open(key), close(), hasMenu(key) })` gives the commands `openSubmenu` and `closeSubmenu` for the app to
    bind. The APG suggests ArrowRight and ArrowLeft.
  - The pointer delay and the safe triangle are a separate module, `submenuPointer({ ... })`.
- **Combobox.** Its parts are:
  - an input, or a focusable element for a select-only combobox;
  - an overlay holding a listbox;
  - `activeDescendant`, with the *input* as its container.

  Whether it is editable, and how it autocompletes, is not a switch. Editable means the input's text feeds the adapter's
  query. Inline completion is a module of its own, `inlineCompletion({ input, current, textOf })`. Each is either there
  or not.
- **Command palette.** A combobox whose adapter is the command search: `keybinds`' `searchCommands`, or the
  `CommandHub`'s command system. It reads the search like any other adapter, so no results are copied. Its strings and
  its view are in the app's template.

The library ships ready-made compositions (`<interact-listbox>`, `<interact-menu>`, ...) as files of plain wiring code
that use only the public modules. The settled DOM, registration and styling decisions apply to these.

Taking a ready-made composition apart means not using it: every part it uses can be imported on its own. It also takes
module instances as options, so one part can be replaced.

### Keys: `keybinds`

The app makes one `keybinds` scope per component, from the commands of the modules it has. The scope's `target` is the
component's focus element (`keybinds/src/core.js:330`). A command that runs stops the event (`core.js:362-363`), so an
outer scope gets only the keys the inner one didn't take. Rebinding is done with `keybinds`' `BindingsStore`.

Two of the app's modules can want the same key. Space, for example, is typeahead's while typing and selection's
otherwise. The app writes that key's bindings with `when`, in its own keymap:

- `Space → typeahead.type(' ')` when `typeahead.typing()`;
- `Space → selection.toggle(active)`.

`keybinds` runs the first allowed command (`core.js:406-407`), so the order of those two lines is the decision. It is
written once, where the key is bound, by whoever chose both modules, and neither module knows the other.

A proposal, not built: a helper that refuses a keymap where one key has two commands and the earlier one has no `when`,
so the choice can't be made by accident.

### Hydration and rendering

The library has no rendering, so it has no hydration. Modules attach to elements, whether the app's renderer made them
in the browser or adopted them from server markup.

What happens to the existing template code in `@interact/dom` is a separate decision for the rebuild: whether it stays,
and if so as which separate entry points (rendering, server rendering, hydration).

## The combinations, step by step

### 1. Selection with grouping

Wiring:

```js
focus = rovingFocus(...)
sel = selection({ everything: adapter.everything, span: adapter.span, matches: adapter.matches })
nav = listNavigation({
  order: adapter.members,
  go: (place) => { focus.go(place); sel.only(entryOf(place)) }, // single selection
  ...
})
```

1. The person presses ArrowDown on the last option of group A. `keybinds` runs `nav.next()`.
2. `nav` calls `adapter.members.after([A, k])`. The adapter answers `[B, m]`, the first member of B, with its value.
3. `nav` calls the app's `go([B, m])`. `focus.go([B, m])` sets `focus.active`, and `sel.only(m)` sets `sel.chosen` to
   `{ added: {m} }`.
4. The app re-renders. `tabindex` or `aria-activedescendant` comes from `focus`. On every rendered option,
   `aria-selected` comes from `sel.isSelected(entry, value)`. If `m` is also in group C, its option there shows
   selected too, because selection holds the entry's key.
5. The person Shift-clicks an option in group D. The app's pointer binding calls `sel.extendTo(entryOf(place))`. `sel`
   calls `adapter.span(anchor, m)` and stores the filter it returns. What a range across groups means is defined by the
   adapter, and it is the owner's decision.

No module saw a heading or a position. Nothing can throw over "a different list", because there is no list. **Passes.**

### 2. Reorder in a grouped, windowed list

Wiring:

```js
win = windowing({ scroller, read: adapter.rows, pinned: () => [focus.active.get(), re.dragging.get()] })
re = reorder({ container, keyFrom, siblings: adapter.siblings, moved: server.move })
```

1. The app renders `win.shown.keys`, heading rows and member rows. It wraps each run of one group's rows in that group's
   `role="group"` element, puts `before` as padding above the first group, and calls `win.measure` on each row.
2. The person presses Alt+ArrowDown on `[A, k]`. `keybinds` matches the Alt binding, which only `re.moveDown` has.
3. `re` asks `adapter.siblings.after([A, k])` and gets `[A, j]`. It asks the data, so it finds `[A, j]` even if that row
   isn't rendered. `re` then calls `server.move({ key: [A, k], after: [A, j] })`.
4. The server writes the one entry's fractional order key and answers with the state change. The app's cache applies
   it. `win` reads again only if its rendered keys changed, and the app re-renders. `focus.active` is still `[A, k]`,
   and `pinned` keeps that row rendered wherever it moved.
5. A pointer drag works the same way:
   - `re` gets pointer events on `container` and maps their targets to keys with `keyFrom`.
   - It keeps `target` as `{ key, side }` of the row under the pointer, and scrolls `scroller` near its edges.
   - `win` hears the scroll and renders new rows. `pinned` keeps the dragged row in the DOM.
   - On the drop, `re` calls `moved({ key, before: [D, x], modifiers })`. Whether the drop changes a group membership,
     and whether Alt keeps both, is up to the app's handler.

Neighbours are named by key, so headings are never counted. **Passes.**

### 3. Typeahead over ten billion items held by a server

Wiring:

```js
ta = typeahead({ find: adapter.find, current: focus.active.get, go: focus.go })
```

1. The person types "s" (through the `keybinds` gap below). `ta.type('s')` sets its buffer to "s".
2. `ta` calls `adapter.find('s', after current)`. That is one request, and the server answers from its index with the
   entry.
3. The person types "a" within `wait`. The buffer becomes "sa" and `ta` makes a new request. If the first answer
   arrives late, `ta`'s counter drops it.
4. `ta` calls `focus.go(key)`. If the list is windowed, the app also wires `win.reveal(key)` into `go`, which re-anchors
   with one `read({ around })` when the key isn't rendered.

The page held only the rows it showed, and the search never looked at them. **Passes, on two assumptions:**

- Assuming: the server can answer "the first entry at or after K, in this order, under this filter, whose text starts
  with T" from an index.
- Assuming: the server's `find` can return the found entry together with the rows around it. Otherwise reveal is a
  second request, which breaks "one action, one request".

### 4. Two listboxes in one view

Wiring: everything above, twice, each with its own `container`.

- **State:** each module instance has its own cells, and nothing is shared.
- **Ids:** each focus module prefixes ids with its own container's id. The containers differ, so the ids differ.
- **Keys:** there are two `keybinds` scopes, each targeted on its own container. A key pressed in one list never reaches
  its sibling's scope, and a command that runs stops the event.
- **Pointer:** `reorder`, `focusEntering` and `closeOnOutsidePress` each listen on their own container and act only on
  targets their own `keyFrom` or `inside` accepts. A nested list's rows are never theirs.
- **CSS:** each list adopts the stylesheets of the modules it uses. Two adoptions of the same sheet are one constructed
  sheet.

**Passes.**

### 5. A new feature nobody planned: a grid of cards

Worldbuilding's boards draw entries as cards, several to a row. This needs one new module, and nothing else changes.

`gridNavigation({ order: { after, before, first, last }, columns: () => number, current, go })` gives `up`, `down`,
`rowStart` and `rowEnd`. `down` is `order.after(current, columns())`. It takes the same shape of `order` the app's
adapter already provides.

1. The app binds ArrowUp and ArrowDown to `grid.up` and `grid.down`, and ArrowLeft and ArrowRight to `nav.previous` and
   `nav.next`. Navigation is unchanged: its bindings were only suggestions.
2. Focus, selection, typeahead and reorder work unchanged, because they speak keys.
3. To window a grid, the app's adapter offers `rows` as rows of cards, each row keyed by its first card's key. `windowing`
   measures row elements as before, unchanged.

I also checked inline row editing, worldbuilding's "clicking a cell edits it". `cellEditing({ editing?: Cell<Key>,
commit(key, value) })` gives `start(key)`, `commit` and `cancel`. While a cell is being edited, focus is in the editor's
input. `keybinds` doesn't run commands while text is being typed unless they capture input
(`keybinds/src/core.js:342-347`), so the list's arrow and Space bindings do nothing, without either module knowing.
Nothing else changes.

**Passes.**

### What the worldbuilding page needs, without putting worldbuilding in the library

- **Views with axes, saved views, filters:** the app's query and its adapter. The library takes functions over them.
- **Grouping with regions, repeats and "+N more":** the app renders nested lists, keyed by place (a path). The path is
  also how it catches repeats ("an entry already open above") without walking the graph.
- **Selection as a filter plus exceptions, with bulk actions on the server:** `selection` stores exactly that, and the
  app sends it.
- **Selecting a range by dragging down the checkbox column:** a pointer module, written by the app or later as
  `dragSelect`, that calls `selection.extendTo`. Not designed here.
- **Reordering only from a grip, and only under the author's order:** the app renders the grip only under that order,
  and `reorder` starts a drag only from elements its `handle` option accepts.
- **Marks in text and their hover card:** a mark is an element with a key. `rovingFocus` over `domOrder(container,
  selector)`, an in-memory order of elements, gives the marks keyboard focus. `overlay` and `anchored` show the card.
  The library knows nothing of marks or looks.
- **A card's menu with "Move to…":** a `menu` in an `overlay`, whose item opens a combobox over the server's entry
  search.

## What I couldn't make work

1. **Typeahead's input.** `keybinds` binds named keys and characters one by one (`keybinds/src/keys.js:40-49`). It has no
   binding for "any character typed". Without one, typeahead has to listen to `keydown` itself, beside `keybinds` on the
   same element. Which of them sees Space first then depends on the order the listeners were added, which is a hidden
   priority.

   The fix belongs to `keybinds`, not to this library: a binding that matches any typed character and passes the
   character to the command (proposal: `$char`). Until it exists, typeahead does not meet the rules.
2. **Shared keys need the app's decision.** The Space conflict between typeahead and selection is settled by the order
   of two bindings with `when` in the app's keymap. That is not a module priority and it is not guessed. Still, every
   app with both modules has to make that decision. I think it belongs to the owner, since it is UX, and I couldn't
   remove it.
3. **Not one request in every path.** Navigation across a group boundary takes one request only if the adapter answers
   in the nested order itself. `nestedOrder`, composing two orders, makes two requests. For server data, answering in
   that order is the adapter's job; for in-memory data, the second call costs nothing.
4. **Pointer modifiers through `keybinds`.** Shift-click and Command-click on an item should go through `keybinds`' mouse
   input, so they can be rebound and Control and Command stay separate. Assuming: its `mouse()` input can bind a click
   with modifiers and hand the command the event, so the app can call `keyFrom(event.target)`. I did not check
   `keybinds/src/mouse.js`.
5. **A proportional scrollbar at ten billion.** It needs `keyAt(index)` from the server, which in turn needs an order
   index that keeps counts (an order-statistic tree). Without that, windowing works from an anchor and the scrollbar
   isn't proportional. I don't know which of the two SillyTavern's engine can provide.

## Decisions for the owner

These are left open because they are UX or the owner's model:

- Whether modules name items by key instead of sharing positions. This replaces the "count, items by range, an item's
  position" source model accepted earlier.
- What navigation does when the active item has been deleted, so the data can no longer place it.
- Whether a selection survives a change of filter. The current code clears it when the source changes
  (`list-selection.js:99-101`).
- What a Shift range across groups selects.
- Whether an item shown in two groups is selected in both. This design makes "both" the natural result, since selection
  holds the entry's key.
- The Space conflict above.
- The default key suggestions for each module.

## Names (proposals)

Concepts: **key**, **cell**, **command**, **needs**.

Modules: `activeDescendant`, `rovingFocus`, `listNavigation`, `gridNavigation`, `typeahead`, `selection`,
`focusEntering`, `windowing`, `loadAsYouScroll`, `nestedOrder`, `reorder`, `overlay`, `anchored`,
`closeOnOutsidePress`, `closeOnFocusLeaving`, `layers`, `submenus`, `submenuPointer`, `inlineCompletion`,
`cellEditing`, `listboxRoles`, `menuRoles`, `comboboxRoles`, `domOrder`, `fromArray`, `cell`.

Their parts: `keyFrom`, `handle`, `elementFor`, `exists`, `idOf`, `descendant`, `tabIndexOf`, `go`, `current`, `order`,
`find`, `typing`, `everything`, `span`, `matches`, `firstIn`, `only`, `toggle`, `extendTo`, `selectEverything`,
`chosen`, `shown`, `measure`, `reveal`, `pinned`, `read`, `siblings`, `moved`, `dragging`, `target`, `onClose`,
`inside`, `styles`.

In `keybinds`, as a request to that package rather than part of this one: `$char`.
