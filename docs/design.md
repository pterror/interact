# Design

Status: a proposal for the rebuild, in its fourth draft after three reviews. No code exists for it. It is the owner's
to approve before anything is built.

- Every name in it is a proposal ("Names").
- Every behaviour a person would notice is a proposal ("UX proposals"), and every policy is either a parameter or one
  of those proposals.
- The data side (navigation, typeahead, selection and expansion each owning their questions) passed the third review
  and is kept. The view layer is new in this draft.

## The design in one paragraph

There is no library core. The library is independent modules. Each module owns the abstractions it needs as its own
parameters, and the app passes in anything that implements them. The app wires by hand: no registry, no central
mechanism.

Writing or wiring a module never needs knowledge of another module. Every parameter is one of these:

- a function;
- a state;
- an element;
- one of the few shared shapes listed under "Concepts".

Every case stays possible, a huge list held by a server included. The modules ask questions ("the key after k", "the
items near k"), and an array or a server's indexes answer them. Batching, prefetching and stale answers are the
implementation's business.

## Tests the design has to pass

1. Each module works alone and owns the abstractions it needs.
2. The app combines modules by hand. There is nothing every feature has to go through.
3. Adding, removing or replacing a module changes no other module's code or parameters. That includes the layouts: a
   new module that asks the layout something uses the general geometry, not a new view feature.
4. Wiring a module needs no knowledge of other modules, and the wiring code runs in declaration order.
5. Each abstraction can be implemented from an index, so a huge server-held list needs no module to change.

## Concepts

Seven concepts. Everything else is ordinary JavaScript: a module's functions, a stylesheet it exports, a file of wiring
(a composition), and a keybinds `Schema` (which exists today).

1. **Key.** A string naming one item, compared with `===`. An item is `{ key, value }`. The data chooses keys that last
   as long as the item does, through every move it supports, so moving an item between groups keeps its key.
2. **State.** `get()`, `set(value)` and `watch(listener) → stop`. Every piece of a module's state is in one. The app may
   create a state and pass it in, and then that is the only copy. A data function whose answer changes over time
   returns a state. That is all "kept up to date" means; it is not a concept of its own.
3. **Attribute writer.** `{ attributes: { name: 'single' | 'tokens' }, apply(element, item?) → stop }`.
   - It writes the attributes it declares, and keeps them in step with its own states until it is stopped.
   - It can be applied to any element: an item drawn by a layout, the list container, or a combobox's input.
   - `combine(...writers)` makes one writer. It takes the union of `'tokens'` attributes. Two writers that declare the
     same `'single'` attribute are an error when `combine` is called, so it fails while wiring, never while running.
   - Each writer declares how its own attributes combine. Views hold no list of token attributes.
4. **Geometry.** What a layout knows about where its items are. Layouts implement it, and windowing, grid navigation,
   reorder, page size and any later module use it:
   - `axis`: `'block'` or `'inline'`, the scroll direction;
   - `span(key) → { start, end } | undefined`: where an item sits along the axis, in content pixels. For an item that
     isn't drawn, the value is the layout's estimate, or `undefined` if the layout doesn't know the item.
   - `keyAt(offset, toward: 'start' | 'end') → key | undefined`: the item at an offset along the axis, or the nearest
     one in the direction given;
   - `box(key) → DOMRect | undefined`: a drawn item's box;
   - `hit(rect) → key[]`: the drawn items whose boxes meet a rect, in order;
   - `watch(listener) → stop`: what it knows has changed.
5. **Drawing range.** A state saying which items a layout draws: `'all'`, or `{ near: key, ahead: px, behind: px }`.
   Layouts read it. Windowing writes it. An app that draws everything creates it as `'all'` and never changes it. No
   layout knows windowing exists, and windowing knows no layout.
6. **Drawn elements.** A state of `Map<key, Element>`, which a layout keeps equal to what it has drawn. Focus, anchored
   overlays, and anything else that needs an item's element read it. It is created before any module, so nothing is
   used before it is declared.
7. **Keymap** (keybinds). One `keybinds()` call on one element, with the rules given under "keybinds": conditions,
   text takers, one command per binding string, and releases that follow their press.

Cut since the last draft, with what replaces them:

| Cut | Now |
| --- | --- |
| Question, and "live" | plain functions; one whose answer changes returns a state |
| Element handle | drawn elements |
| Decoration | attribute writer |
| Condition | part of a keymap |
| Drop target | an opaque value the app passes through reorder |
| Text taker | part of a keymap |
| Latest-wins | each module's own documented behaviour |
| Structure attributes | ordinary attribute writers over item data |
| `gone` and `removed` | focus asking `exists(k)` |
| Member views | gone |
| Follow | `keepVisible`, a parameter |

## Rules every module follows

- A module is a function, `name(parameters) → { states, functions, writers, styles? }`. No parameter is another module.
- It writes attributes only through attribute writers. It touches only DOM it was given or owns.
- Every promise it gets from a data function settles. That is the implementation's contract. A module never waits on
  anything else.
- A failing function fails alone.

## The view layer

### Layouts

A layout draws items into a container it owns. It implements geometry, reads a drawing range, and writes drawn
elements. It knows nothing about windowing, focus or selection. It applies the attribute writer it was given to each
item element it draws, and calls `fill(element, item) → stop` for the content.

All layouts take:

```
container, items, range, drawn, fill, write
```

- `items` is the layout's own data function: `itemsNear(key | 'start', countBefore, countAfter)`, returning a state of
  items.
- `range` is the drawing range.
- `drawn` is the drawn elements.
- `write` is an attribute writer.

Layouts write no ARIA structure attributes. `aria-level`, `aria-setsize` and `aria-posinset` come from item data,
through attribute writers like `treeRoles`, so they have one owner.

- **`listLayout({ ..., axis })`** stacks items along the axis, block (a list) or inline (a carousel). Items can be any
  size: it measures the ones it has drawn and estimates the rest from the average of the drawn ones.
- **`gridLayout({ ..., minColumnWidth })`** arranges items in rows of as many columns as fit. With a range, it draws
  whole rows, so the grid never shifts when a row's first card would leave. Each row is a `role="row"` element. `hit`
  gives the drawn cells.
- **`masonryLayout({ ..., columns })`** places each item in the shortest column. `keyAt` gives the first item, in
  order, that reaches the offset.
- **`sectionsLayout({ ..., arrange, drawSection, emptySections })`**: grouped sections.
  - Its `items` answer mixes items and section starts, `{ section, value }`. A section start is not an item: it has no
    key, so focus and selection never see one.
  - Each section is one element holding its heading (drawn by `drawSection`) and its items, laid out by `arrange`.
  - `arrange` is the layout's own abstraction: pure arithmetic that places a run of items in a width. `listArrangement`
    and `gridArrangement` implement it.
  - There is one layout and one windowing on one scroller. No layout takes another layout.
  - `emptySections` decides whether a section with no items is drawn (a parameter, and a UX proposal).
  - A heading with `position: sticky` sticks while its section's element is drawn.

A new layout (a calendar, say) implements the same parameters and geometry. Windowing, focus and every other module
work with it unchanged.

### Windowing

**`windowing({ scroller, geometry, range, keepVisible?, margin })`** reads the scroller's position and geometry, and
writes the range:

- **On scroll.** `keyAt(scrollStart, 'start')` names the key near which to draw. `margin` (pixels) sets `ahead` and
  `behind`. Windowing writes `{ near, ahead, behind }`.
- **`keepVisible`** is a state of a key, any state. When it changes:
  - if `span(key)` is known, windowing scrolls so the key is in view, whether or not it is drawn;
  - if `span(key)` is `undefined`, windowing writes `{ near: key }`. The layout then loads and draws near that key,
    geometry reports the change, and windowing scrolls.
- **Timing contract:** windowing acts on geometry's `watch`, and the layout reports a change only after the elements are
  in the page and measured.
- It sets no styles and draws nothing.

Without windowing, **`scrollToKeep({ keepVisible, drawn })`** scrolls a drawn element into view when the state changes.

### Asking the layout new things

A module that needs to know something about the layout uses geometry:

- **`firstOnScreen({ geometry, scroller })`**: `keyAt(scroller start, 'start')`.
- **`pageSize({ geometry, scroller })`**: how many keys `hit` finds in the viewport. This is a helper the app passes as
  navigation's `pageSize`.
- **`gridNavigation({ geometry })`**: `below(k)` and `above(k)`, by `hit` on the rect just past `box(k)` across the axis,
  taking the cell whose centre is nearest.
  - It works in grouped grids and masonry alike.
  - The item below must be drawn, which windowing's `margin` ensures when it is at least one row (a stated contract).
- **`itemDropPlace({ geometry })`**: for a point, the nearest item and which half of it the point is in. This is a
  helper for reorder's `dropAt`.

None of these needs a change to any layout.

## The data modules

These are unchanged from the last draft, except for the policies the review found.

- **`listNavigation({ order, pageSize })`.** `next(k)`, `previous(k)`, `first()`, `last()`, `pageDown(k)`, `pageUp(k)`,
  where `order` is a data function. A key is required: what to do with nothing active is the app's command.
- **`treeNavigation({ tree })`**: `parent(k)`, `firstChild(k)`.
- **`typeahead({ textSearch, wait, wrap })`.**
  - `textSearch(from, text)` gives the first item at or after `from` whose text starts with `text`. With `wrap`, it
    goes round to the start (a parameter).
  - `type(character) → (from) => Promise<key | undefined>`, a function of the current active key, so focus applies it
    in order.
  - `typing`, a state saying whether a search is in progress.
- **`singleSelection({ selected? })`**: `select(k)`, and a writer for `aria-selected`, or for `aria-checked` when it is
  given `checked: true`.
- **`multipleSelection({ terms, whichSelected, checked? })`.**
  - The value is `{ terms, plus, minus, rangeStart }`.
  - `terms` is a pair of functions, `allMatching()` and `between(a, b)`, that make opaque terms.
  - `whichSelected(value, keys)` returns a state of `Map<key, boolean>`, and only it evaluates terms.
  - Functions: `setRangeStart(k)`, `toggleSelected(k)`, `extendTo(k)` (one term from `rangeStart` to `k`, with `plus`
    and `minus` emptied: a UX proposal), `addRangeTo(k)`, `selectAllMatching()`, `clear()`.
  - Its writer asks `whichSelected` only for the keys it is applied to, so what it holds is bounded by what is drawn.
  - `count(value, cap)` is capped (worldbuilding's "1,000+", a UX proposal).
- **`expansion({ open?, expandable: (item) => boolean })`.**
  - The value is `{ allOpen, except }`.
  - Functions: `isOpen(k)`, `expand(k)`, `collapse(k)`, `toggleExpanded(k)`, `expandAll()`.
  - Its writer writes `aria-expanded` only on items `expandable` accepts, so leaves never get it.
  - The app's tree data takes the state as its own parameter, and sends changes as they happen.

## Focus

**`rovingFocus` and `activeDescendant`.** Both take:

- `container` and `active` (a state of a key), so the app makes `active` first;
- `drawn`;
- `exists(k) → Promise<boolean>`;
- `whenRemoved(k) → Promise<key | undefined>`;
- `entry() → Promise<key | undefined>`: where focus goes when it comes in with nothing active.

`rovingFocus` also takes `holdFocus`, the element that keeps DOM focus while the active item isn't drawn. It is
required, so there is no built-in choice.

Both give `go(f)`:

- `f` is a function of the current active key, returning a key or a promise of one.
- Calls apply in order: each one gets the key the one before it produced. Three fast ArrowDowns therefore move three
  items, and a late typeahead answer lands before the ArrowDown pressed after it, never after.

When the active key's element leaves `drawn`, focus asks `exists(k)`:

- **True:** the item moved or scrolled away. Focus keeps the key, and `rovingFocus` moves DOM focus to `holdFocus` if
  DOM focus was on the removed element.
- **False:** focus asks `whenRemoved(k)` and goes there.

The writers:

- `rovingFocus.item` writes `tabindex` (single), 0 on the active item and -1 on the others.
- `rovingFocus.list` makes the container the tab stop while the active item isn't drawn.
- `rovingFocus` calls `focus()` on the active element when it appears in `drawn`. It does so only if DOM focus is inside
  the container, or on `holdFocus`, at that moment. It never takes focus from elsewhere (a UX proposal).
- `activeDescendant.item` writes `id` (single), the container's `id` plus the URI-encoded key. It reads the
  container's `id`, and throws when it is constructed if there is none.
- `activeDescendant.list` writes `aria-activedescendant` (single) while the active key is in `drawn`. It is applied to
  whatever element has focus: the list, or a combobox's input.

## Reorder, cell editing, overlays

### Reorder

**`reorder({ container, drawn, handle, dropAt, moveTarget, moved, ghost, autoScroll? })`.**

- `dropAt(point) → place | undefined` is the app's. It is often `itemDropPlace(geometry)`, plus a section element's
  `{ into: section }` found by `document.elementFromPoint`.
- `moveTarget(k, 'forward' | 'back') → Promise<place>` is a data function, so a move off a section's end is the data's
  answer.
- `ghost(key) → Element` draws what follows the pointer (a parameter). `autoScroll` is the scroller and a speed, or
  absent.
- A place is opaque to reorder. On drop it calls `moved(k, place, { alt, ctrl, meta, shift })`, passing the modifiers
  on (a UX proposal).
- It gives `moveForward(k)` and `moveBack(k)`, the states `dragging` and `dropPlace`, a writer for `data-drop` (tokens),
  and `styles`.

### Cell editing

**`cellEditing({ editing? })`.** The state is `{ key, draft }`. Functions: `edit(k)`, `setDraft(text)`, `commit()`,
`cancel()`.

The app's `fill` draws the editor for the item whose key is `editing.key`, and watches `editing` so the editor appears
and goes. The draft is in the state, so a windowed layout can drop the row and draw it again with the same draft. The
editor input has its own keymap.

### Overlays

- **`overlay({ element, modal?, open?, allowClose?, returnFocus })`**: `show()`, `close(reason)`, and a writer for
  `aria-expanded` (single) to apply to the opener.
  - Non-modal overlays are manual popovers. Modal ones are dialogs shown with `showModal()`, and their native `cancel`
    becomes `close('escape')` (a UX proposal).
  - `returnFocus` is a callback, such as `() => focus.go(() => k)`.
- **`anchored({ element, anchor: () => Element | undefined, placement, anchorGone })`.** `anchor` can read `drawn`.
  `anchorGone` is called when `anchor()` becomes undefined.
- **`closeOnOutsidePress({ overlay, page, inside: (target) => boolean })`** and **`closeOnFocusLeaving`**. The
  abstraction an overlay meets here is `{ open: State<boolean>, close(reason) }`.
- **`overlayStack()`**: `add(overlay, within?)` and `inside(overlay)`, where an overlay is `{ element, open, close }`.
  When an overlay closes, the stack closes those added `within` it, so nested overlays close together.

### Roles, submenus, completion

Roles are attribute writers: `listboxRoles`, `menuRoles(roleOf)`, `comboboxRoles`, `treeRoles` (`aria-level` and
`aria-setsize` from item data), `gridRoles`. `submenus`, `submenuPointer` and `inlineCompletion` are as before.

## keybinds

These changes are designed here and built in `keybinds`.

1. **A keymap is `keybinds(commands, context, { target, inputs, unless, textTakers })`.** The API stays commands-first.
2. **Conditions.** `unless` is a list of `(context, event | undefined) → boolean`. Axes and gamepad pass `undefined`.
   - `notInOpenOverlay`: the event's composed path has no `dialog[open]`, `:popover-open` or
     `[data-keybinds-modal][open]` (`modal.js:8`). With no event, it checks the whole page (`anyOverlayOpen`).
   - `notFromTextField`: today's `inInput`. It blocks every key, Ctrl+A and Ctrl+Z included.
   - Nothing is built in any more. The checks in `keys.js:239, 276`, `mouse.js:327, 348, 374`, `gamepad.js:100, 105`
     and `axes.js:249` go, and each keymap lists the conditions it wants. A dialog's own keymap lists neither, and the
     page-wide keymap lists both.
   - This is a breaking change for apps that rely on today's defaults.
3. **Releases follow their press.** The key-up, hold or release of a press goes to the keymap that took its key-down,
   whatever the conditions say at release time. Today the release is blocked separately (`keys.js:276`).
4. **No fall-through.** The first lookup that has any binding decides, as today (`core.js:215-223`). If its command
   isn't allowed, the event passes on to the keymap outside. On QWERTZ, Ctrl+Z still never runs redo (`keys.js:162-166`).
5. **Text takers, instead of `$char`.** `textTakers` is a list of `{ wants(event) → boolean, take(event) }`.
   - When one wants an event, keybinds calls its `take` and stops the event, and no ordinary binding runs. Otherwise
     only ordinary bindings may run.
   - `typedCharacter(event) → string | undefined` is defined once, in keybinds. It is one character that types:
     - with AltGr (`getModifierState('AltGraph')`, though Windows also sets Ctrl and Alt, `binding-mods.js:103-105`);
     - with Option on a Mac;
     - never with Ctrl or Meta otherwise.
   - The app writes the taker, so typeahead doesn't import keybinds. A taker for typeahead might be:

     ```js
     { wants: (e) => { const c = typedCharacter(e); return c !== undefined && (c !== ' ' || ta.typing.get()) },
       take: (e) => focus.go(ta.type(typedCharacter(e))) }
     ```

     That makes Space continuing a search, and letters going to typeahead instead of letter bindings, choices visible
     in the wiring (UX proposals).
6. **One command per binding string.**
   - Among default bindings, a duplicate is an error from `validateCommands`, so it is found in development.
   - A person's rebinding that collides is first handled by the settings panel's conflict prompt, as today. If one is
     still left, the person's binding is kept, the default's is dropped, and it is reported. The hub's page-wide keymap
     never fails as a whole (today the hub drops bindings one command at a time, `hub.js:650-660`).
7. **Async commands.** Whether a command applies is decided synchronously by `when`, so Escape with the popup closed
   passes on. A command that is allowed takes the event, as today (`core.js:357-366`).
8. **A keymap that runs a command stops the event** (today's `core.js:362-363`), so the keymaps outside it don't see it.
9. **The hub.**
   - Component keymaps take their bindings from `hub.bindingsFor(id, 'keys')` (`hub.d.ts:233`), and build themselves
     again on the hub's change event. They never hold a `BindingsStore`, because the hub makes a new one on every
     refresh (`hub.js:645-647`).
   - The settings panel and the cheatsheet list component commands because the app adds each composition's schema to
     the hub as a source marked `listen: false`. The hub's page-wide keymap then doesn't bind them, and they need no
     `execute`. This is a new hub option; today a source without `execute` throws (`hub.js:171-174`).

## Combination tests

Every test runs top to bottom as written, given `state` (the library's), `data` (the app's implementation of every
data function) and the app's own `fill`, `drawSection` and element variables. Each test then checks that no module's
parameters name another module.

### Common wiring (W)

```js
const active = state(undefined)
const range = state('all')
const drawn = state(new Map())
const focus = rovingFocus({ container, active, drawn, holdFocus: container, exists: data.exists, whenRemoved: data.neighbour, entry: data.first })
const nav = listNavigation({ order: data.order, pageSize: () => pageSize({ geometry: layout.geometry, scroller }) })
const sel = multipleSelection({ terms: data.terms, whichSelected: data.whichSelected })
const write = combine(focus.item, sel.item, listboxRoles.option)
const layout = listLayout({ container, items: data.itemsNear, range, drawn, fill, write, axis: 'block' })
const win = windowing({ scroller, geometry: layout.geometry, range, keepVisible: active, margin: 400 })
focus.list.apply(container)
```

`pageSize` refers to `layout` only inside a function that runs on PageDown, after `layout` exists.

The app's commands:

```js
const down = () => focus.go((k) => (k === undefined ? nav.first() : nav.next(k)))
const shiftDown = () => focus.go(async (k) => { const n = await nav.next(k); sel.extendTo(n); return n })
```

`down` also calls `sel.setRangeStart` in multiple mode, as a UX proposal.

### 1. Selection with grouping

W, with `sectionsLayout({ ..., arrange: listArrangement, drawSection, emptySections: true })` in place of `listLayout`.

1. ArrowDown on the last item of section A. `nav.next` answers the first item of B, and `active` is set. Windowing
   scrolls to it. If it wasn't drawn, the range moves and the layout draws it. `rovingFocus` focuses it when it appears
   in `drawn`.
2. Shift+ArrowDown runs `shiftDown`, which calls `sel.extendTo`. Its writer asks `whichSelected` for the drawn keys.
3. Headings are section elements, not items, so no module ever sees one.

Wiring check: every parameter is a state, a function, an element or a writer. **Passes.**

### 2. Reorder in a grouped, windowed list: across sections and into an empty one

```js
const re = reorder({ container, drawn, handle: (el) => el.matches('[part~=grip]'),
  dropAt: (p) => sectionAt(p) ?? itemDropPlace({ geometry: layout.geometry })(p),
  moveTarget: data.moveTarget, moved: data.move, ghost: drawGhost, autoScroll: { scroller, speed: 600 } })
```

1. Alt+ArrowDown on A's last item. `moveTarget(k, 'forward')` answers `{ precedes: B's first }`, or `{ into: B }` if B is
   empty. `moved` sends it.
2. The layout's items state changes. The key is unchanged, so focus asks nothing, and selection keeps it.
3. A pointer drag over an empty section: `sectionAt` (the app's, using `elementFromPoint`) gives `{ into: D }`.
   Windowing may drop the original row, because the ghost is reorder's own element.

**Passes.**

### 3. Typeahead over a huge server-held list

```js
const ta = typeahead({ textSearch: data.textSearch, wait: 500, wrap: true })
keybinds(listCommands, ctx, { target: container, inputs: [keys()], unless: [notFromTextField], textTakers: [typeaheadTaker] })
```

`typeaheadTaker` is the taker shown under keybinds, point 5.

1. "s": `focus.go(ta.type('s'))`. The server answers `textSearch` from an index (see the table).
2. "a" before that answer arrives: queued after it in `go`. It searches from where "s" landed, so the order of keys is
   kept.
3. `keepVisible` brings the found key into view.

**Passes**, on the typeahead index assumption.

### 4. Two listboxes in one view

W twice, with two containers, two sets of states and two keymaps. **Passes:**

- ids come from each container's `id`;
- each keymap targets its own container;
- `drawn` and geometry belong to each list's own layout.

### 5. A grid of cards, and cell editing

W, with `gridLayout({ ..., minColumnWidth: 240 })` and
`const grid = gridNavigation({ geometry: layout.geometry })`, declared after `layout`.

- ArrowDown is `focus.go((k) => grid.below(k))`.
- `cellEditing`'s draft is in a state, and `fill` draws the editor. The editor input has its own keymap, and the list's
  keymap has `notFromTextField`, so typing never reaches the list.

**Passes.**

### 6. A tree with multiple selection

```js
const open = state({ allOpen: false, except: new Set() })
const data = treeData(transport, { open })          // the app's; built after `open`
const exp = expansion({ open, expandable: (item) => item.value.hasChildren })
const tree = treeNavigation({ tree: data.tree })
```

Then W, with its `write` line as `const write = combine(focus.item, sel.item, exp.item, treeRoles.item)`.

1. ArrowRight: `focus.go(async (k) => { if (!exp.isOpen(k)) { exp.expand(k); return k } return tree.firstChild(k) })`.
   The data's `itemsNear` state then includes the children.
2. `expandAll()` is one value.

**Passes.**

### 7. A combobox with server-side suggestions, under windowing

```js
const active = state(undefined); const range = state('all'); const drawn = state(new Map())
const pop = overlay({ element: popup, returnFocus: () => input.focus() })
const focus = activeDescendant({ container: listElement, active, drawn, exists: data.suggestionExists, whenRemoved: async () => undefined, entry: async () => undefined })
const layout = listLayout({ container: listElement, items: data.suggestionsNear, range, drawn, fill, write: combine(focus.item, comboboxRoles.option), axis: 'block' })
const win = windowing({ scroller: popup, geometry: layout.geometry, range, keepVisible: active, margin: 200 })
combine(focus.list, pop.expanded, comboboxRoles.input).apply(input)
input.addEventListener('input', () => { data.setSuggestionText(input.value); pop.show() })
```

1. Typing changes the suggestions. If the active option no longer exists, `whenRemoved` makes nothing active, and the
   input's `aria-activedescendant` goes.
2. The input's keymap has Escape and Enter with `when: () => pop.open.get()`. With the popup closed, they pass on.

**Passes.**

### 8. A live list, with pushes while navigating and selecting

W, with a server pushing changes.

1. An insert above the view: the items state changes. The layout keeps the drawn keys at their screen positions, so
   nothing shifts.
2. A pushed item covered by "all matching": the `whichSelected` state turns it on.
3. The active item is deleted: its element leaves `drawn`, `exists` is false, and focus goes to `whenRemoved`.

**Passes.**

### 9. A context menu on a windowed item, with a "Move to…" combobox

```js
const menu = overlay({ element: menuEl, returnFocus: () => focus.go(() => k) })
anchored({ element: menuEl, anchor: () => drawn.get().get(k), placement: 'right-start', anchorGone: () => menu.close('anchor gone') })
```

The combobox from test 7 sits in the menu.

1. Escape in the combobox input with the popup open closes the popup. With it closed, Escape passes on to the menu's
   keymap, which closes the menu. `returnFocus` makes the item active again, and `keepVisible` brings it into view.
2. Scrolling the item away calls `anchorGone` (closing the menu is a UX proposal).

**Passes.**

### 10. The command palette in a modal dialog, with a nested menu

```js
const dlg = overlay({ element: dialog, modal: true, returnFocus: () => opener.focus() })
const more = overlay({ element: resultMenu, returnFocus: () => input.focus() })
const stack = overlayStack(); stack.add(dlg); stack.add(more, dlg)
closeOnOutsidePress({ overlay: more, page: document, inside: stack.inside(more) })
```

The results list is test 7's wiring over `memoryCommands(hub.commandSystem())`.

1. The page-wide keymap has `notInOpenOverlay`, so it stops.
2. Closing the dialog closes the menu with it, through the stack.

**Passes.**

### 11. A windowed tree with grouped sections

W with `sectionsLayout` and `listArrangement`, plus test 6's expansion and `treeRoles`.

- Sections come from the data's section starts. Tree levels come from item data, through `treeRoles`.
- No layout writes `aria-level`, so nothing collides.
- One windowing over one scroller.

Open: how the ARIA tree pattern should express sections. APG has none, and choosing one is the owner's call.
**Passes** in the wiring.

### 12. A horizontal carousel with drag to reorder

W with `listLayout({ ..., axis: 'inline' })`, and test 2's reorder with `itemDropPlace`. Geometry's `axis` makes the drop
halves left and right. Alt+ArrowLeft and Alt+ArrowRight move items (a UX proposal). **Passes.**

### 13. A module written later that asks the layout something new

`firstOnScreen({ geometry: layout.geometry, scroller })`, as above: one call to `keyAt`. Likewise "the item nearest to
the right" is `hit` on a rect beside `box(k)`, and "the item at a point" is `hit` on a point-sized rect. No layout
changes. **Passes.**

## A huge server-held list: each abstraction from an index

| Abstraction (owner) | From an array | From an index |
| --- | --- | --- |
| `order` (listNavigation) | index arithmetic | keyset seek on the order index |
| `textSearch` (typeahead) | scan | a seek when the order is by text; for any other order, Assuming an index giving a prefix's items in view order |
| `itemsNear`, returning a state (layouts) | slice | keyset reads both ways, pushed when they change |
| section starts in `itemsNear` (sectionsLayout) | computed | the relation indexes |
| `terms`, `whichSelected`, `count` (multipleSelection) | evaluate | order-key comparison per key; a count up to a cap |
| `tree`, open state (treeNavigation, expansion) | walk | parent and child indexes; changes sent as they happen |
| `exists`, `whenRemoved` (focus) | lookup | key lookup; the neighbour from the order index |
| `moveTarget` (reorder) | neighbours | section indexes |
| geometry, from the layout | measured and estimated | the same; it needs no index, because estimates come from the drawn items |

## What I couldn't fix

1. **Typeahead for any order.** I know no index that answers "the first item after k in this order starting with t" at
   a cost that doesn't grow with the matches, unless the order is by text.
2. **Geometry estimates for undrawn items** are only estimates, so a scrollbar dragged far lands near, not exactly on,
   the key. Exactness needs positions from an index that keeps counts. Without them, `span` of a far key is
   `undefined`, and windowing re-anchors there.
3. **Grid navigation needs the item below to be drawn.** Windowing's `margin` covers that when it is at least one row.
   It is a contract between two parameters, not something either module can check.
4. **Sections in an ARIA tree** have no APG pattern.
5. **The palette copies its ranked results once.**
6. **Not traced:** keybinds sequences and holds under rules 3-6, and how layouts adopt server-drawn items for
   hydration.

## Decisions for the owner

- Keys instead of the positional source model accepted earlier.
- keybinds' policies become opt-in conditions, a breaking change.
- One command per binding string, with a person's binding kept over a default's.
- The hub's `listen: false` sources.
- Selecting an entry that shows in two places: the server's `whichSelected` decides.

## UX proposals

Each item is a proposal, with the parameter that holds it where there is one.

- **Selection:** single selection follows focus. In multiple selection, plain arrow keys move `rangeStart`.
  Shift+Arrow extends, and `extendTo` empties the exceptions. Ctrl/Cmd+Arrow moves without selecting. Space toggles.
  Ctrl/Cmd+A selects all matching.
- **`aria-checked` instead of `aria-selected`** (`checked`), for menus and lists of options.
- **Focus:**
  - with nothing active, ArrowDown goes to the first item;
  - focus goes to `entry` on entering;
  - `rovingFocus` focuses the active element only while DOM focus is in the list;
  - DOM focus goes to `holdFocus` while the active item isn't drawn;
  - a removed item's focus goes to `whenRemoved`'s answer.
- **Page size:** `pageSize`, the items that fit.
- **Typeahead:** the `wait`; `wrap`; Space continuing a search in progress; letters going to typeahead instead of
  letter bindings; what counts as a typed character, including AltGr and Option.
- **Text fields keep every key** unless their own keymap binds it.
- **Overlays:**
  - Escape and Enter pass on when the popup is closed;
  - the combobox popup shows on every input;
  - Escape on a modal goes through the dialog's native `cancel`;
  - `returnFocus` targets;
  - a press outside, or focus leaving, closes an overlay;
  - nested overlays close with their parent;
  - an anchored overlay closes when its anchor is scrolled away.
- **Reorder:** Alt+Arrow moves an item, by the axis; a move at a section's end goes to the next section's start;
  dragging only from a grip; the `ghost` drawing; `autoScroll`; drop halves by the axis; `{ into }` for sections; the
  modifiers passed to `moved`.
- **Sections:** sticky headings; `emptySections` drawn, and droppable.
- **Grid:** drawing whole rows.
- **Selection count:** capped at 1,000, shown as "1,000+".
- **Rows** whose selected state isn't known yet show as not selected.
- **keybinds:** the `textTakers` split; a keymap stopping the event when it runs a command; a person's rebinding beating
  a default's.

## Names (proposals)

The clashing and unclear names of the last draft are replaced:

| Old | New |
| --- | --- |
| Question | data function |
| Live | returns a state |
| Decoration | attribute writer |
| `takes` | `wants`, `take` |
| `follow` | `keepVisible` |
| `around` | `itemsNear` |
| `describe` | `terms` (`allMatching`, `between`) |
| `membership` | `whichSelected` |
| `insideNoOpenOverlay` | `notInOpenOverlay` |
| `anchor` (selection) | `rangeStart` |
| `target` (reorder) | `dropAt`, `dropPlace` |
| `before` / `after` (drop places) | `precedes`, `follows` |
| `start` (focus) | `entry` |
| `start` (cell editing) | `edit` |
| `all` | `allOpen`, `allMatching` |
| `added` / `removed` | `plus`, `minus` |
| `parent` (overlay stack) | `within` |
| Element handle | gone |
| `bind` | unused, dropped |

The full list:

- **Concepts:** key, item, state, attribute writer, geometry, drawing range, drawn elements, keymap.
- **Modules:** `listLayout`, `gridLayout`, `masonryLayout`, `sectionsLayout`, `listArrangement`, `gridArrangement`,
  `windowing`, `scrollToKeep`, `firstOnScreen`, `pageSize`, `gridNavigation`, `itemDropPlace`, `listNavigation`,
  `treeNavigation`, `typeahead`, `singleSelection`, `multipleSelection`, `expansion`, `rovingFocus`,
  `activeDescendant`, `reorder`, `cellEditing`, `overlay`, `anchored`, `closeOnOutsidePress`, `closeOnFocusLeaving`,
  `overlayStack`, `listboxRoles`, `menuRoles`, `comboboxRoles`, `treeRoles`, `gridRoles`, `submenus`,
  `submenuPointer`, `inlineCompletion`, `combine`, `state`.
- **Geometry:** `axis` (`'block'`, `'inline'`), `span`, `keyAt` (`'start'`, `'end'`), `box`, `hit`, `watch`.
- **Drawing range:** `'all'`, `near`, `ahead`, `behind`.
- **Layout parameters:** `container`, `items`, `range`, `drawn`, `fill`, `write`, `axis`, `minColumnWidth`, `columns`,
  `arrange`, `drawSection`, `emptySections`, `section`, `'start'`.
- **Windowing:** `scroller`, `geometry`, `keepVisible`, `margin`.
- **Focus:** `active`, `exists`, `whenRemoved`, `entry`, `holdFocus`, `go`, `item`, `list`.
- **Navigation:** `order`, `pageSize`, `next`, `previous`, `first`, `last`, `pageDown`, `pageUp`, `tree`, `parent`,
  `firstChild`, `below`, `above`.
- **Typeahead:** `textSearch`, `wait`, `wrap`, `type`, `typing`.
- **Selection:** `selected`, `select`, `checked`, `terms`, `allMatching`, `between`, `whichSelected`, `plus`, `minus`,
  `rangeStart`, `setRangeStart`, `toggleSelected`, `extendTo`, `addRangeTo`, `selectAllMatching`, `clear`, `count`.
- **Expansion:** `open`, `allOpen`, `except`, `expandable`, `isOpen`, `expand`, `collapse`, `toggleExpanded`, `expandAll`.
- **Reorder:** `handle`, `dropAt`, `moveTarget`, `'forward'`, `'back'`, `moved`, `ghost`, `autoScroll`, `speed`,
  `moveForward`, `moveBack`, `dragging`, `dropPlace`, `data-drop`, `precedes`, `follows`, `into`, `under`, `styles`.
- **Cell editing:** `editing`, `draft`, `edit`, `setDraft`, `commit`, `cancel`.
- **Overlays:** `element`, `modal`, `open`, `allowClose`, `returnFocus`, `show`, `close`, `expanded`, `anchor`,
  `placement`, `anchorGone`, `page`, `inside`, `add`, `within`.
- **Attribute writers:** `attributes`, `'single'`, `'tokens'`, `apply`, `roleOf`.
- **keybinds additions:** `unless`, `notInOpenOverlay`, `notFromTextField`, `textTakers`, `wants`, `take`,
  `typedCharacter`, `listen: false`.
- **The tests' own app names:** `data`, `fill`, `drawSection`, `drawGhost`, `sectionAt`, `down`, `shiftDown`,
  `listCommands`, `typeaheadTaker`, `memoryCommands`, `treeData`, `transport`, `suggestionsNear`, `setSuggestionText`, `suggestionExists`,
  `neighbour`.
- **Element names:** `<interact-listbox>`, `<interact-menu>`, `<interact-combobox>`, `<interact-palette>`,
  `<interact-tree>`, with the prefix the app's.
