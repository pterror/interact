# Design

Status: a proposal for the rebuild, in its third draft after two reviews. No code exists for it. It is the owner's to
approve before anything is built. Every name in it is a proposal ("Names"), and so is every behaviour a person would
notice ("UX proposals").

## The design in one paragraph

There is no library core. The library is independent modules, and each module owns the abstractions it needs: it
states them as its own parameters, and the app passes in anything that implements them. The library supports every
case, a huge list held by a server included, because no module makes any case impossible. The hard cases live in the
implementations, not in the modules.

Navigation owns the question "the key after k". Typeahead owns "the first item at or after k whose text starts with
t". A view owns "the items around k". An array answers these by scanning. A server answers them from its indexes. No
module knows which kind it got. Batching, prefetching and stale answers are the implementation's business, and the
library doesn't design them.

Rules such as "one action is one request" and "the page holds only what it shows" are SillyTavern's own, not
requirements of this library. An app that has them keeps them in its implementations, and no module stands in their
way.

The app wires the modules by hand. Writing a module, or wiring one, never needs knowledge of any other module.

## The tests the design has to pass

1. Each module works alone and owns the abstractions it needs.
2. The app combines the modules by hand. There is no registry and no central mechanism.
3. Leaving a module out, replacing it, or adding one changes no other module's code or parameters.
4. Constructing a module, binding its operations to keys, and giving its output to a view never needs to know which
   other modules exist.
5. Every case stays possible, a huge list held by a server included. Each abstraction can be implemented from an
   index, and no module changes when it is.

## What fails in the current code

The previous drafts gave the full evidence. In short:

- **Every feature reads one list by position** (`packages/core/src/list-pipeline.js:448-461, 357-370`). So selection
  throws under grouping (`list-selection.js:185-190`), and grouping's headings count in positions
  (`grouped-sections.js:395, 532-536`).
- **One queue and one input chain with guessed priorities** (`store.js:157-194`, `state.js:7-10`, `typeahead.js:139`,
  `reorder.js:119`, `navigation.js:61`).
- **One rendering fixes the shape of the DOM** (`list-pipeline.js:412-440`, `windowing.js:35, 304`,
  `grouped-sections.js:295`), and every component carries windowing's CSS (`listbox-styles.js:97`).
- **Closed sets** for combobox kinds (`combobox.js:64-69`), menu entry kinds (`menu-entry.js:14-18`) and dismissal
  reasons (`layer.js:7`).
- **keybinds has built-in policies:**
  - It ignores every input inside any open popover or dialog: keys (`modal.js:8, 41-43`, `keys.js:239, 276`), mouse
    (`mouse.js:327, 348, 374`), gamepad (`gamepad.js:100, 105`) and axes (`axes.js:249`).
  - It blocks commands in text fields unless they set `captureInput` (`input.js:131-141`, `core.js:342-347`).
  - It looks only at the first lookup that has any binding, and doesn't fall through when none is allowed
    (`core.js:215-223, 406-410`; sequences resolve the same way, `core.js:254`).
  - Any command that doesn't return `false` takes the event, including an async one (`core.js:357-366`,
    `command.js:26`).
  - The hub makes one window-wide listener for every command on the page (`hub.js:1-4, 681`).

## Concepts

Seven concepts. Each is one abstraction that more than one module, or the view and the modules, have to agree on.

1. **Key.** A string naming one item, compared with `===`. An item is `{ key, value }`. The data chooses keys that last
   as long as the item does, including through every move the data supports. For worldbuilding's "an entry in several
   groups", that means a membership's own id, not one made from the group and the entry. A key that encodes the group
   would change when the item moves, and focus and selection would lose it.
2. **State.** `get()`, `set(value)`, `watch(listener) → stop`. A module keeps each piece of its state in one. The app
   may pass one in, and then the app's is the only copy.
3. **Question.** A data abstraction a module owns, stated in its own file as a JSDoc type. The app passes an
   implementation. A question comes in one of two forms:
   - **one-shot**: a function returning a promise;
   - **live**: a function returning `{ answer: State, close() }`, whose answer the implementation replaces whenever it
     changes.

   An implementation must settle every promise. What else it does (batching, prefetching, answering more than it was
   asked) is its own business. A module applies its own latest request and ignores the answers to its earlier ones.
   That is part of the module's own meaning ("the latest `go` wins"), not a staleness mechanism. A missing question is
   an error when the module is constructed.
4. **Element handle.** What a view gives for a drawn item: `elementOf(key) → { element, gone(listener) } | undefined`.
   It never makes the view draw anything. `gone` reports that the element was removed.
5. **Decoration.** What a module gives a view for each drawn item, and for the container:
   - `writes`, the attributes it sets;
   - `apply(element, item) → cleanup`;
   - `watch(listener(keys | 'all')) → stop`, so the view knows when to apply it again.

   Attributes that hold a list of tokens (`class`, `part`, `aria-describedby`, `aria-labelledby`, `aria-controls`)
   take the union of every decoration's tokens. Any other attribute has one owner, the module whose state it states.
   The view checks `writes` when it is constructed, so two owners of one attribute is an error while wiring, never
   while running.
6. **Condition** (keybinds). `(context, event) → boolean`. A binding's `when` is one. A keymap's `unless` is a list of
   them. `event` is new: today `when` gets only the context (`command.js:25`).
7. **Drop target.** An opaque value that the app's implementation produces and consumes, such as `{ before: key }`,
   `{ into: group }` or `{ childOf: key }`. Reorder only carries it.

These are ordinary JavaScript, not concepts:

- a module's operations (its functions);
- its `styles` (a stylesheet the app adopts);
- a keymap (one existing `keybinds()` call on an element);
- a composition (a file of wiring).

The reviewer's eighth, the loader, is gone: each module asks its own questions.

## Rules every module follows

- A module is a function, `name(parameters) → { states, operations, decorations?, styles? }`. Its parameters are
  questions, states, element handles, elements and callbacks. None is another module.
- It never sets attributes except through its decorations, which a view applies.
- It touches only DOM it was given or owns: calling `focus()`, scrolling, measuring, listening, and opening and closing
  popovers and dialogs.
- Every async input applies latest-wins, within the module only.
- A failing operation fails alone.

## Views own their DOM

A view is a module that draws the items of its questions into a container it was given. It owns its layout, including
any windowing. That is the fix for the rejected render range: no other module and no template takes a windowing shape.
Each view implements element handles and applies the decorations it is given.

**`listView({ container, items: Question<all items>, draw, decorations })`** draws every item, for lists that fit in
memory. It holds what it draws, which is everything.

**`windowedList({ container, scroller, around, draw, decorations, follow?: State<key> })`.** `around` is the live
question `(key | 'first', before, after) → items`.

- It keeps an anchor: a key, and that key's offset in the viewport.
- It draws a run of items in one contiguous block. Elements it doesn't draw don't exist, so nothing is held hidden.
- It measures only items drawn in place.
- As the block's ends near the viewport, it asks `around` again with the new anchor. Scroll anchoring by key keeps the
  view still when items arrive.
- Loading as the list scrolls is this behaviour; it is not a module of its own.
- When `follow` changes to a key it hasn't drawn, it re-anchors there. Focus doesn't ask it to do this: the app passes
  focus's `active` state as `follow`, and the view depends only on "a state of a key".
- Before it removes an element that holds DOM focus, it moves focus to its scroller (a UX proposal).
- Changes need no vocabulary. The implementation replaces the answer, and the view reconciles it by key. Inserts,
  moves, removals and new tree children all just appear in the next answer.

**`windowedGrid({ ...same, minColumnWidth })`** lays items out in rows of as many columns as fit. It draws and drops
whole rows, so a responsive grid never shifts. Each row is a `role="row"` element, so ARIA grids can be built. It
implements `below(k)` and `above(k)` (see Navigation) from its own layout and its `around` question.

**`groupedView({ container, scroller, groups, groupOf, members, drawGroup, groupDecorations, follow })`** draws groups
as its windowed items:

- Each group element holds its heading and a member view. Which member view is the app's choice: a `listView`, a
  `windowedList` nested against the same scroller, or a `windowedGrid`.
- An empty group is a group drawn with an empty member view, so it is visible and can be dropped on.
- Headings are part of their group's element. `position: sticky` on a heading works, because the group element holds
  every drawn member.
- To follow a key, it asks `groupOf(k)`, follows that group, and passes the key to that group's member view.
  `groupOf` and `members` are both questions the groupedView owns, so they can't disagree: the members of `groupOf(k)`
  contain k by definition.
- It writes `aria-setsize`, `aria-posinset` and `aria-level` where the items carry them. Only a view writes structure
  attributes, so they never collide.

Shared windowing arithmetic (anchor, measurement, margins) is one internal helper that the windowed views import. It is
not part of the public API. A page without a windowed view doesn't load it.

## The modules

### Focus: `activeDescendant`, `rovingFocus`

Both take:

- `{ container, elements: element handles }`;
- `replacement: (goneKey) => Promise<key | undefined>`, which is required, so there is no built-in policy for an item
  that vanished;
- `start: () => Promise<key | undefined>`, where focus goes when it comes into the list with nothing active.

Both give `active` (a state), `go(key | Promise<key>)` with latest-wins, and decorations.

- **`activeDescendant`**:
  - Its item decoration writes `id`: the container's `id` plus the URI-encoded key. It reads the container's `id` and
    throws at construction if there is none.
  - Its container decoration writes `aria-activedescendant` while `elementOf(active)` exists. When the element appears
    (the decoration is applied), the attribute does too.
- **`rovingFocus`**:
  - It writes `tabindex` 0 on the active item and -1 on the others.
  - Its container decoration makes the container the tab stop while the active item isn't drawn.
  - When the active item's element is applied while the active item has just changed, it calls `focus()` on it.

On `gone`, both keep `active` if the key still exists (it was only scrolled away). They call `replacement` when the
implementation says the item was removed (Assuming: a removal arrives through the same view answer; the view tells its
handles `gone` with `removed: true`).

### Navigation: `listNavigation`, `treeNavigation`, `gridNavigation`

- **`listNavigation({ order })`.** `order` is a question with `next(k)`, `previous(k)`, `first()`, `last()` and
  `step(k, n)`. `next(undefined)` is `first()`, and `previous(undefined)` is `last()` (a UX proposal). The operations
  return keys, and the module adds page size (a UX proposal) and suggested bindings.
- **`treeNavigation({ tree })`** asks `parent(k)` and `firstChild(k)`.
- **`gridNavigation({ grid })`** asks `below(k)` and `above(k)`. `windowedGrid` implements these, so a grouped grid's
  rows come from the view that laid them out, not from counting.

None of them moves focus or selects. The app's operations decide what a returned key means:

```js
const down = async () => { const k = await nav.next(focus.active.get()); focus.go(k); sel.setAnchor(k) }
const shiftDown = async () => { const k = await nav.next(focus.active.get()); focus.go(k); sel.extendTo(k) }
```

### Typeahead: `typeahead`

**`typeahead({ textSearch, wait })`.** `textSearch` is the question `firstFrom(k, t)`: the first item at or after `k`
whose text starts with `t`, wrapping round (a UX proposal). The module keeps the text typed so far and the timing, and
gives:

- `type(character, from) → Promise<key>`, latest-wins;
- `takes(event)`: a text taker for keybinds (see "keybinds"). It takes a single typed character, and takes Space only
  while typing is going on.

### Selection: `singleSelection`, `multipleSelection`

- **`singleSelection({ selected?: State<key> })`** holds one key. It gives `select(k)` and a decoration (`aria-selected`,
  or `aria-checked` if constructed so). It has no ranges, so it can't be in a multiple state.
- **`multipleSelection({ describe, membership, attribute? })`.**
  - `describe` is a synchronous question: `all()` and `range(a, b)`, each returning an opaque description. The
    implementation stamps it with the current view.
  - `membership` is a live question: `(selection, keys) → Map<key, boolean>`. Only the implementation evaluates
    descriptions.
  - The value is `{ ranges: description[], added: Set, removed: Set, anchor? }`, a state.
  - Operations:
    - `setAnchor(k)`;
    - `toggleSelected(k)`;
    - `extendTo(k)`: replaces the whole value with one range from the anchor to k, and empties `added` and `removed`;
    - `addRangeTo(k)`;
    - `selectAllMatching()`;
    - `clear()`.
  - Its decoration asks `membership` for each item key as the decoration is applied, and closes that interest in the
    cleanup. What it asks is bounded by what is drawn, so the cache is too.
  - A key in `added` or `removed` is known without asking. For the rest, `membership` is a live question, so its first
    answer can already be known when the decoration is applied. An implementation that sends membership with its items
    makes rows appear selected from the start; how it does that is its own business. When a flag isn't known yet, the
    decoration writes nothing until it is (a UX proposal).
  - `count(selection)` is a one-shot question, capped (worldbuilding's "1,000+").

Each fact has one source. `added` and `removed` are the page's. Coverage by descriptions is the server's.

### Expansion: `expansion`

**`expansion({ expanded?: State })`.** The value is `{ all: boolean, except: Set<key> }`, so "expand all" is one value.
It gives `expand(k)`, `collapse(k)`, `toggleExpanded(k)`, `expandAll()`, and a decoration (`aria-expanded`).

The app's tree implementation takes this state as its own parameter. It sends each change as an action ("open k") and
never re-sends the whole set. The children come back in the view's live `around` answer.

### Reorder: `reorder`

**`reorder({ container, elements, handle, targetAt, moveTarget, moved, scroller })`.**

- `targetAt(point) → { target, key?, side? }` is implemented by the view, which knows its layout. Over a group's empty
  member view, `groupedView` gives `{ into: group }`.
- `moveTarget(k, direction) → Promise<target>` is a question. The server answers it from its group indexes, including
  "the start of the next group, empty or not", so there is no counting at group edges.
- During a drag, the dragged item is a copy that reorder owns, in the top layer. The view may drop the original freely.
- It gives `moveUp`, `moveDown`, `dragging` and `target` (states), a decoration for the drop indicator (`writes:
  ['data-drop']`), and `styles`.
- It auto-scrolls the scroller near its edges (a UX proposal).
- On drop, it calls `moved(key, target, { alt, ctrl, meta, shift })`.

### Cell editing: `cellEditing`

**`cellEditing({ editing?: State<{ key, draft }>, commit })`.** The draft lives in its state, not in the DOM, so a
windowed view can drop the edited row and draw it again with the draft. It gives `start(k)`, `setDraft(text)`,
`commit()` and `cancel()`. The editor input's keymap is its own (see keybinds).

### Overlays

- **`overlay({ element, modal?, open?, allowClose?, returnFocus })`.**
  - It gives `show()` and `close(reason)`.
  - Non-modal overlays are popovers in manual mode. Modal ones are `<dialog>` elements shown with `showModal()`, and the
    module listens for the dialog's own `cancel` and `close` events so a native close goes through its state.
  - `returnFocus` is required. Helpers: `returnTo(element handle)`, `returnToPrevious()`. A reason is any value.
- **`anchored({ element, anchor: element handle, placement, anchorGone })`.** `anchorGone` is required. The app might
  pass `() => menu.close('anchor gone')` (a UX proposal).
- **`closeOnOutsidePress({ overlay, page, inside })`** and **`closeOnFocusLeaving({ overlay, page, inside })`** listen on
  the `page` they were given.
- **`overlayStack()`** gives `add(overlay, parent?)` and `inside(overlay)`, which implements `inside`.

### Roles, submenus, completion

- **Roles** (`listboxRoles`, `menuRoles`, `comboboxRoles`, `treeRoles`, `gridRoles`) are decorations that write `role`
  and the pattern's static ARIA. A menu item's role comes from the app's `roleOf(item)`.
- **`submenus({ hasSubmenu, openSubmenu, closeSubmenu })`** and **`submenuPointer`**, as before.
- **`inlineCompletion({ input, textOf })`**, as before.

### Compositions

`<interact-listbox>`, `<interact-menu>`, `<interact-combobox>`, `<interact-palette>` and `<interact-tree>` are files of
wiring over public modules, so they can be taken apart and their parts replaced. The settled DOM, registration and
styling decisions of the earlier document apply to them.

## keybinds

These changes are designed here and built in `keybinds`.

1. **Keymaps.** One `keybinds(commands, context, { target, inputs, unless, takesText })` per element that takes focus.
   The API stays commands-first. A module exports a keybinds `Schema` of suggested defaults (ids, labels, keys), and the
   app writes the commands:

   ```js
   keybinds([{ id: 'list.next', label: 'Next item', keys: ['ArrowDown'], execute: () => void down() }], ctx, { target: container, inputs: [keys(chars())] })
   ```

   A keymap that runs a command stops the event, so the keymaps around it never see it.
2. **Policies become conditions.**
   - The overlay check becomes the conditions `insideNoOpenOverlay(context, event)` for key and mouse events and
     `noOverlayOpen()` for gamepad and axes. A keymap lists them in `unless`. Nothing is built in.
   - A dialog's own keymap doesn't list them. It is inside the overlay, and the page-wide keymap outside it does list
     them, so page keys stop while the dialog is open.
   - The overlays' own `keydown` listeners (`submenus.js:430-471`, `combobox-field.js:95-101`, `menu-view.js:77`) go.
   - This is a breaking change for apps that rely on today's defaults.
3. **Text fields.** The condition `notFromTextField` (today's `inInput`) goes in the `unless` of every keymap that isn't
   on a text field itself. It blocks every key from a text field, Ctrl+A and Ctrl+Z included, as `core.js:346` does
   today.
   - An input that wants keys (a combobox, a cell editor) has its own keymap on the input. That keymap has no such
     condition, and binds only what it means to: Up, Down, Enter, Escape.
   - A command meant to run even in text fields lives in a keymap without the condition. `captureInput` goes.
   - The cell editor's typing never reaches the list's keymap, so it never reaches typeahead.
4. **Text takers.** `takesText: [taker]`, where a taker is `(event) → boolean`.
   - When a taker takes an event, only `$char` bindings may run. When none does, only the others may.
   - Space therefore goes to typeahead while typing is going on, and to selection otherwise, by construction.
5. **`$char`.** A `KeySyntax` (`chars()`), built like `symbols()` (`keys-symbols.js:39-50`, through the hook at
   `keys.js:24-32, 166`).
   - It matches when `event.key` is one character and neither Ctrl nor Meta is held, except with AltGraph
     (`getModifierState('AltGraph')`).
   - Option on a Mac and AltGr count as typing. Alt alone on other systems doesn't (a UX proposal).
6. **One binding per lookup, and no hidden order.**
   - A keymap refuses, when it is made, two commands bound to the same binding string. The conflict is then found while
     wiring, not after the fact.
   - An event's lookups keep today's specificity order, which comes from the event, never from the order the commands
     were given in: the typed key, then the physical key, then the layout letter, then syntax lookups
     (`keys.js:162-167`), then `anyModifiers`.
   - The first lookup whose one command is allowed runs. A lookup whose command's `when` is false falls through to the
     next. That fixes a specific binding hiding a general one.
   - On AZERTY, Ctrl+Z still runs undo, because the typed key comes before the physical one, exactly as now.
   - Sequences resolve through the same function (`core.js:254`). Assuming that is enough for them: I didn't trace
     sequences, holds or releases.
7. **Async commands.** Whether a command applies is decided synchronously by `when`. `execute` may be async, and taking
   the event depends only on `when` being true. So Escape with the popup closed has `when: () => pop.open.get()`, is
   false, and passes on to the keymap outside.
8. **The hub.** `CommandHub` keeps the page-wide keymap and the `BindingsStore`. Component keymaps take the same store,
   so rebinding a component's command works. The settings panel and the cheatsheet list component commands because the
   app adds each composition's schema to the hub as a source (`hub.d.ts` `Source`), the way it adds any other source of
   commands. There is no registry.

## A huge list held by a server: every question from an index

Each module's question, implemented two ways. No module changes between the two.

| Question (owner) | Array implementation | Index implementation |
| --- | --- | --- |
| `order.next/previous/step` (listNavigation) | index arithmetic | keyset seek on the view's order index |
| `firstFrom(k, t)` (typeahead) | scan from k | a seek when the order is by text. For any other order, Assuming an index that gives a text prefix's items in view order. I don't know one whose cost doesn't grow with the matches. |
| `around(k, before, after)` live (windowed views) | slice | keyset reads both ways from k; the server pushes a new answer when the window changes |
| `groupOf(k)`, `members(g)`, `groups.around` (groupedView) | maps | relation indexes, as in worldbuilding's design |
| `describe.all/range` (multipleSelection) | values | values, stamped with the view |
| `membership` live (multipleSelection) | evaluate | per key asked: comparing order keys for a range, a filter test for "all" |
| `count` (multipleSelection) | count | a count up to a cap |
| `below/above` (gridNavigation) | the grid view's layout, plus `around` | the same |
| `parent/firstChild` (treeNavigation) | tree walk | parent and child indexes |
| `moveTarget` (reorder) | neighbours | group indexes |

Batching, prefetching and stale answers are left to implementations. The one rule they must keep is to settle every
promise. A push from the server replaces a live answer and cancels nothing.

## Combination tests

Each test lists the wiring, then what happens, then checks that no module's parameters name another module.

### 1. Selection with grouping

```js
const data = worldServer(transport, view)            // implements every question below
const v = groupedView({ container, scroller, groups: data.groups, groupOf: data.groupOf,
  members: (g) => windowedList({ around: data.membersAround(g), draw: drawCard }), drawGroup, follow: focus.active })
const focus = rovingFocus({ container, elements: v, replacement: data.neighbour, start: () => nav.first() })
const nav = listNavigation({ order: data.order })
const sel = multipleSelection({ describe: data.describe, membership: data.membership })
// The view applies decorations from focus, sel and listboxRoles.
```

1. ArrowDown on the last item of group A runs `down`. `nav.next(kA)` answers `kB`.
2. `focus.go(kB)`. The view follows `kB`: it asks `groupOf(kB)`, and B's member view draws `kB`. `rovingFocus` focuses
   it when its decoration is applied.
3. Shift+ArrowDown runs `shiftDown`, so `sel.extendTo(k)`. The description is made synchronously, and `membership`
   answers for the drawn keys.

No module sees a heading or a position. Wiring check: every parameter is a question, a state or an element handle.
**Passes.**

### 2. Reorder in a grouped, windowed list: across groups, into an empty group

```js
const re = reorder({ container, elements: v, handle: isGrip, targetAt: v.targetAt, moveTarget: data.moveTarget, moved: data.move, scroller })
```

1. Alt+ArrowDown on the last item of A. `moveTarget(k, 'down')` answers `{ before: firstOfB }`, or `{ into: B }` if B is
   empty. `moved` sends the move.
2. The live answers of A's and B's member views change, and the views reconcile by key. The item's key is a membership
   id, so it survives, and focus and selection keep it.
3. A pointer drag. Reorder floats its copy, the view scrolls and drops rows freely, and `v.targetAt` gives `{ into: D }`
   over D's empty member view.

**Passes.**

### 3. Typeahead over ten billion items held by a server

```js
const ta = typeahead({ textSearch: data.textSearch, wait: 500 })
// List keymap: takesText: [ta.takes]; $char runs: focus.go(ta.type(event.key, focus.active.get()))
```

1. "s": `firstFrom(active, 's')`, which a server answers from its index.
2. "a" before the answer arrives: `ta` asks again, and its own latest-wins ignores the first answer. An ArrowDown
   meanwhile calls `focus.go`, and focus's own latest-wins ignores typeahead's older promise. A late answer can't move
   focus back.
3. The view follows the found key with `around`. Whether the server answered that ahead of time is its own business.

**Passes**, on the index assumption in the table.

### 4. Two listboxes in one view

Two of everything, on two containers. Ids come from each container's own `id`. Keymaps sit on each container. Each
view's handles and `targetAt` see only its own elements. **Passes.**

### 5. A feature nobody planned: a grid of cards, and cell editing

```js
const v = windowedGrid({ container, scroller, around: data.around, minColumnWidth, follow: focus.active })
const grid = gridNavigation({ grid: v })
```

- ArrowDown is `focus.go(grid.below(k))`. Focus, selection, typeahead and reorder are unchanged.
- `cellEditing` keeps its draft in a state, and the editor input has its own keymap. The list keymap's
  `notFromTextField` keeps list keys and typeahead out of the editor.

**Passes.**

### 6. A tree with multiple selection

```js
const exp = expansion()
const data = treeServer(transport, { expanded: exp.expanded })
const v = windowedList({ around: data.around, ... })   // the server answers in visible-tree order
const tree = treeNavigation({ tree: data.tree })
```

1. ArrowRight on a closed node calls `exp.expand(k)`. The implementation sends "open k". The live `around` answer now
   includes the children, and they appear.
2. "Expand all" is `exp.expandAll()`, one value.
3. Shift+ArrowDown and `multipleSelection` work over visible keys, and `treeRoles` and the view write `aria-level`.

**Passes.**

### 7. A combobox with server-side suggestions, under windowing

```js
const pop = overlay({ element: popup, returnFocus: returnToPrevious() })
const v = windowedList({ container: optionsElement, scroller: popup, around: data.suggestions.around, follow: focus.active })
const focus = activeDescendant({ container: input, elements: v, replacement: () => Promise.resolve(undefined), start: ... })
input.addEventListener('input', () => { data.suggestions.setText(input.value); pop.show() })
// Input keymap: ArrowDown / ArrowUp / Enter (when open) / Escape (when open: pop.close('escape'))
```

1. Typing replaces the live answer, and the view reconciles. The active option, if it is gone, gets `replacement`, and
   `aria-activedescendant` disappears with its element.
2. Escape and Enter with the popup closed: `when` is false, so they pass on to the keymap outside.

**Passes.**

### 8. A live list, with pushes while navigating and selecting

1. The server pushes an insert above the viewport. The live `around` answer changes, and scroll anchoring by key keeps
   what is shown still: no layout shift.
2. Focus holds a key, so it stays put. `nav.next` asks with the current data.
3. A pushed insert that the selection's "all matching" covers: the live `membership` answer turns it on.
4. The focused item is deleted: `gone` with `removed`, then `replacement(k)`, the app's choice of where focus goes.
5. Nothing in flight is cancelled by a push.

**Passes.**

### 9. A context menu on a windowed item, with a "Move to…" combobox

```js
const menu = overlay({ element: menuEl, returnFocus: returnTo(v.elementOf(k)) })
anchored({ element: menuEl, anchor: v.elementOf(k), anchorGone: () => menu.close('anchor gone') })
// The menu keymap is on menuEl. "Move to…" opens test 7's combobox inside the menu.
```

1. If the list scrolls the item away, the handle reports `gone` and the app's `anchorGone` closes the menu.
2. Escape in the combobox input with suggestions open closes the suggestions. With them closed, it passes on to the menu
   keymap, which closes the menu. Focus returns to the item, or to the list container if the item isn't drawn (a UX
   proposal).
3. Choosing a target calls `data.move`.

**Passes.**

### 10. The command palette in a modal dialog, with a nested menu

```js
const dlg = overlay({ element: dialog, modal: true, returnFocus: returnToPrevious() })
const search = memoryCommands(hub.commandSystem())     // implements around(k) over searchCommands' ranked results
const more = overlay({ element: resultMenu, returnFocus: returnToPrevious() })
const stack = overlayStack(); stack.add(dlg); stack.add(more, dlg)
closeOnOutsidePress({ overlay: more, page: document, inside: stack.inside(more) })
```

1. The page-wide keymap has `insideNoOpenOverlay`, so page shortcuts stop. The dialog's input keymap runs.
2. Escape in the nested menu closes the menu. Escape in the input reaches the dialog's native `cancel`, which the
   overlay turns into `close('escape')`.
3. A press inside the dialog but outside the menu closes only the menu.

**Passes.**

## What I couldn't fix

1. **Typeahead at ten billion for any order.** I know no index that answers "the first item after k in this order whose
   text starts with t" for an arbitrary order at a cost that doesn't grow with the matches. When the order is by text,
   it is a seek. The design doesn't change either way; whether the engine can do it, I don't know.
2. **Positions.** `aria-posinset`, `aria-setsize` and a proportional scrollbar need the server to know positions, which
   needs an order index that keeps counts. Without one, the view leaves them out, or writes `aria-setsize="-1"` (a UX
   proposal).
3. **The palette copies once.** In-memory search produces one ranked array.
4. **The one exact-over-`anyModifiers` tie-break** stays, as a lookup-specificity rule, not registration order.
5. **Not traced:** keybinds sequences, holds, releases and gamepad under the new rules. Hydration of the views'
   own DOM. Assuming: a view can adopt server-drawn items by their key attribute.
6. **Focus moving to the scroller** when a focused element scrolls away is a UX proposal, not a guarantee from any
   abstraction. Without it, a windowed list with roving focus would lose focus.

## Decisions for the owner

- Keys instead of positions, which replaces the accepted positional source model.
- keybinds' overlay and text-field policies become opt-in conditions, which breaks apps that rely on the old defaults.
- One binding per binding string per keymap.
- Selecting an entry shown in two places: the server's membership decides.
- Whether a selection survives a change of view.
- What `replacement` does by default in the compositions.

## UX proposals

- Selection follows focus in single mode; the anchor moves with plain arrow keys in multiple mode.
- Shift+Arrow extends; Ctrl/Cmd+Arrow moves without selecting; Space toggles; Ctrl/Cmd+A selects all matching.
- `next` with nothing active goes to the first item; `previous` to the last.
- Page size: as many items as fit in the viewport.
- Typeahead: what counts as a character (`$char`, including AltGr and Option, excluding Alt elsewhere); Space continues
  a search in progress; the `wait`; wrapping round at the end.
- The keys a text field keeps: all of them, unless its own keymap binds them.
- Escape closes an overlay, in the keymap that has focus. Escape and Enter pass on when the popup is closed.
- The combobox popup shows on every input event.
- Focus returns to the element focused before, or to a given item.
- A press outside, or focus leaving, closes an overlay.
- An overlay closes when its anchor is scrolled away.
- Alt+ArrowUp and Alt+ArrowDown move an item; at a group's end, into the next group's start.
- Dragging only from a grip; auto-scroll near the edges; a floating copy while dragging.
- Drop halves before and after; a tree item's middle means "child of".
- A focused element scrolled out of a windowed view gives focus to its scroller.
- A membership flag that isn't known yet shows as not selected.
- A conflicting binding is refused when the keymap is made.
- `aria-setsize="-1"` when the total isn't known.

## Names (proposals)

These replace the clashing names of the last draft:

- Module functions are **operations**, not commands, since commands are keybinds'.
- An element's `keybinds()` is a **keymap**, not a scope, since `@scope` is CSS.
- "Rows" is gone.
- `toggle` is now `toggleSelected` and `toggleExpanded`.
- An **item** is `{ key, value }`. "Entry" and "place" are gone.

The full list:

- **Concepts:** key, item, state, question (one-shot, live), element handle, decoration, condition, drop target,
  operation, keymap, text taker, composition.
- **Views:** `listView`, `windowedList`, `windowedGrid`, `groupedView`.
- **Modules:** `activeDescendant`, `rovingFocus`, `listNavigation`, `treeNavigation`, `gridNavigation`, `typeahead`,
  `singleSelection`, `multipleSelection`, `expansion`, `reorder`, `cellEditing`, `overlay`, `anchored`,
  `closeOnOutsidePress`, `closeOnFocusLeaving`, `overlayStack`, `listboxRoles`, `menuRoles`, `comboboxRoles`,
  `treeRoles`, `gridRoles`, `submenus`, `submenuPointer`, `inlineCompletion`.
- **Helpers:** `returnTo`, `returnToPrevious`, `state`.
- **Operations:** `go`, `next`, `previous`, `first`, `last`, `step`, `parent`, `firstChild`, `below`, `above`, `type`,
  `takes`, `select`, `setAnchor`, `toggleSelected`, `extendTo`, `addRangeTo`, `selectAllMatching`, `clear`, `expand`,
  `collapse`, `toggleExpanded`, `expandAll`, `moveUp`, `moveDown`, `start`, `setDraft`, `commit`, `cancel`, `show`,
  `close`, `add`, `inside`.
- **States and reads:** `active`, `selected`, `value`, `expanded`, `dragging`, `target`, `editing`, `open`, `answer`.
- **Questions:** `order`, `textSearch`, `firstFrom`, `around`, `groups`, `groupOf`, `members`, `describe`, `all`,
  `range`, `membership`, `count`, `tree`, `grid`, `moveTarget`, `targetAt`.
- **Parameters:** `container`, `scroller`, `elements`, `elementOf`, `gone`, `removed`, `replacement`, `follow`, `draw`,
  `drawGroup`, `decorations`, `groupDecorations`, `minColumnWidth`, `wait`, `attribute`, `handle`, `moved`, `element`,
  `modal`, `allowClose`, `returnFocus`, `anchor`, `anchorGone`, `placement`, `page`, `parent`, `roleOf`, `hasSubmenu`,
  `openSubmenu`, `closeSubmenu`, `input`, `textOf`, `writes`, `apply`, `watch`.
- **Values:** `ranges`, `added`, `removed`, `anchor`, `all`, `except`, `draft`; drop targets `before`, `after`, `into`,
  `childOf`.
- **keybinds additions:** `unless`, `takesText`, `insideNoOpenOverlay`, `noOverlayOpen`, `notFromTextField`, `chars`,
  `$char`.
- **Names that appear only in the tests,** as an app's own: `bind`, `down`, `shiftDown`, `data`, `worldServer`,
  `treeServer`, `memoryCommands`, `isGrip`, `drawCard`, `neighbour`.
- **Element names:** `<interact-listbox>`, `<interact-menu>`, `<interact-combobox>`, `<interact-palette>`,
  `<interact-tree>`, with the prefix the app's.
