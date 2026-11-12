# Design

Every name and every UX choice here is a proposal for the owner, not decided. Proposals are marked **(P)**.

## Rules this follows

- A module does one thing. A feature is a new module; no existing module changes for it.
- A module states the narrow shapes it uses (its abstractions) and owns them. Implementations conform. Two modules that
  use the same shape each declare it; they coincide structurally, and nothing shared is imported.
- A parameter is a value of an abstraction the module owns (a function, or a small record of functions), never a module.
  The app makes each module, takes the values it needs from one and hands them to another, by hand. No registry,
  container, event bus or plugin list.
- Every answer about the items may be late (it may come from a server). No module relies on when an answer arrives, on
  answers arriving in order (a module applies only the answer to its latest question), on how big anything is, or on
  which elements exist at a given moment.
- Keys are opaque item identities. Nothing reads their contents.
- Ready-made UI is unstyled: light DOM, no shadow root, no stylesheet; its state shows only as `aria-*` and `data-*`
  attributes; the only inline style is geometry that is behaviour (a popover's place, a radial slot's place). The app
  styles it.

## Abstractions

Each is owned by the module(s) named, which declare it.

| Abstraction | Shape                                                                    | Owned by                                                                       |
| ----------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| Value       | `() → T`                                                                 | move (`from`), typeahead (`from`)                                              |
| Watched     | `get() → T`, `watch(fn) → stop`                                          | activeDescendant, popover, focusWhen, windowing, sizer, posInSet               |
| Set         | `(T) → void`                                                             | move (`to`), typeahead (`to`), pick (`to`), dismiss (`to`), hoverIntent (`to`) |
| Step        | `step(k \| none, n) → later key \| none`                                 | move                                                                           |
| Find        | `find(prefix, after: k \| none) → later key \| none`                     | typeahead                                                                      |
| Drawn       | `keys() → Key[]`, `watch(fn)`                                            | render                                                                         |
| Mount       | `put(key, element, before: element \| none)`, `remove(element)`          | render                                                                         |
| Facet       | `apply(key, element)`, `watch(fn(keys?))`, optional `drop(key, element)` | render                                                                         |
| ItemOf      | `itemOf(eventTarget) → {key, element} \| none`                           | pick, drag, gaps, hoverIntent                                                  |
| Test        | `has(key) → bool`, `watch(fn(keys?))`                                    | mark                                                                           |
| KeysAt      | `keysAt(fromRank, toRank) → later Key[]`, `watch(fn)`                    | windowing                                                                      |
| Locate      | `locate(key) → later rank \| none`                                       | windowing                                                                      |
| Rank        | `rank(key) → rank \| none` (immediate), `watchRanks(fn)`                 | place, posInSet                                                                |
| Compare     | `compare(a, b) → -1 \| 0 \| 1` (drawn or held keys only, immediate)      | rangeSelection                                                                 |
| RanksIn     | `ranksIn(fromPx, toPx, count) → [fromRank, toRank)`, `watch(fn)`         | visibleRanks                                                                   |
| Place       | `place(rank) → rect`, `watch(fn)`                                        | place                                                                          |
| Extent      | `extent(count) → size`, `watch(fn)`                                      | sizer                                                                          |
| Gap         | `gapAt(point) → {target: key, after: bool} \| none`                      | drag                                                                           |
| Reorder     | `move(key, target: key, after: bool)`                                    | drag                                                                           |
| Scroll      | `scrollBy(px)`                                                           | edgeScroll                                                                     |
| Pages       | `read(from: cursor \| none, count) → later Page[]`, `watch(fn)`          | cursorPages                                                                    |

`Step`: `step(none, 1)` is the first key, `step(none, -1)` the last; `step(k, n)` goes `n` keys on and stops at the
edge; `none` comes back only for an empty list. `Find` returns the first key after `after` (wrapping) whose text starts
with `prefix`, ignoring case. `Drawn` draws every key the list holds for others (below) and at least every visible key.
`Facet.watch` reports the keys whose facet changed, or nothing for "any". `render` mounts an element, then applies every
facet to it in one synchronous pass, and applies a facet again to the keys it reports.

**Held keys.** A list gives out held keys: `hold(initial, whenRemoved)` is a Watched, Set and Test whose key is always
in that list, or none. The list updates it inside the edit that removes its key, to the next key (`next`), the previous
(`previous`) or none (`none`), before anything hears of the edit. A held key never names a removed item.

## Case 1: a plain listbox

| Module             | Does                                                                                                                                            | Parameters                                           | Gives                                        |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | -------------------------------------------- |
| `arrayList`        | holds keys in memory, and the keys held from it                                                                                                 | initial keys                                         | `set(keys)`, `keys()` (Value), Drawn, `hold` |
| `arrayStep`        | steps through an array                                                                                                                          | keys (Value)                                         | Step                                         |
| `move`             | moves a key by `n` steps, or from an edge; moves made while one is under way queue from its result, and a change from elsewhere drops the queue | from, step, to                                       | `by(n)`, `edge(n)`                           |
| `render`           | keeps one element per drawn key, in order                                                                                                       | drawn, create (`key → element`), drop, mount, facets | ItemOf, `stop()`                             |
| `flowMount`        | puts elements into one container in order                                                                                                       | container                                            | Mount                                        |
| `mark`             | an attribute set while a test holds, and another or none while it doesn't                                                                       | test, attribute, on, off                             | Facet                                        |
| `ids`              | gives each element an id from its key                                                                                                           | idOf (`key → string`)                                | Facet                                        |
| `activeDescendant` | names the active key's element in an element's `aria-activedescendant`, only while render has it drawn                                          | element, active (Watched), idOf                      | Facet                                        |
| `pick`             | a click on an item hands its key on                                                                                                             | element, itemOf, to                                  | `stop()`                                     |
| `reveal`           | scrolls a key's element into view when the key changes, after the pass that applies it                                                          | target (Watched)                                     | Facet                                        |

Wiring (the app, by hand): `active = list.hold(none, next)`, `selected = list.hold(none, none)`. Down/Up are
`move.by(±1)`, Home/End `move.edge(±1)`, all on `active`; Enter and Space set `selected` to `active`; `pick` sets
`active` then `selected`. Facets: `ids`, `mark(active, 'data-active')`,
`mark(selected, 'aria-selected', 'true', 'false')`, `reveal(active)`. The container has `role=listbox`, `tabindex=0` and
keeps DOM focus; items get `role=option` from `create`.

Keys are bound by the app (with keybinds, see below). No module here knows about keys, the DOM event that triggered it,
or any other module.

UX **(P)**: selection does not follow the active item (a wiring line adds that); no wrapping at the ends (a `wrapStep`
value made from a Step adds it); PageUp/PageDown are `move.by` the number of visible rows; Down with nothing active goes
to the first item, Up to the last; removing the active item makes the next one active, or the previous at the end;
removing the selected item leaves nothing selected.

## Case 2: multiple selection

Adds `rangeSelection`: the selection as intervals between held keys (start held `next`, end held `previous`; an interval
that empties is dropped), with `toggle(k)`, `extend(anchor, k)`, `all()`, `none()`, and Test. It takes the list's `hold`
and a Compare, and costs nothing per item, so "all of a billion" is one interval. `arrayCompare` gives Compare from a
key→position map. Wiring: Space toggles; Shift+arrows run `move`, then `extend(anchor, active)`; Ctrl+A is `all()`;
`pick` hands on the event's modifiers with the key **(P)**; `anchor` is another held key. `mark` is unchanged. The
container gets `aria-multiselectable`.

## Case 3: typeahead

Adds `typeahead`: `type(character)` adds to a prefix that clears after a pause (**(P)** 500 ms), asks Find from the
active key and sets the result; `typing` (Watched) is whether a prefix is under way. Parameters: find, from, to. Adds
`arrayFind` (Find, over the array and a `textOf(key)`). Typing the same letter again cycles through the items starting
with it **(P)**. The app binds `type` to the keybinds key `printed` (below), and gives Space's select command
`when: not typing`, so a Space inside a prefix is typed: one listener, and the precedence is in the wiring.

## Case 4: a menu with submenus

A menu is case 1 with other wiring: `role=menu`, items `role=menuitem`, Enter runs the item's action instead of
selecting. A submenu is another instance of the same modules. Adds:

- `cell`: holds one value (Watched, Set); here, whether a menu is open.
- `popover`: shows an element as a popover anchored to another, while a Watched boolean is true.
- `focusWhen`: focuses an element when a Watched boolean becomes true.
- `dismiss`: calls a Set with `false` on Escape or a press outside the given elements.
- `hoverIntent`: hands on the key under the pointer after it rests (**(P)** 100 ms), so hover moves the active item and
  opens submenus without opening every one the pointer crosses.

Each menu level binds its keys on its own element, so the focused level gets them. Right/Enter on an item with a submenu
opens it and moves its active key to the first item; Left/Escape closes it and focus returns.

**As built** (the browser test's page, `test/page-menu.js`): `popover({ element, anchor, open, side })` shows a `manual`
popover (closing is `dismiss`'s and the keys', never the browser's light dismiss) placed below or beside its anchor, and
again on scroll and resize. `focusWhen({ element, when })` focuses in a microtask after `when` becomes true, so an
element the same change shows is shown by then, whatever order the wiring heard it in. `dismiss({ elements, to })` sets
`false` on a press outside every element, or on an Escape whose default nothing prevented: a level that binds Escape
(keybinds prevents what a command takes) closes alone. `hoverIntent({ element, itemOf, to, rest })` hands on the key the
pointer rests on **(P: 100 ms)**; a move restarts the wait. Focus is one `cell` naming the level (or the button) that
has it; hovering an item gives its level focus, so the keys follow the pointer.

**Found while building:** a submenu's open state was first its own `cell`, which its parent's "which child is open" had
to mirror; Left closed one and left the other. A submenu's open is now derived from its parent's choice, one source of
truth. `mark` applies its off value to every key, so a submenu item's `aria-expanded="false"` (which a plain item
mustn't carry) is a small facet in the page; open whether `mark` should take the keys it applies to.

## Case 5: a combobox

DOM focus stays in a text field; the list is a popover. Adds `textValue` (Watched and Set over a field's value). The
list's Drawn and Step implementations read the query (an in-memory `filtered` over `arrayList` and `textValue`, with its
own holds, or the server's). `activeDescendant` is given the field instead of the list. Keys are bound on the field and
must work while typing. On a new query the active key becomes the first result **(P)**; Enter writes the active item's
text into the field and closes the list **(P)**.

## Case 6: grouping

**Changed:** `render` first took a `container` and inserted elements itself. Nesting options inside `role=group`
elements needed that changed, so the container became the Mount abstraction and `flowMount` its first implementation.
Adds `groupMount` (Mount: puts each element into its group's `role=group` element, making the group when its first row
arrives and removing it with its last; parameters: container, groupOf, labelIdOf, the id of the row that labels a group)
and `withHeaders` (Drawn: a header row before each group's first key; parameters: drawn, groupOf, headerOf, a group's
header key, of the same key type so every facet applies to it). A group's keys must come together. Step has no headers
in it, so navigation skips them. A header is `role=presentation`, so facets that mark options leave their "off" value
out (`aria-selected` is not allowed on it) **(P)**.

**Changed while building:** Mount's `put(element, before)` became `put(key, element, before)`. `groupMount` can't tell
an element's group from the element, and `rowMount` (case 9) can't tell its row; any Mount that places by what an item
is needs its key. `flowMount` ignores it.

## Case 7: drag to reorder

Adds `drag`: a press becomes a drag after the pointer moves a few pixels **(P: 4)**; it asks Gap where the pointer is,
hands the drag to `showing` (none when it ends), calls Reorder on release, and swallows the click that ends it.
Parameters: element, itemOf, gap, reorder, showing. Adds `gaps` (Gap from the element under the pointer and `render`'s
ItemOf: before or after that item by which half it is in, along `y` for a list or `x` for cards), `edgeScroll` (scrolls
while the pointer is near the scroller's top or bottom during a drag; parameters: element, scrollBy, active), and
`arrayReorder`. The drag is shown by marks over a `cell` that `showing` sets: `data-dragging`, `data-drop-before`,
`data-drop-after` **(P)**. Keyboard: Alt+arrow moves the active item one place **(P)**.

**Changed while building:** Gap was `before: key | none` and Reorder `move(key, before)`. `gaps` knows only the item
under the pointer, so "after the last item" or "after X" would need X's neighbour, from another question; now both say
`{target, after}`, which an array and a server answer alike.

**Changed while building:** `drag` asked Gap only when the pointer moved, so while `edgeScroll` scrolled under a still
pointer the drop place was stale. It now also asks on any scroll in the page (a capturing listener), with the pointer
where it last was. Touch dragging is not handled.

**Found while building SillyTavern's overview:** a drop there changes or, while Alt is held, adds a relation, and the
label on the dragged card says which as Alt goes down and up, with the pointer still. Nothing told whether a modifier
was held between pointer events. Adds `modifierHeld` (keybinds): whether a modifier is held now, alone or with other
keys, as a Watched over the modifier flags of every key and pointer event, let go when the window loses focus.

**Found while building, open:** `drag` hands `showing` none while the pointer is over the dragged item itself, the same
as when the drag ends, so an app can't tell the two apart from `showing` alone. SillyTavern's Gap never names the
dragged item (it answers "into itself", which changes nothing), so its drag stays shown.

**Between groups** (built with case 10): Reorder puts the key into the target's group; a group's header as the target
puts it first in that group, so an empty group can be dropped into. Alt+arrow across a group's end puts the item at the
near end of the next group **(P)**.

## Case 8: long lists, drawn only partly (windowing)

**Changed:** `arrayList` first answered every question (Step, Drawn, Compare, ...). Case 2 would have added Compare to
it, which is a modification; so each question became its own module over the array (`arrayStep`, `arrayCompare`,
`arrayFind`, `arrayKeysAt`, `arrayLocate`, `arrayReorder`), and `arrayList` only holds keys.

Adds:

- `viewport`: a scroll container's visible range (Watched) and Scroll.
- `rows`: a layout of rows of one height **(P)**; gives RanksIn, Place and Extent.
- `visibleRanks`: the ranks in view, from the visible range, RanksIn and the count (Watched).
- `windowing`: the ranks in view plus an overscan **(P)** one screen each way, and every key in `keep` (the app's held
  keys, as a Watched list), placed by Locate. Parameters: ranks, keysAt, keep, locate. Gives Drawn and Rank.
- `place`: Facet placing each element at `Place(Rank(key))`, so elements never move each other (no layout shift).
- `sizer`: sets the scrollable size from Extent and the count.
- `posInSet`: Facet setting `aria-posinset` and `aria-setsize` from a position (a Rank) and a count. With header rows in
  the ranks, the app gives each option's position among options, not `windowing`'s Rank.
- `arrayKeysAt`, `arrayLocate`, `arrayCount`.
- For a list worked out from ranks, never stored: `computedKeysAt`, `computedLocate`, `computedStep`, with `cell`s as
  its held keys (it never changes, so nothing moves them). The browser test runs half a million grouped options this
  way, drawing about thirty.

`render`, `move`, `mark`, `pick`, `reveal`, `drag` and `gaps` are unchanged: the active key is drawn, at its place, so
`reveal` scrolls to it; the pointer is always over drawn items, so `gaps` needs no layout.

**Changed while building:** KeysAt gained `watch` (the design already said `windowing` asks again when the list changes;
the shape didn't carry it). The layout shapes gained `watch`, since a layout that depends on the page (case 9's columns,
measured rows) changes. Rank gained `watchRanks`, since ranks move when items are added above.

**Changed while building:** `activeDescendant` set the attribute when the active key changed, so between a move and
`windowing` locating the new key (a round trip on a server) it named an element not yet drawn. Only `render` knows what
is drawn, so `activeDescendant` became a Facet: it names a key when render applies it to that key's element, and clears
the attribute when the key changes or render drops the element. Facet gained an optional `drop(key, element)`, which
render calls before taking an element out; any facet holding an element needs it. Tested with a list that answers late.

**Found while building, open:** revealing a group's first option scrolls its header out of view **(P: reveal the header
too)**.

## Case 9: a grid of cards

Adds `cards`: a layout of fixed-size cards in as many columns as the width holds; gives RanksIn, Place, Extent, and the
column count as Watched; and `widthOf`, an element's width as Watched, which `cards` takes. Up/Down are
`move.by(∓columns)`; Left/Right are ±1 and run on across rows **(P)**. Semantics stay a listbox **(P)**; `role=grid`
would add a `rowMount` (Mount grouping by rank and column count), nothing else.

**Changed:** Step began as `after(k)`/`before(k)`. Moving by a row of columns or a page would have been many calls (many
round trips to a server) and a loop in `move`, so it became `step(k, n)`.

## Case 10: a grouped grid of cards

Groups of cards, each under a header as wide as the grid, windowed (the worldbuilding page's entries by region). Adds:

- `arrayGroups`: keys in groups in memory, with held keys; seen as rows (headers and cards, what `windowing` draws and
  ranks) and options (cards alone, what Left/Right step through and `posInSet` counts), with each group's size.
- `groupReorder`: Reorder over `arrayGroups`, into the target's group.
- `groupedCards`: the layout; each group starts a row; gives RanksIn, Place, Extent, the column count, and `rowStep`
  (the rank some rows up or down: same column, the last card of a shorter row, past headers and empty groups).
- `gridStep`: a Step by rows, from Locate, KeysAt and a layout's `rowStep`; Up/Down use it.
- `arrayRank`: an immediate Rank over a list in memory, for `posInSet`.

`groupMount` gives the groups their `role=group`; nothing existing changed.

**Wrong in case 9:** Up/Down as `move.by(∓columns)` over the options is right only while every row is full. Once a group
ends in a short row, `+columns` lands in the wrong column of the next group. Moving by rows is a layout question, so it
is `gridStep` over the layout's `rowStep`; plain `cards` could give `rowStep` too.

## Case 11: nested regions (the worldbuilding overview)

The server answers "the overview near rank r" with the top-level entries around r, each with its subtree cut short at
every level (a region's first few members, each with its first few), a "+N more" tile per cut, and a repeat cut where it
recurs. Ranks exist only at the top level. Adds:

- `measuredRows`: a layout of rows as tall as their content, an estimate **(P: 56px)** until measured; only measured
  rows cost anything.
- `measure`: Facet measuring each element's height, handed on with its key and rank in the next frame, and again when
  ranks change.
- `keepInPlace`: keeps what is on screen in place by key, whatever moves it (rows above measured, entries added or
  removed above). It holds one drawn item at its distance from the view's top (the active item's top-level item while in
  view, else the first item in view), and after any change to the layout or the ranks scrolls it back there, once
  everything else has heard the change. It picks again when the view scrolls by other means or the preferred item comes
  into view. It hands the held key on (`hold`); the app adds it to `windowing`'s `keep`, so it has a rank after an edit
  however far it moved.
- `treeCache`: holds the latest answers; gives `windowing` the top-level KeysAt and a Locate that fetches a far node
  first; gives each node's children as a Drawn; and each node, for `create`.
- `nest`: Facet that builds a region's nested list inside its element (render, `flowMount`, the same facets, with `nest`
  itself, so regions nest the same way) and stops it when the element is dropped.
- `items`: Facet that knows every drawn element across every render it is given to, so `pick`, `drag` and `gaps` find
  the innermost item. One render's ItemOf can't: the outer item contains the inner.
- `byEntry`: a Test over occurrences from a Test over entries. The same entry in two regions is two occurrences with two
  keys; selecting by entry (marking every occurrence) or by occurrence is the app's choice **(P)**: `byEntry`, or a
  `cell` of occurrence keys.

The arrow keys use one Step over the tree's reading order, from the server. `windowing` keeps the active occurrence's
top-level key drawn; the nested lists under it are drawn whole.

**Found while building SillyTavern's overview:** `reveal` scrolls a key's whole element, and a region's element holds
its members, so a region taller than the view was left where it was when its head became active (both its edges outside
the view: `scrollIntoView` with `nearest` does nothing). Adds `revealPart`: a Facet like `reveal` that scrolls the part
of the element the app names (the head's card), or the element when it names none.

**Found while building SillyTavern's entry page:** an entry's page holds one windowed list per relation pointing at it,
one below the other in one scroller, under text that grows as it is edited. `viewport` gives the scroller's view from
its content's top, so each list needs the view from its own top, which moves when anything above it changes size. Adds
`topIn` (an element's top in its scroll container's content, a Watched heard when the element or one of the container's
children changes size) and `viewFrom` (a view and Scroll counted from a Watched top). `windowing`, `visibleRanks` and
`keepInPlace` take the result as they take `viewport`.

**Found while building SillyTavern's entry page:** the entry's text is committed on a pause in typing, and the page may
not wait on timers itself. Adds `rested`: a Watched value handed on once it has stopped changing for a while **(P: 800
ms)**, with `flush` (hand on a waiting change now, as when the field loses focus) and `waiting`.

**Found while building SillyTavern's search:** a search's results have no ranks and no total: they are read a page at a
time after a cursor as the reader scrolls. Adds `cursorPages`, over Pages (the pages from a cursor, each the page after
the one before, at most `count` of them, in one question; a Page is `{cursor, keys, next}`): KeysAt and Locate over
ranks counted from the pages read so far, a `count` (Watched) that grows as later pages are read, `ended` (whether the
last page has been read), and a Step through the held keys that stops at their ends. It holds one run of consecutive
pages, the run the latest question needs (asking past the pages known reads on, guessing the pages needed from the
largest page seen), and keeps every page's cursor and size, so ranks stay put when a page is dropped and a dropped page
is read again by its cursor. A run is read in one question so its pages always follow one another; when the source
changes, the held run is read again, and the pages known after a page whose `next` moved are forgotten. Reads go one at
a time; only the latest question's answer is used, and a read that fails answers with what is held.

**Unchanged and verified:** one `active`, and one `activeDescendant` facet given to every nested render, works as is:
its state is per facet, so whichever render draws the active key names it, and the others clear nothing.

**Fixed after review:** `render.stop()` didn't call `drop` for the elements it drew, so a nested list's elements left
with their parent without facets hearing it. `drop` is render's own contract ("no longer drawn"); `stop` now keeps it.

**Fixed after review:** an item whose content changed under the same key (a "+N more" count) wasn't shown again. Adds
`content`: a Facet that shows a key's content in its element, and again for the keys its source says changed.
`treeCache` gives `watchNodes`, the keys whose node says something new about itself (any field but its children); the
element stays, its content changes. Any source of content can feed `content` the same way.

**Fixed after review:** `measuredRows` kept heights by rank, so an edit at the top level left them on the wrong rows. It
now keeps each height with its key, at the rank the key was last seen at (a key seen at a rank another held displaces
it), and `measure` reports again when ranks change, so heights move with their items. The layout still needs ranks for
positions; taking them from `measure` rather than from `windowing` avoids a cycle (`windowing` needs the layout first).
A height measured far away keeps its last rank until its item is drawn again.

**Fixed after review:** an insert or removal at the top level above the view moved what was on screen. `keepInPlace`
first applied measured height changes as deltas; that was one cause of movement among several. It now holds an item by
key and scrolls it back to where it was after any change, so measurements and edits are one case, and `measuredRows` no
longer reports shifts. Tested in the browser by inserting and removing above the view while scrolled to the middle of
100,000 entries: the same entries stay at the same pixels.

**Changed while building:** `place`'s Rect height became optional (no height: as tall as its content), for a layout
whose items size themselves.

**ARIA.** A listbox can't hold groups inside groups: its required owned elements are `group → option` and `option`
(WAI-ARIA 1.2, https://www.w3.org/TR/wai-aria-1.2/#listbox). A tree can: `tree` owns `treeitem` and `group → treeitem`,
and a `treeitem` with children holds a `group` (https://www.w3.org/TR/wai-aria-1.2/#tree, #treeitem, #group; APG Tree
View, https://www.w3.org/WAI/ARIA/apg/patterns/treeview/). So the overview is a `tree` with `aria-activedescendant`;
each occurrence is a `treeitem`, a region's holds its members in a `group`, and "+N more" is a `treeitem` **(P)**. The
treeitem is named from its content. Chrome leaves the nested group out of that name and gives levels 1 to 3, as its
accessibility tree shows (checked over CDP). `aria-labelledby` on the head instead fails axe's
`label-content-name-mismatch`. Top-level items carry `aria-posinset` and `aria-setsize`; nested ones are counted by the
browser. What screen readers announce was not tested.

**Opening and closing regions.** Regions start open. Left on an open region's head closes it, and anywhere else moves to
the parent region's head; Right on a closed head opens it, and on an open head moves to its first member. Either stays
put where there is nowhere to go. A closed region shows only its head card, with its member count; its members are
neither drawn nor in Up/Down's reading order. Heads carry `aria-expanded`. Adds:

- `collapse`: `open(k)` and `close(k)`. Closing a region that holds the active item first moves the active item to the
  region's head, so it is never an item no longer drawn. Whether a key is inside a region is a question the source
  answers, now or later. The closed set is an abstraction `collapse` owns (`add`, `delete`); the app provides where it
  lives. SillyTavern keeps it on the server as tab state.
- `keySet`: the closed set in memory, for tests and for an app that provides nothing else.
- `relationStep`: a Step from one hop the source answers, now or later ("the parent of k", "the first child of k"), so
  Left and Right are `move`s like the others.

The source answers with the closed set taken into account: a closed region comes back with no members and its count, so
`nest`, `content`, `windowing`, `measure` and `keepInPlace` need nothing new; the view stays in place when a region
above it closes or opens.

## Changed after review

- **Pairings.** `elementReveal`/`rankReveal` and `flowGaps`/`layoutGaps` each worked with only one kind of Drawn. Now
  Drawn's contract says it draws every held key and every visible key (`arrayList` draws all; `windowing` takes the held
  keys, which absorbed `pinned`). With that, one `reveal` (a Facet: scroll the element when render applies the changed
  key) and one `gaps` (over ItemOf) are right in both cases. ElementOf, `pinned`, rank-at-point and the second reveal
  and gap modules are gone.
- **A removed active key.** `active` and `selected` were `cell`s, which can hold a key the list no longer has. They are
  now held keys, which the list moves inside the removing edit.
- **Compare.** Compare needed keys that carried their position, against "nothing reads their contents", and reordering
  changed them. Now Compare is asked only about keys the list draws or holds (Test is asked only for drawn keys;
  selection endpoints are held), and the list answers it: the array by position, the server by sending, with each
  window, where each held key lies relative to it. Keys stay opaque and survive a reorder.
- **ItemOf** (found building case 1). `render` gave KeyOf for `pick` and ItemAt for `gaps`; the second, added in case 7,
  would have modified `render`. It now gives one `itemOf(target) → {key, element}`, and `gaps` finds the element under
  the pointer itself.
- **Releasing a held key** (found building case 1). A list keeps every held key it gave out, for the list's lifetime. A
  short-lived hold (a closed menu's active key) needs `release()`; not built, as case 1 never drops one. Open.
- **Typeahead.** It read key events itself. Now it takes characters, and keybinds gains a `printed` key (below).
- **Keys inside an open popover** (found building case 4). keybinds took an open `<dialog>`, popover or
  `[data-keybinds-modal][open]` anywhere on a key's path to mean the key wasn't its to handle, so a menu level, an open
  popover with its keys bound on itself, never got them. The rule meant that an overlay takes the keyboard from bindings
  outside it; it now blocks only bindings listening outside the overlay (an overlay between the key's target and where
  they listen), and bindings on the overlay or inside it fire. No option was needed: where a listener listens already
  says whose keys it handles.

- **Keybinds, from the review's proposed structure** (built in the rebuild):
  - `Sink.down` returns the handler that took the press, not a boolean, and `up` takes `{ id, event, typing, blocked }`:
    release bindings need to know which handler took the press, so a held key's release always comes, and an unrelated
    release whose `when` fails doesn't run.
  - `releases` takes `took(id)`; `holds` returns `held`, `took` and `stop`; the wiring order is
    `keyListen → sequences → releases → holds → presses`.
  - A Handler has `typing?`: a `when()` can't know the press was in a text field, and the default must stay "not while
    typing".
  - `blocked` lives only on the listeners, since it depends on where they listen; `presses` has none. Pads have no event
    path, so they are blocked by `focusInOverlay(target)`, the same rule applied to the focused element.
  - `keyListen` takes `query: (event) → Query`, and its held keys are keyed by lookups without modifiers, so a
    `keys:a/d` axis follows the layout; key syntax pieces gained `fallback` and `accepts`.
  - Axes: `axisWhen(value, when)` wraps a Value (nothing global in each axis); `mouseAxis` returns `{ read, stop }`;
    `scaleAxis` added (inversion and sensitivity); `modifierAlone`, shared by `modifierHold` and `modifierTaps`.
  - Scroll bindings need `wheel.bound(query)`, so the page is held still only during a bound gesture.
  - `formatX` formats one step; `formatSteps` adds then/Release/Hold/Tap; `splitBinding` is the one step/suffix
    splitter.
  - list's `popover` gained an Anchor shape (anything with `getBoundingClientRect`, so a point) and a centred side, so
    the radial menu and the cheatsheet are manual popovers (in the top layer, blocking the page's bindings by the
    overlay rule) rather than hidden and positioned by the app; `radialPlace` lost its centre.
  - `recording` hands `done(slot, binding)` and leaves the conflict question to the settings panel; `rebind` writes a
    replace in one set.
  - The `gamepad` field is now `pad` (a hard cutover).

## Solid (`packages/solid`)

One bridge per abstraction, none per module: `toValue`, `toWatched`, `toDrawn` and `toSet` make a signal or memo a
Value, Watched, Drawn or Set; `fromWatched`, `fromTest` and `fromKeyed` make a Watched, a Test, or any answer per key
with its changed keys, a Solid accessor; `componentItems` makes a component what `render` draws. Reads of either side
are untracked by the other; a Watched is told only of a new value. The per-key accessors follow only the keys a
computation reads, so their cost is what is drawn. Each item is a root of its own, owned (for context and disposal) by
the owner `componentItems` is called in, as Solid's own lists own their rows.

**Changed while building:** render told facets that an element was no longer drawn, but not what made it. A maker that
holds something per element (a framework's root, a pool) had no way to hear it: as a facet beside `create` it is two
parameters that must be passed together. Render gained `drop(key, element)`, called once per element `create` made,
after the facets' drops, when render takes it out or stops.

**Found while building SillyTavern's overview:** `toWatched` made a root per watch, stopped only by the watcher; a
module that never stops watching (`windowing`, `sizer`, `visibleRanks`) kept a component's signals running after the
component was gone. A watch made inside a Solid owner is now stopped when that owner goes.

**Found while building, open:** render puts an element in place after `create` returns, so an item's Solid effects
(`onMount`) run before it is in place unless a Solid update is under way (then they run at its end). Layout belongs to
facets, which render applies after placing.

## The huge case: a server with billions of items

Only implementations change; every module above stays as is.

| Abstraction                   | Server implementation                                                                                                                                                      |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Step                          | "the key `n` after `k`" from an ordered index: a range read of `n` keys from `k`                                                                                           |
| KeysAt, Locate, count         | an order-statistic index (each node counts its subtree), so rank → key and key → rank are logarithmic                                                                      |
| Find                          | an index over (text prefix, position), answering "the first match after `k`"                                                                                               |
| Compare                       | each window's answer says where every held key lies relative to it; nothing else is compared                                                                               |
| held keys                     | the server's removals carry each removed key's neighbours; the client moves its holds inside that edit                                                                     |
| Reorder                       | the moved item gets a position between its new neighbours (fractional); its key is unchanged                                                                               |
| Drawn, count changes          | the server pushes changes; `windowing` asks again                                                                                                                          |
| Scroll / visible range, Place | a `scaledViewport` that maps a capped physical scroll height onto the full extent (browsers cap element height), and the Place that `place` uses near the current position |

Each server module asks for what a window needs in one request, and caches what it has seen. Selection is intervals, so
"select all" and "delete selected" are one request each, never a key list.

## Keybinds (`packages/keybinds`)

No module of list depends on keybinds. The app binds `move.by`, `toggle` and the rest with keybinds, per element
(`target`: the focused element of each level), `typing` on the combobox's field, and `run` returning false to pass a key
on.

**Shapes** (each module declares those it uses; keybinds' Find is its own, not typeahead's):

| Shape   | Is                                                                                                       |
| ------- | -------------------------------------------------------------------------------------------------------- |
| Query   | `{ exact, bare, mods }`: a press's lookups best first, the same without modifiers, the modifiers held    |
| Handler | `{ run(event) → bool \| void, when?, typing? }`: runs unless `when()` is false; `false` leaves the event |
| Find    | `(query) → Handler[]`: every lookup's handlers, best first                                               |
| Press   | `{ id, query, event, typing, repeat }`                                                                   |
| Release | `{ id, event, typing, blocked }`                                                                         |
| Sink    | `down(press) → Handler \| none` (the handler that took it), `up(release)`                                |

**Modules.**

- Engine: `presses(find)` (runs the first handler that applies, takes the event; `held`, `took(id)`),
  `releases({ find, to, took })`, `holds({ hold, tap, delay, to })`, `sequences({ entries, timeout, to })`, each a Sink
  handing on to `to`; `bindingTable` (by `exact`), `looseTable` (by `bare`, the binding's own modifiers required),
  `anyOf` (Finds in turn); `runFirst`, `applies`, `take`.
- Inputs: `keyListen` (keys by `event.code`; `held`, keyed by lookups without modifiers), `mouseListen` (buttons, and
  scrolling as steps with `wheel.bound(query)`), `pads` (one polling loop) and `padButtons`. Each takes `blocked`.
- Syntax: `keyParse`/`keyQuery` with the pieces `symbols()`, `aliases()` and `printed()`; `mouseParse`, `padParse`,
  `axisParse`; `splitBinding`, the one step/suffix splitter; `modifiers`; `punctuation`.
- Axes, as Values `() → { position, delta }`: `keyPairAxis`, `mouseAxis`, `padAxis`, `sumAxis`, `scaleAxis`, `axisWhen`.
- Display: `formatKey`, `formatMouse`, `formatPad`, `formatAxis` (one step each), `formatSteps`, `bindingParts`,
  `layout` (a Watched glyph map).
- Modifiers alone: `modifierAlone`, and `modifierHold`, `modifierTaps` made from it.
- Rebinding: `bindingStore` over a storage (`localStorageBindings`), `bound`, `rebind`, `changedFields`, `findConflict`,
  `bindingLookup`, `flipRelease`; `recording` (the state machine) and `recordKey`, `recordMouse`, `recordPad`,
  `recordAxis`.
- Compositions: `keybinds(bindings, options)`, and the ready-made UI `cheatsheet`, `radialMenu`, `settings`, each wiring
  exported pieces (`cheatsheetKeys`, `cheatsheetRow`, `cheatsheetTrigger`, `categoryHeaders`, `focusReturn`;
  `radialPlace`, a Place, and `radialStep`, a Step; `settingsKeys`, `settingsRow`, `settingsChip`, `settingsPrompt`,
  `settingsQuestion`, `settingsRecorder`, `conflictQuestion`, `rebindKeys`/`Mouse`/`Pad`/`Axes`) with list's render,
  groupMount, mark, move, pick, hoverIntent, popover, focusWhen and dismiss.

Wiring, for one input: `keyListen → sequences → releases → holds → presses`; `releases` is given `took` from holds and
presses. Which table a binding goes in is the syntax it names (`k:up`, `k:hold`, `k:tap`, `g i`), decided in
`keybinds()`, not in the engine; no module lists phases or kinds of input.

**The overlay rule.** An open `<dialog>`, popover or `[data-keybinds-modal][open]` blocks a listener when it lies
between the event's target and where the listener listens: `outsideOverlay(listener)`, passed as `blocked`. Bindings on
the overlay or inside it fire, so a menu level binds its keys on itself. Gamepads and axes have no event path, so they
are blocked by `focusInOverlay(listener)`, the same rule from the focused element. The radial menu and the cheatsheet
are manual popovers with focus while open, so the page's bindings don't fire then.

**Typeahead.** `printed()` adds the key name `printed`: a fallback lookup, after every other, for a key typing one
character with no Ctrl, Alt or Meta. Find gives every lookup's handlers best first, so Space bound with
`when: not typing` leaves a Space inside a prefix to the `printed` binding.

UX **(P)**: the radial menu's radius 100 px and slot 64 px; the cheatsheet opens after its modifier is held 1000 ms;
recording takes the steps so far after a 1000 ms pause; the settings panel shows a Release switch only on a binding that
is a release (it turns it back into a press), and recording a release is a switch in the prompt; the panel's texts
("Press a key...", "+ Key", "Reset", "Reset all", "Already bound to …", "Replace", "Cancel").

## Editor (`packages/editor`, `packages/markdown`), not built

The requirements are SillyTavern's `docs/design/editor.md`. Its design comes from cyoa's `src/client/editor`, with what
editor.md changes. In short:

- The text is the source of truth, exactly as written. It's drawn over and never changed to draw it.
- CodeMirror with a lezer grammar, reparsed incrementally.
- An editor shows formatting marks dimmed, in place. A reader shows none. Both are drawn from one syntax tree and one
  table, and differ only in the marks and in how pieces such as macros are styled.
- Reading becomes editing by an explicit action.
- Decorations cover the visible lines.
- Nothing is reported as a side effect of drawing.
- Inline HTML comes from the parser.
- There is a general markdown core, and each user adds drawing for its own syntax.

Names are **(P)**.

### Packages

| Package                      | Holds                                                                                                                                                                        | Depends on (all peers)                                                                                                                                                              |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@pterror/interact-editor`   | the text and its port, the look table, the editor's decorations, the reader, pieces, overlays, suggestions, the toolbar and the selection bar                                | `@lezer/common`; `@codemirror/state`, `view`, `language` and `autocomplete`, optional, since the reader's modules import only `@lezer/common`; `@pterror/interact-list` (`popover`) |
| `@pterror/interact-markdown` | a markdown grammar (lezer markdown with tables, task lists, strikethrough, autolinks, and HTML parsed by an HTML grammar), its look table, its formatting state and commands | `@pterror/interact-editor`, `@lezer/markdown`, `@lezer/html`, and the editor's CodeMirror peers                                                                                     |

- **The editor knows no markdown.** The grammar is passed in. cyoa draws markdown and wikitext with one look module, so
  a second grammar is a package beside `markdown`, and `editor` doesn't change for it.
- **Everything is a peer.** CodeMirror stops working when a page loads two copies of `@codemirror/state`: an extension
  from the other copy is "unrecognized". A `workspace:^` dependency between interact packages also blocks pnpm git
  dependencies, which is how SillyTavern installs interact. The release rewrites peer ranges as well
  (`scripts/release.js`, `DEPENDENCY_FIELDS`).

### Abstractions

| Abstraction | Shape                                                                                                   | Owned by              |
| ----------- | ------------------------------------------------------------------------------------------------------- | --------------------- |
| Text        | `get() → { text, includes: changeId \| none }`, `watch(fn)`; `includes` is the latest edit the text has | textEditor            |
| Edit        | `(change: { from, to, insert }[], id: changeId) → void`, positions in the text before the edit          | textEditor            |
| Grammar     | a lezer `Parser`                                                                                        | textEditor, reader    |
| Look        | `{ [selector]: Rule \| (node, read) → Rule \| none }`; a selector is a node name or `Parent/Name`       | textEditor, reader    |
| Piece       | `same(other) → bool`, `draw() → Element`, optional `drop(element)`                                      | textEditor, reader    |
| Overlay     | `ranges(from, to) → later { from, to, class, attributes? }[]`, `watch(fn(range?))`                      | textEditor, reader    |
| Suggest     | `(text, pos, explicit) → later { from, to, options: Option[] } \| none`                                 | suggestions           |
| Command     | CodeMirror's `(view) → bool`                                                                            | toolbar, selectionBar |
| Tool        | `{ id, label, icon?, run: Command, on?(state) → bool, applies?(state) → bool }`                         | toolbar, selectionBar |

**Rule.** These fields describe how a node is drawn. Both surfaces read them. `read(from, to)` gives the source between
two positions, so nothing copies the whole text to draw one node. A selector's entry can be a function of the node, for
a rule that depends on more than the node's name (whether an HTML tag is drawn depends on its element's name).

- `element` and `class`: the element the node is drawn as (`em`, `blockquote`, `h2`), and its classes.
  `attributes(node, read)` gives an element's attributes (inline HTML's own, after the app's policy).
- `block`: the element wraps whole lines. In the editor it is a CodeMirror `BlockWrapper`; in the reader it's a block
  element.
- `mark`: a formatting mark. The editor draws it dimmed, with a class. The reader leaves it out.
- `piece(node, read, surface)` with `source`. With `replaced`, the piece stands for the source on both surfaces, and in
  the editor it's an atomic range that Backspace deletes whole (a macro). With `beside`, the editor keeps the source as
  editable text drawn with the rule's `class` and puts the piece after it, and the reader draws the piece alone (an
  image, an emoji). `surface` is `editor` or `reader`, which is how a macro is a pill in one and its value in the other.
  A piece for one surface only is how a node is drawn on the other by its other fields (a rule line is `---` dimmed in
  the editor and `<hr>` in the reader).
- `only`: the one surface the rule applies on. On the other the node is drawn as if it had no rule. A table can't be
  drawn over the editor's lines, so the reader alone draws it as a table.

A piece whose content changes later keeps its own element up to date, as when a macro's value arrives. `drop` is called
when the piece is no longer drawn, as with list's `render`.

### Modules (editor)

- **`textEditor({ parent, text, edit, grammar, look, textClass, extensions })`** returns `{ view, stop }`. It is a
  CodeMirror view over the text.
  - **Edits.** Each change is handed to `edit` with an id, as it is made.
  - **Text from elsewhere.** The editor keeps the changes the text doesn't yet `include`. It shows an outside text with
    those changes mapped over it (`ChangeSet.map`, as `@codemirror/collab` rebases), so an echo of its own change, or
    someone else's, never undoes what was typed since.
  - **Looks.** Its content takes `textClass`, the same class the reader takes, so one set of styles applies to both.
    Nothing copies computed styles.
  - **App extensions.** `extensions` are the app's CodeMirror extensions (history, search, paste, its own keys, the
    overlays), wired by hand.
- **Decorations.** Elements, marks and pieces are built for `view.visibleRanges`. They're rebuilt when the text, the
  viewport or the tree changes. While an IME composes, they're only moved with the text (kept from cyoa), and rebuilt
  once it ends.
  - Decorations that change vertical layout can't come from a function of the view (`@codemirror/view`,
    `EditorView.decorations`): block wrappers, block widgets, and replaced ranges that cover a line break. These are a
    state field instead. It moves through each change, and is rebuilt only for the top-level blocks whose node changed
    type or extent.
- **`reader({ grammar, look, overlays, textClass })`** returns
  `{ element, show(text), positionAt(node, offset), stop }`. It walks the syntax tree into DOM, using the same Look as
  the editor.
  - **Drawing.** It draws elements, leaves marks out, and draws pieces. Text inside a block is drawn as written, with
    the editor's `white-space: pre-wrap`, so a single newline is a line break on both surfaces. Each text node is a run
    of the source. Inline elements are drawn over the ranges they cover, whichever tree they come from, and an element
    is split where it overlaps another without nesting.
  - **Space around marks.** The reader also leaves out the whitespace that only separates a mark from the text of its
    line (`# Title`, `> quote`), and the line break of a line holding nothing but marks (a code fence). Without that,
    `pre-wrap` would draw them.
  - **`show(text)`.** It reparses with the last tree's fragments, then redraws from the first top-level block that
    differs. A streamed reply therefore costs its last block per chunk.
  - **`positionAt`.** It gives the source position for a place in the reader's DOM. Every element knows the node it was
    drawn from.
- **Overlays.** In the editor, `overlays(list)` is an extension that draws overlay ranges as mark decorations over the
  visible part, asked for again when the text, the visible part or the overlay changes; an answer's positions are in the
  text as it was when asked, moved through the edits since. In the reader, they are spans around the text runs they
  cover, split at the elements they cross, asked for over the whole text at each `show`, and a later answer redraws from
  the first part it touches. Only the answer to the latest question is drawn. Overlays never change the tree or the
  text.
- **`suggestions(sources)`.** One completion mechanism over `@codemirror/autocomplete`, fed by Suggest values. An Option
  is `{ label, detail?, apply(view, from, to), info?() → later Element }`.
- **`toolbar({ view, tools, keyOf })`.** Buttons for a Watched list of Tools, in a space the field always reserves, so
  showing it never moves the field. Its state is `aria-pressed` (from `on`) and `aria-disabled` (from `applies`).
  - Each button's tooltip names its key from `keyOf(id)`, formatted with keybinds' `formatSteps`.
  - While keybinds' `modifierHeld` holds, `data-keys` shows every shortcut.
  - Which tools a person has is the app's: the list it passes and keeps.
- **`keyboardInset`.** A Watched over `visualViewport`: how much of the window the on-screen keyboard covers. The
  toolbar sits above it (from cyoa's `toolbar.ts`).
- **`selectionBar({ view, tools })`.** The tools beside the selection, in list's `popover`, anchored to the selection's
  rectangle.

Keys are the app's: it binds each Command with keybinds, as a Handler that runs it on the editor being written in. No
module here reads a key event.

### Modules (markdown)

- **`markdownGrammar(extensions)`** returns a Parser: lezer markdown, with the app's `MarkdownConfig`s added.
  - HTML blocks and tags are parsed by `@lezer/html` through `parseMixed`, and the tags of one paragraph are mounted as
    one overlay so their opening and closing tags pair into one element. Checked with `@lezer/markdown` 1 and
    `@lezer/html` 1: in `a <b>bold *x* y</b>`, `resolveInner` inside either tag gives `Element` 2–19, positions in the
    outer text, also when the element spans a line break. The overlay's `Element` covers markdown nodes it doesn't
    contain (`Emphasis` 10–13 is the paragraph's child), so both surfaces draw an HTML element as a wrapper over the
    range it covers, nesting the markdown inside it.
  - Without HTML (an app's "show tags as text"), the HTML nodes are removed (`remove: ['HTMLBlock', 'HTMLTag']`).
- **`markdownLook(html)`** returns the markdown Look.
  - Every mark node (`EmphasisMark`, `HeaderMark`, `Link/URL`, ...) is a `mark`.
  - Emphasis, strong, strikethrough and code are elements. Headings, quotes, lists, code blocks and tables are `block`.
  - Images are `beside` pieces.
  - HTML elements take their name and attributes from the tree, through
    `html(name, attributes, content) → { name, attributes, content } | none`. That is the app's policy (what's allowed,
    how classes and styles are rewritten). `none` draws the source as text.
- **Formatting state and commands** (cyoa's `format.ts`).
  - `hasStyle(state, style)` reads the syntax tree, so italics aren't mistaken for half of bold.
  - `toggleStyle(style)`. With nothing selected and no word at the cursor, it writes an empty pair to type into, and
    pressing it again with nothing typed takes the pair out. At the end of styled words it steps past the closing mark.
    This is the "switch for what's typed next" and its pressed state.
  - `heading`, `quote`, `list`, `codeBlock` and `link`, each a Command, with `on` where it has a state.

### What is SillyTavern's

- **Grammar extensions:**
  - macros;
  - emoji shortcodes;
  - dialogue quotes;
  - image sizes;
  - lines kept out of markdown (`markdown_escape_strings`);
  - reasoning markers in a body, drawn as text;
  - HTML blocks with a `markdown` attribute;
  - `encode_tags`, which removes the HTML nodes;
  - slash commands, in the chat box.

  Each comes with its Look entries.

- **Pieces:**
  - the macro pill, from `MacroValues`: "Filled in when sent", "sends nothing", a person's card on hover;
  - emoji;
  - images, which follow the external media setting.
- **The HTML policy:**
  - class prefixing;
  - styles limited to message text, with `@import` dropped;
  - external media;
  - `target=_blank rel=noopener`;
  - autoplay.
- **Overlays:**
  - lore marks, from the ranges activation reports in the text it read;
  - search matches;
  - code highlighting with highlight.js;
  - fade-in of streamed text.
- **Suggestions:** macros (`{{`), slash commands (`/`), mentions (`@`).
- **Its own commands:** showing macros as written, and the find-and-replace presets.
- **Find and replace:** the `@codemirror/search` panel, moved over unchanged.
- **Text ports and the rest:**
  - a message's stored text in the server's state, and each field's;
  - each person's toolbar choice;
  - image upload;
  - style pins.

### SillyTavern's surfaces on it

| Surface                                                                                                                                     | Drawn by                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| a chat message                                                                                                                              | `reader`, with the lore marks overlay; Edit opens `textEditor` over the same text, Look and class |
| a streamed reply                                                                                                                            | the same `reader`, `show` per chunk, with the fade-in overlay over what the chunk added           |
| reasoning                                                                                                                                   | `reader`, without lore marks                                                                      |
| the Alternatives list                                                                                                                       | `reader` per alternative, with the search-match overlay                                           |
| the bias line; an edit's Done and Cancel                                                                                                    | `reader`, over the stored text                                                                    |
| the chat box, card fields, greetings and other alternatives, worldbuilding text, prompt manager prompts, author's note, persona description | `textEditor`                                                                                      |

Some code goes:

- `marked` and `messageFormatting`;
- `live-editor/render.js`'s fragment rendering;
- `positions.js`'s guessing by matching words, replaced by `positionAt`;
- `mount.js`'s copying of computed styles, replaced by the one class.

The textarea proxy (`mount.js`) goes once nothing reads a textarea's `value` for a field's text.

### Unverified

- What rebuilding layout decorations by comparing top-level nodes costs on long texts. Not measured.

### Decided from editor.md

- **The palette and the right-click menu are interact modules.** editor.md puts commands and their surfaces in the core.
  The palette is a combobox (case 5) over the Tools; the right-click menu is a menu (case 4) over them. Neither reads
  keys: they are opened by Commands the app binds.
- **Edit keeps the reader's place.** A selection in the reader becomes the same source range in the editor, through
  `positionAt`; with none, the cursor goes to the end of the text, where a person continues writing.
- **Paste is the markdown package's.** Converting HTML to markdown is general markdown; the choice of what is pasted is
  its option.
- **No overtype.** editor.md: typing a mark changes nothing around it, and the cursor moves through marks as characters.
  `toggleStyle` stepping past a closing mark is a command, not typing.

- **An image takes its space before it loads** (no layout shift). An upload writes `=WxH` when it inserts the image, so
  its size is in the text. An image without a size is drawn in a box of fixed size and fitted inside it. editor.md's
  "the same space either way" is about the cursor being in the source or not, which the `beside` piece meets.

## SOLID check

S = one responsibility, O = new cases added modules only, L = substitutable, I = depends on no more than it uses, D =
owns what it uses.

| Module                                       | Uses (owns)                            | Implements              | S                              | O                           | L                                                | I                             | D            |
| -------------------------------------------- | -------------------------------------- | ----------------------- | ------------------------------ | --------------------------- | ------------------------------------------------ | ----------------------------- | ------------ |
| arrayList                                    | —                                      | Value, Drawn, held keys | the list's state               | split in case 8             | draws all                                        | each consumer takes one face  | owns nothing |
| arrayStep/Compare/Find/KeysAt/Locate/Reorder | Value of keys                          | one each                | one question                   | one module per question     | answers now, which a later answer may equally do | one shape each                | —            |
| move                                         | Value, Step, Set                       | `by`, `edge`            | moving                         | unchanged across 9 cases    | applies only its latest answer                   | three narrow shapes           | owns all     |
| render                                       | Drawn, Mount, Facet                    | ItemOf                  | elements for keys              | Mount extracted (case 6)    | never relies on which keys are drawn             | no selection, focus or layout | owns all     |
| flowMount, groupMount, rowMount              | —                                      | Mount                   | where an element goes          | new Mounts                  | render behaves alike                             | —                             | —            |
| mark, ids, reveal, place, posInSet           | Test / Watched / Rank, Place           | Facet                   | one attribute, style or scroll | new Facets                  | apply depends on no other facet                  | one shape each                | owns all     |
| activeDescendant                             | Watched, idOf                          | Facet                   | one attribute                  | field or list, by parameter | names only what render has applied it to         | —                             | owns all     |
| pick, hoverIntent                            | ItemOf, Set                            | —                       | pointer → key                  | —                           | —                                                | —                             | owns all     |
| rangeSelection                               | held keys, Compare                     | Test, toggle/extend/all | selected intervals             | —                           | any Compare                                      | —                             | owns all     |
| typeahead                                    | Find, Value, Set                       | `type`, Watched         | prefix → key                   | —                           | late answers dropped if superseded               | —                             | owns all     |
| cell, popover, focusWhen, dismiss, textValue | Watched / Set                          | Watched, Set            | one DOM behaviour each         | —                           | —                                                | —                             | owns all     |
| withHeaders                                  | Drawn                                  | Drawn                   | one transform                  | new Drawn                   | —                                                | —                             | owns all     |
| drag, gaps, edgeScroll                       | ItemOf, Gap, Reorder / ItemOf / Scroll | Gap                     | the gesture / gap / scrolling  | —                           | any Gap, any Drawn                               | —                             | owns all     |
| viewport, scaledViewport                     | —                                      | Watched range, Scroll   | the scroller                   | scaled added                | coarse px in scaled is within contract           | —                             | —            |
| rows, cards                                  | —                                      | RanksIn, Place, Extent  | one layout                     | cards added                 | sizes are never assumed                          | three faces                   | —            |
| visibleRanks, windowing                      | Watched, RanksIn / KeysAt, Locate      | Watched, Drawn, Rank    | what to draw                   | unchanged by cards          | any layout, any answer timing                    | —                             | owns all     |
| sizer                                        | Extent, Watched                        | —                       | scroll size                    | —                           | —                                                | —                             | owns all     |
| server modules                               | a transport function                   | Step, KeysAt, ...       | one question each              | —                           | late answers                                     | —                             | —            |

Each abstraction in the first table is owned by the modules listed there, implemented by those in this one, and is one
question (I); its implementations are listed above (L); none was widened after its first case, except the recorded
changes (O).

## Still open

- Nothing beyond the open items noted under each case.
