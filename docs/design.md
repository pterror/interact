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

| Abstraction | Shape                                                                       | Owned by                                                                                  |
| ----------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Value       | `() → T`                                                                    | move (`from`), typeahead (`from`)                                                         |
| Watched     | `get() → T`, `watch(fn) → stop`                                             | activeDescendant, popover, focusWhen, windowing, sizer, posInSet, viewFrom, stickToBottom |
| Set         | `(T) → void`                                                                | move (`to`), typeahead (`to`), pick (`to`), dismiss (`to`), hoverIntent (`to`)            |
| Step        | `step(k \| none, n) → later key \| none`                                    | move, adjacent, wrapStep                                                                  |
| Find        | `find(prefix, after: k \| none) → later key \| none`                        | typeahead                                                                                 |
| Drawn       | `keys() → Key[]`, `watch(fn)`                                               | render, adjacent, drag (`watch` only), slideMoved (`watch` only)                          |
| Mount       | `put(key, element, before: element \| none)`, `remove(element)`             | render                                                                                    |
| Facet       | `apply(key, element)`, `watch(fn(keys?))`, optional `drop(key, element)`    | render                                                                                    |
| ItemOf      | `itemOf(eventTarget) → {key, element} \| none`                              | pick, drag, gaps, leadingGaps, hoverIntent                                                |
| Test        | `has(key) → bool`, `watch(fn(keys?))`                                       | mark, slideMoved (`has` only)                                                             |
| KeysAt      | `keysAt(fromRank, toRank) → later Key[]`, `watch(fn)`                       | windowing                                                                                 |
| Locate      | `locate(key) → later rank \| none`                                          | windowing                                                                                 |
| Rank        | `rank(key) → rank \| none` (immediate), `watchRanks(fn)`                    | place, posInSet, makeRoom (`rank` only)                                                   |
| Compare     | `compare(a, b) → -1 \| 0 \| 1` (drawn or held keys only, immediate)         | rangeSelection                                                                            |
| RanksIn     | `ranksIn(fromPx, toPx, count) → [fromRank, toRank)`, `watch(fn)`            | visibleRanks                                                                              |
| Place       | `place(rank) → rect`, `watch(fn)`                                           | place                                                                                     |
| Extent      | `extent(count) → size`, `watch(fn)`                                         | sizer                                                                                     |
| Gap         | `gapAt(point, drag: {key, from}) → {target: key, after: bool} \| none`      | drag                                                                                      |
| Showing     | `showing(at: Dragging \| none, motion: {key, from, point, phase})`          | drag                                                                                      |
| Reorder     | `move(key, target: key, after: bool) → later bool`                          | drag                                                                                      |
| Scroll      | `scrollBy(px)`                                                              | edgeScroll, viewFrom, stickToBottom                                                       |
| Pages       | `read(from: cursor \| none, count) → later Page[]`, `watch(fn)`             | cursorPages                                                                               |
| Removal     | `{key, next: key \| none, previous: key \| none}`, one per removed key      | heldKeys                                                                                  |
| Adjacent    | `of(key) → {key: key \| none} \| not known` (immediate), `watch(fn(keys?))` | runs                                                                                      |
| Together    | `together(before, key) → bool` (immediate), `watch(fn(keys?))`              | runs                                                                                      |

`Step`: `step(none, 1)` is the first key, `step(none, -1)` the last; `step(k, n)` goes `n` keys on and stops at the
edge; `none` comes back only for an empty list. `Find` returns the first key after `after` (wrapping) whose text starts
with `prefix`, ignoring case. `Drawn` draws every key the list holds for others (below) and at least every visible key.
`Facet.watch` reports the keys whose facet changed, or nothing for "any". `render` mounts an element, then applies every
facet to it in one synchronous pass, and applies a facet again to the keys it reports. `Reorder` answers `true` once the
list is as the move left it and every listener to the list has heard, `false` if it won't move it; a failure counts as
`false`.

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

**Changed while building the antisocial network's menus:**

- A menu opened near the window's right edge overflowed it: `popover` placed its element against the anchor's box only.
  Fitting is part of placing, so `popover` now keeps a popover below or beside its anchor inside the window: one that
  would come within a margin **(P: 8 px)** of an edge it grows towards is flipped to the anchor's other side across,
  then along, then both, the first that fits, staying as first placed if none does. Against an HTML element in a browser
  with CSS Anchor Positioning, the popover is shown with the element as its `source` (its implicit anchor, taken by
  `position-anchor: auto`), and the browser places it, follows the anchor and flips it by
  `position-try-fallbacks: flip-block, flip-inline, flip-block flip-inline`; the margin is the popover's margin on the
  sides it grows towards, which the flips swap. Otherwise (a point, or no anchor positioning) `popover` measures the
  shown element's layout size (not its box, which an opening animation scales) and places and flips it the same way,
  again on scroll, resize and a change of the element's size. A centred popover is unchanged: whether it is kept inside
  the window is open (the backlog's keybinds decisions).
- `side: 'left'` puts the popover beside its anchor on the left, ending where the anchor starts, placed by `right` so
  its width is never needed: a block menu opening beside a handle at the left of its block.

## Case 5: a combobox

DOM focus stays in a text field; the list is a popover. Adds `textValue` (Watched and Set over a field's value). The
list's Drawn and Step implementations read the query (an in-memory `filtered` over `arrayList` and `textValue`, with its
own holds, or the server's). `activeDescendant` is given the field instead of the list. Keys are bound on the field and
must work while typing. On a new query the active key becomes the first result **(P)**; Enter writes the active item's
text into the field and closes the list **(P)**.

**As built** (keybinds' `palette`, below): `textValue({ field })` is the field's value as a Watched and a Set, heard on
`input` and on its own sets. `filtered({ list, query, matches })` keeps the keys of a list (`keys`, `watch`) that
`matches(key, query)` accepts, in the list's order, as an `arrayList` of its own, so its `hold` holds from the filtered
keys and a key the query leaves out moves inside the change, as a removed key does. Step is `arrayStep` over its keys.
Matching is the app's: the palette's default keeps a command when every word typed is in its label, ignoring case
**(P)**; ranking matches is not built.

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

**Runs** (found building the antisocial network's chat). A chat puts a message in the same run as the one before it when
the two belong together, by the app's measure (one author, within five minutes). A run has no header and no element of
its own. It isn't a group known from the key: whether a key continues a run depends on its neighbour, and that answer
may come late, or after the answer about a later key. `withHeaders` and `groupMount` take `groupOf(key)` and stay as
they are. Adds:

- `adjacent`: each key's neighbour on one side. Parameters: step (a Step, as `move` takes; `step(k, by)` answering `k`
  itself means `k` is at the edge), by (`-1`: the key before), changes (hearing the keys whose neighbour may have
  changed; none: any), drawn (a Drawn). Gives Adjacent: `of(key)`, not known until asked and answered, then `{key}`
  (none at the edge); `watch(fn(keys?))`, the keys whose neighbour became known or changed; and `stop()`. A key is asked
  about the first time it is wanted, and let go of once it is no longer drawn, as `windowing` lets go of its rank, so
  only what is drawn costs anything. Each key takes only the answer to its latest question; after a change it keeps its
  last answer until the new one comes, so nothing marked from it flickers while the list asks again. A failed question
  is asked again the next time the key is wanted.
- `runs`: a Test, whether a key continues the run of the key before it: its neighbour is known and the two belong
  together. Parameters: before (an Adjacent), together (`together(before, key)`, false while what it needs isn't known,
  and `watch(fn(keys?))`; a question about two keys, so not Test's `has`). A change `together` reports is heard as a
  change to any key, since it changes the answer for the key after too.

Wiring:
`mark({ test: runs({ before: adjacent({ step, by: -1, changes, drawn }), together }), attribute: 'data-run', on: 'continues' })`
**(P)**; the app styles a message that continues a run (no name, less space above). `together` is the app's, over its
items, and is heard when an item arrives. Over `cursorPages`, `step` is its Step and `changes` its `watch`; its Step
answers a key outside the run it holds with that key, so such a key starts a run until it is in the run again. When rank
0 is the newest message (a chat counted from the bottom, case 8), the message before is a rank later, so `by` is `1`.

A run stays an attribute, not an element: WAI-ARIA advises against a `group` without a name, and a run has none to give
(https://www.w3.org/TR/wai-aria-1.2/#group); `groupMount` couldn't place by run either, since a run's identity, its
first key, is known only from late answers.

## Case 7: drag to reorder

Adds `drag`: a press becomes a drag after the pointer moves a few pixels **(P: 4)**; it asks Gap where the pointer is,
hands the drag to `showing` (none when it ends), calls Reorder on release, and swallows the click that ends it.
Parameters: element, drawn, held, itemOf, gap, reorder, showing (`drawn` and `held` since the tab strip, below). Adds
`gaps` (Gap from the element under the pointer and `render`'s ItemOf: before or after that item by which half it is in,
along `y` for a list or `x` for cards), `edgeScroll` (scrolls while the pointer is near the scroller's top or bottom
during a drag; parameters: element, scrollBy, active), and `arrayReorder`. The drag is shown by marks over a `cell` that
`showing` sets: `data-dragging`, `data-drop-before`, `data-drop-after` **(P)**. Keyboard: Alt+arrow moves the active
item one place **(P)**.

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
dragged item (it answers "into itself", which changes nothing), so its drag stays shown. Closed by Motion, below.

**Found building a browser's tab strip:** the dragged tab follows the pointer, the tabs it passes move aside, it takes a
place as soon as its leading edge, in the direction it travels, enters the tab holding that place, and a dropped tab
slides from where it was let go into its new place. Gap and Showing lacked what that needs, and each was widened by an
argument the existing implementations ignore, so they behave as before; drag gained two parameters, below:

- **Gap** is asked `gap(point, drag)`, `drag` being `{key, from}` **(P)**: the dragged key and the point it was pressed
  at, the same record for every question of one drag and no other. A rule by the dragged item's edges needs which item
  is dragged, where it was grabbed and, from successive questions of one drag, which way it travels.
- **Showing** is called `showing(at, motion)`, `motion` being `{key, from, point, phase}` **(P)**: on every move, over
  the dragged item itself too (where `at` is none), with the phase `moving`; then once `dropped`, before Reorder is
  called, or once `cancelled`; then once `ended`. Drawing the item at the pointer needs the pointer while the drag is
  over itself; a settle needs to measure where the item was let go before the reorder, and to know when the list is as
  the reorder left it. `at` is none for the last three, as before; `showing` is now also called with an unchanged `at`,
  and twice with none at the end, which a `cell` ignores.

**Changed while building the tab strip** (every answer may be late, and the items may change under a drag):

- **When a drop ends.** `ended` came right after Reorder was called, so with a late Reorder the passed items were drawn
  back before the reorder moved them. Reorder now answers when its change is applied: `true` once the list is as the
  move left it and every listener to it has heard (so render has drawn it), `false` if it won't move, a failure counting
  as `false`, at once or later; `arrayReorder` and `groupReorder` answer so. A drop ends on that answer, a microtask
  later, so what heard the change has looked at it first (`slideMoved`, below). What `ended` shows is the list as it is,
  so `follow` and `makeRoom` slide from where things were let go to where they are laid out: into the new order, or back
  to the old one when the reorder is refused or fails. drag takes **Drawn** for its `watch`, to ask Gap again when the
  drawn keys change.
- **Items changing under a drag.** drag takes a **held key** of the list (`hold(undefined, 'none')`), which it sets to
  the dragged key while the drag lasts and to none when it ends. A list that draws its held keys keeps the dragged item
  drawn; when the list removes the key, the held key moves off it and the drag is cancelled. Any other change to the
  drawn keys asks Gap again, and `leadingGaps`, `follow` and `makeRoom` measure again, so the drag goes on with the
  dragged item still under the pointer. A list that never moves a held key (a plain `cell`) never cancels a drag.
- **Scrolling.** `follow` and `leadingGaps` take the dragged item to be where it was drawn when the drag began, moved as
  far as the pointer since; each question measures where it is laid out now. So a scroll, or items added or taken out
  before it, leaves it under the pointer, and the gaps go by where it is drawn.
- **A press it never heard released.** drag kept a press whose release it missed (one landing on another element), so a
  later move with no button down started a drag. A press now lasts only while its button is held: the pressed element
  captures the pointer at the press (the container takes it over once a drag starts, as the item's element may be taken
  out under it); a release anywhere in the page ends the press, dropping a drag; a cancel, the capture being lost, or a
  move with the button up lets it go, cancelling a drag.
- **Settling.** `follow` marks the dragged item `data-settling` **(P)** while it slides into place, so an app can raise
  it over its neighbours. Grabbing it mid-slide stops the slide, unmarks it, and drags it from where it is drawn.
- **Stopping.** `stop()` during a drag cancels and ends it, and during a drop waiting for its answer ends it; either way
  the held key is let go of, so nothing is left drawn as dragged.

drag and Reorder were already released (`list@0.1.0`), so the two required parameters and Reorder's answer break what
worked: a minor version while below 1.0, as keybinds' rebuild was.

Adds `leadingGaps` **(P)** beside `gaps`: a Gap for items in one row or column, by the dragged item's leading edge, as
above, the direction of travel turning only once the pointer comes back further than a few pixels **(P: 6)** from the
furthest point reached, so a smaller move back changes nothing. Items are measured where they are laid out (their rect
less their `translate`), so those drawn aside don't move the gaps; one place is the distance from the dragged item's
start to the next item's. Parameters: element (the items are its children, in order), itemOf, axis, turn. It answers the
dragged item itself while it holds its own place.

Adds two Facets that are also a Showing, as alternatives to the drop marks **(P)**:

- `follow`: the dragged item drawn by its `translate` where the pointer takes it, along one axis or both; once the drag
  ends, it slides from where it was let go to where it is laid out, dropped or cancelled alike, so a cancelled drag
  slides back to where it started, as an OS's drag and drop and a browser's tabs do on Escape; marked `data-settling`
  while it does. Parameters: axis, duration (ms; 0 jumps, which an app passes for reduced motion).
- `makeRoom`: the items between the dragged item's place and where it would land drawn one place towards the place it
  leaves, sliding there; kept where they are drawn through a drop or cancel until `ended`, then slid from there to where
  they are laid out (not at all, when the reorder put them where they were drawn). One place is measured when the drag
  begins and again when the dragged item's rank changes. Parameters: axis, rank (a Rank, `rank` only), duration.

Each gives `showing`, and `has(key)`: whether it draws that key's `translate` now (`follow` from the drag's first move
until its slide into place is over; `makeRoom` while the key is moved aside, held through a drop, or sliding). Between
them they own the items' `translate` (`follow` the dragged item's, `makeRoom` the others'), which is the geometry the
drag is. Every slide is one operation (`slide.js`), from where an element was drawn to where it rests, a Web Animation
of `translate` eased out; an element has one slide at a time, so one started, or a grab, stops another's. No stylesheet
transition is needed or wanted on `translate`. The app wires one `showing` that hands both the drag, and marks the
dragged item from `motion` (`data-dragging` while `moving`). `test/page-tabs.js` builds a tab strip from `drag`,
`leadingGaps`, `follow`, `makeRoom`, `mark`, `arrayReorder` and `render` alone.

`leadingGaps` measures only its element's children, so it is for items drawn in flow in one container; `leadingGaps`,
`follow` and `makeRoom` take `translate` to be the only transform the items have. `test/page-tabs.js` also drives a late
and a refused Reorder, a cancelled drag, a scroll and edits under a drag, and grabbing a settling tab.

**Found building the antisocial network's tab strip:** outside a drag, items still move: the keys move a tab, a tab
opens between others, one closes. A browser's strip slides the tabs that moved; here they jumped. Adds `slideMoved`, a
Facet for any list, beside `follow` and `makeRoom`: when the drawn keys change, each item drawn is slid from where it
was drawn to where it is laid out now, by the one slide, and it sets no style. A change during a slide slides on from
where the item is drawn. Places are where items are laid out in their parent (rect less `translate`, from the parent's
start, scrolled or not), kept at each change and again when the parent or an item is resized, so a resize alone slides
nothing. It looks once every listener to Drawn has heard (a microtask later), so render has drawn the change, whichever
order the listeners were added in. The items `leave` names are left alone: the app passes one `has` over `follow`'s and
`makeRoom`'s, so a drop is slid by them alone; a drop ends a microtask after the reorder's answer, so `slideMoved` has
looked at the reorder's change while they still draw it. It hears Drawn from when it is made until `stop()`, and reports
no keys. Parameters: drawn (Drawn's `watch`), duration (ms; 0 jumps), leave (a Test, `has` only). `test/page-tabs.js`
adds it to the strip, every drag case unchanged, and moves tabs outside a drag.

**Open, from `slideMoved`:** an item whose place changes without the drawn keys changing (an item above it grows) isn't
slid; places are measured in the item's parent, so items spread over several parents (`groupMount`) slide only within
one.

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

**Counted from the bottom** (found building the antisocial network's chat). A chat counts from the bottom: rank 0 is the
newest message, drawn lowest, and the list grows upwards. `place` set `top`, `topIn` measured an element's top, and
`viewFrom` counted the view down from a list's top.

**Changed while building:** each of the three takes the edge the list is counted from, as the review's pairings were
merged before ("Changed after review", Pairings), instead of a mirror-image module beside it:

- `place({ rank, layout, edge })`: with `edge: 'bottom'`, sets `bottom` from the layout's `y`, read as the distance from
  the container's bottom to the item's. The layouts (`rows`, `measuredRows`, ...) and `sizer` are unchanged; they count
  from rank 0's edge as before.
- `topIn(element, container, edge)`: with `'bottom'`, the element's bottom in its scroll container's content.
- `viewFrom({ visible, top, edge })`: with `edge: 'bottom'`, the view counted up from the list's bottom (`top` is then
  that bottom), and a Scroll whose positive amount scrolls up. `visibleRanks`, `windowing` and `keepInPlace` take it as
  they take `viewport`, so `keepInPlace` holds an item at its distance from the view's bottom.

Wiring: `viewFrom({ edge: 'bottom', visible: viewport(scroller), top: topIn(list, scroller, 'bottom') })`, and
`place({ edge: 'bottom', ... })`. `edgeScroll` keeps `viewport`'s Scroll, since it scrolls toward the edge the pointer
is near. Starting the view at the bottom is the app's (`scrollTop = scrollHeight` once).

A new message at rank 0 shows while the view is at the bottom, as chats do. `keepInPlace` holds what is on screen, so
alone it leaves a new message below the view. Adds `stickToBottom({ element, visible, scrollBy, layout, drawn })`: once
the view (counted from the bottom) is at the list's bottom, a change to the layout, the ranks or the view scrolls it
back there, two microtasks later, past what `keepInPlace` does for the same change. Whether the view is at the bottom is
decided when the scroller scrolls, heard in the document's capture phase before `viewport`'s listener (microtasks run
between listeners), so a person who scrolls up stays where they are until they scroll back down. `test/page-chat.js`
builds a windowed chat from `windowing`, `place`, `viewFrom`, `topIn`, `keepInPlace` and `stickToBottom`.

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

**Found while building the antisocial network's chat:** `cursorPages` gives no `hold`, so a removed message stayed
selected (a `cell`). It can't give one. Pages carries no removals, and it holds one run of pages: after a change, a key
missing from the run read again may be removed, or only moved past the run's end by items added before it, and it can't
tell which. The huge case already says where held keys come from on a server: its removals carry each removed key's
neighbours. Adds, beside `cursorPages`, which is unchanged:

- `heldKeys`: held keys moved by reported removals. No parameters. Gives `hold(initial, whenRemoved)` (a held key as
  above: Watched, Set and Test), `remove(removals)`, a Removal being a removed key with its neighbours before the edit
  (`{key, next, previous}`), and `add(keys)`, keys the list has again (a removal undone, an item put back under its
  key). A neighbour removed in the same edit is passed over, whatever order the removals come in. The app calls `remove`
  inside the edit, before it tells Pages' listeners, so no held key names a removed item when `windowing` asks again.

`arrayList` keeps its own holds, since it sees each edit whole. Wiring: `selected = holds.hold(none, none)`,
`active = holds.hold(none, next)`; `windowing`'s `keep` and `move`'s `from`/`to` take them as they take `arrayList`'s.

**Fixed after review:** `arrayList` holds only keys it has now: setting a held key to one it doesn't have leaves the
hold as it was, since such a key can only come from an answer made before its item was removed, and a key put back can
be held again. `heldKeys` refused every key it had ever removed, for its lifetime, so an item put back under its key
could never be held. Knowing no membership but what is reported, it now refuses the keys reported removed and not since
reported back (`add`), and takes every other key to be in the list. The removed keys are kept until added back, for the
holds' lifetime (see "Releasing a held key").

The server sends removals, each with its neighbours, as the huge case says; the antisocial network's server doesn't yet
(its `page` reads and its version say only that something changed), so nothing there calls `remove` until it does.

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
- Compositions: `keybinds(bindings, options)`, and the ready-made UI `cheatsheet`, `radialMenu`, `palette`,
  `contextMenu`, `settings`, each wiring exported pieces (`cheatsheetKeys`, `cheatsheetRow`, `cheatsheetTrigger`,
  `categoryHeaders`, `focusReturn`; `radialPlace`, a Place, and `radialStep`, a Step; `settingsKeys`, `settingsRow`,
  `settingsChip`, `settingsPrompt`, `settingsQuestion`, `settingsRecorder`, `conflictQuestion`,
  `rebindKeys`/`Mouse`/`Pad`/`Axes`) with list's render, groupMount, mark, move, pick, hoverIntent, popover, focusWhen
  and dismiss.

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

**The palette and the right-click menu** (from "Decided from editor.md"). Both show commands: a command is one
`keybinds()` binds (`run(event)`, `when`, its bindings), with an `id` and a `label` (the cheatsheet's Entry). An
editor's Tool becomes one in the app (`run: () => tool.run(view)`, `when: () => tool.applies?.(view.state) ?? true`).
Neither opens itself: the app binds a command that does (`palette.open.set(true)`, `menu.openAt(anchor, commands)`).

- `palette({ element, commands, matches?, label?, placeholder?, layout?, rest? })` is case 5: a field and a listbox in a
  manual popover centred on the viewport, its keys bound on the field with `typing` (Up, Down, Enter). It reads
  `commands()` each time it opens and keeps those whose `when` holds. Running closes it first, so focus is back where it
  was when the command runs, and passes `run` the press or click that chose it.
- `contextMenu({ element, label?, layout?, rest? })` is case 4 without submenus: `openAt(anchor, commands)` opens a menu
  below a point or an element, its keys bound on itself (Up, Down, Home, End, Enter, Space). A command whose `when`
  doesn't hold is shown `aria-disabled`, as in the radial menu.
- Each row is `cheatsheetRow` over the command: its label, and its bindings through `bindingParts`.
- **Changed while wiring SillyTavern:** a command's `when` is often about where focus is (the chat box, a message), and
  the palette and the menu hold focus while open, so a command chosen there didn't apply. Choosing one now closes the
  surface first, giving focus back, and then asks `when` and runs it; the menu shows `aria-disabled` from `when` as it
  opens, while focus is still where it was.
- **Changed for the right-click menu:** a `RightClick` binding ran, and the browser's menu opened over it. `mouseListen`
  now cancels the `contextmenu` of a right press a handler took, heard on the window until the next press, since it goes
  to what is under the pointer by then, which can be the menu the press opened there.
- Not built: typeahead in the menu (case 3 would add it), submenus, ranking the palette's matches, and opening the menu
  from a long press on a touch screen (no `RightClick` there).

UX **(P)**: the palette's and the menu's moves wrap at the ends; the pointer resting 100 ms makes a command active; the
palette's default texts ("Commands", "Type a command") and the menu's label ("Actions"); the radial menu's radius 100 px
and slot 64 px; the cheatsheet opens after its modifier is held 1000 ms; recording takes the steps so far after a 1000
ms pause; the settings panel shows a Release switch only on a binding that is a release (it turns it back into a press),
and recording a release is a switch in the prompt; the panel's texts ("Press a key...", "+ Key", "Reset", "Reset all",
"Already bound to …", "Replace", "Cancel").

## Editor (`packages/editor`, `packages/markdown`)

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

| Package                      | Holds                                                                                                                                                                        | Depends on (all peers)                                                                                                                                                                                               |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@pterror/interact-editor`   | the text and its port, the look table, the editor's decorations, the reader, pieces, overlays, suggestions, the toolbar and the selection bar                                | `@lezer/common`; `@codemirror/state`, `view`, `language` and `autocomplete`, optional, since the reader's modules import only `@lezer/common`; `@pterror/interact-list` (`popover`, `move`, `arrayStep`, `wrapStep`) |
| `@pterror/interact-markdown` | a markdown grammar (lezer markdown with tables, task lists, strikethrough, autolinks, and HTML parsed by an HTML grammar), its look table, its formatting state and commands | `@pterror/interact-editor`, `@lezer/markdown`, `@lezer/html`, and the editor's CodeMirror peers                                                                                                                      |

- **Nothing is bundled.** Each behaviour is its own piece the app composes: the editor is a view over a text port, and
  the grammar's language, the Look's decorations, the text class, keys, key hints, overlays, suggestions, paste and
  overtype are extensions or modules beside it. A grammar is composed from lezer's own pieces (`GFM`) and
  `htmlInMarkdown`; a Look from `markdownLook`, `gfmLook` and `htmlLook` to match.
- **The editor knows no markdown.** The grammar is passed in. cyoa draws markdown and wikitext with one look module, so
  a second grammar is a package beside `markdown`, and `editor` doesn't change for it.
- **Everything is a peer.** CodeMirror stops working when a page loads two copies of `@codemirror/state`: an extension
  from the other copy is "unrecognized". A `workspace:^` dependency between interact packages also blocks pnpm git
  dependencies, which is how SillyTavern installs interact. The release rewrites peer ranges as well
  (`scripts/release.js`, `DEPENDENCY_FIELDS`).

### Abstractions

| Abstraction | Shape                                                                                                   | Owned by              |
| ----------- | ------------------------------------------------------------------------------------------------------- | --------------------- |
| Text        | `get() → { text, includes: changeId \| none }`, `watch(fn)`; `includes` is the latest edit the text has | textEditor, segments  |
| Edit        | `(change: { from, to, insert }[], id: changeId) → void`, positions in the text before the edit          | textEditor            |
| SegmentEdit | `(key, change: { from, to, insert }[], id: changeId) → void`, positions in the segment's text           | segments              |
| Segments    | `of(state) → { key, from, to }[]`, in order                                                             | segmentGaps           |
| Made        | `made(transaction) → { key, from: key \| none }[]`, split off `from`, or laid in from elsewhere         | segmentData           |
| Grammar     | a lezer `Parser`                                                                                        | textEditor, reader    |
| Look        | `{ [selector]: Rule \| (node, read) → Rule \| none }`; a selector is a node name or `Parent/Name`       | textEditor, reader    |
| Piece       | `same(other) → bool`, `draw() → Element`, optional `drop(element)`                                      | textEditor, reader    |
| Overlay     | `ranges(from, to, { read, tree }) → later { from, to, class, attributes? }[]`, `watch(fn(range?))`      | textEditor, reader    |
| Suggest     | `(read, pos, explicit) → later { from, to, options: Option[] } \| none`                                 | suggestions           |
| Command     | CodeMirror's `(view) → bool`                                                                            | toolbar, selectionBar |
| Tool        | `{ id, label, icon?() → Element, run: Command, on?(state) → bool, applies?(state) → bool }`             | toolbar, selectionBar |

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

- **`textEditor({ parent, text, edit, extensions })`** returns `{ view, stop, unincluded, rebase }`. It is a CodeMirror
  view over the text, and the text port; everything else is composed in through `extensions`.
  - **Edits.** Each change is handed to `edit` with an id, as it is made.
  - **Text from elsewhere.** The editor keeps the changes the text doesn't yet `include`. It shows an outside text with
    those changes mapped over it (`ChangeSet.map`, as `@codemirror/collab` rebases), so an echo of its own change, or
    someone else's, never undoes what was typed since.
  - **Saving what isn't included.** `unincluded()` gives the edits the text doesn't include yet, composed into one
    change over the text they were last rebased onto, so an app can save them with what they were written over.
    `rebase(text)` takes another text as the one elsewhere while the editor keeps what it shows: the difference becomes
    one edit not yet included, as when what is being written moves to another text it belongs to.
  - **Looks.** The app gives its content the class the reader takes (`EditorView.contentAttributes`), so one set of
    styles applies to both. Nothing copies computed styles.
  - **What the app composes in.** `grammarLanguage(grammar)` (the grammar as CodeMirror's language),
    `lookDecorations(look)` (the Look drawn), and its own extensions (history, search, paste, keys, overlays).
- **`segments({ parent, initial, key, text, edit, extensions })`** returns
  `{ view, stop, of, split, made, inverse, insert, remove, move, reorder }`: one editor over many texts that live apart
  (a page's blocks, a thread's messages, a table's cells), as one document. It makes its editor as `textEditor` does,
  with its tooltips in the top layer.
  - **The document** is the texts in order with one line break between two. Each segment has an opaque key, of the app's
    key type: the app gives the keys it starts with (`initial`), and `key()` makes one for each segment a split makes.
    `of(state)` gives the segments in order with where each text is.
  - **Each text through its own port.** Each segment's text lives elsewhere, as `textEditor`'s one text does:
    `text(key)` is its Text, asked once when the segment comes in (a split's is the app's text for a new segment, empty
    until it is saved), and `edit(key, changes, id)` hears each edit to it, positions in its own text, with an id its
    Text says it includes once it does. A text heard from elsewhere is laid into its segment with the edits it doesn't
    include yet rebased over it, by the rebasing `textEditor` does, so an echo of an earlier edit, or someone else's,
    never undoes what was typed since. An edit is handed on as the changes that fell inside the segment when they did,
    and otherwise (a split, a join) as one replacement of what differs.
  - **Tracked through every change.** The line break before each segment is mapped through each transaction. Deleting it
    joins the segment into the one before. A line break typed any other way (Shift+Enter, paste) is text inside a
    segment. `split`, a command the app binds (to Enter, with keybinds), splits at the cursor; at the start of a
    non-empty segment the new, empty one goes before it, so the text keeps its key, as block editors do.
    `made(transaction)` gives the segments a transaction made: split off which, or laid in from elsewhere.
  - **Undo.** A join keeps the segment it took out, mapped through later changes. An undo or redo that puts a line break
    back where a joined segment's was brings that segment back with its key; it reads only the transaction's
    `undo`/`redo` user event.
  - **From elsewhere.** `insert(after, key)`, `remove(key)` and `move(key, target, after)` lay in a segment laid in,
    taken out or moved elsewhere. Each, and each text laid in from a port, is a transaction `fromElsewhere(tr)` tells
    apart and that history doesn't record, so the app's own listener doesn't send it back, and undo never undoes someone
    else's change. The selection is mapped through them, so the cursor stays where it was in what was typed; a selection
    in a moved segment goes with it. `fromElsewhere` is one annotation, shared by `textEditor`, `segments` and
    `segmentData`.
  - **The person's move.** `reorder(key, target, after)` is a Reorder (case 7), for `drag`: it moves a segment as `move`
    does, as the person's change (user event `move`), answering whether both keys are segments once it is applied. Undo
    undoes it, as block editors (Notion, Google Docs) undo a block moved: `inverse(transaction)` gives the effects that
    put the order back, for the app's history (`invertedEffects.of(inverse)` with CodeMirror's).
  - **Hooks.** Each segment's first line carries `data-segment` (`empty` when it has no text), for the app to style a
    block's spacing or its placeholder.
  - Not here: where a segment's text is saved, and the order, which the app saves from `of`.
  - **Changed while building the antisocial network's block handles:** an order changed elsewhere could only be laid in
    as a `remove` and an `insert`, two transactions that lose the cursor of someone writing in the moved block. `move`
    was added.
  - **Fixed after review:** `segments` dispatched on an `EditorView` the app made, with an annotation of its own, so
    `textEditor` and what is composed with it couldn't tell its transactions apart, and each app rebased each segment's
    text by hand. It now makes its editor and takes a port per segment, and `fromElsewhere` is shared. Enter was bound
    inside its extension, where no module binds a key; `split` is now a command only. Its keys were `+1`, `+2`, ... in
    the app's key space; they are the app's `key()`. A move by the person wasn't undone; it is `reorder`.
- **`segmentData({ made, initial, splitOff })`** returns `{ extension, get, change, put, inverse, changed }`: a value
  kept with each segment of `segments` by its key (a block's type, whether a to-do is done), for what lives beside a
  text and isn't text.
  - **It goes with its segment.** Values are by key, so a moved segment keeps its own, a segment joined into another
    keeps it while undo may bring it back, and a segment laid in from elsewhere has none until `put` gives its key one.
  - **Split.** A segment split off another starts with `splitOff(value)` of the other's (a heading's next block is text,
    a to-do's another to-do), before or after it. Which segments a transaction split off which is `segments`' `made`;
    nothing of `segments` beyond it is read.
  - **Changing one.** `change(key, value)` is an effect for the app's own transaction, so turning a block's type and
    taking its markdown off are one change. `put(view, key, value)` is a change from elsewhere that history doesn't
    record. `changed(transaction)` names the keys whose values a transaction changed other than by `put` (a change or a
    split), for the app to save.
  - **Undo.** The module depends on no history. `inverse(transaction)` gives the effects that put back what a
    transaction's changes replaced, for the app's history (`invertedEffects.of(inverse)` with CodeMirror's).
  - Not here: drawing. The app decorates each segment's lines from `of` and `get` (a heading's size, a checkbox, a
    number), as it styles `data-segment`.
  - **Added while building the antisocial network's typed blocks:** a block's type had been markdown in its text; kept
    beside the text, it must survive Enter, joins, undo and moves, which only something that sees each transaction can
    keep.
  - **Fixed after review:** it found a split from where a transaction put a new line break, so a segment laid in from
    elsewhere next to a heading took the heading's value as if split off it. `segments` now reports what it made.
- **`segmentGaps({ view, of })`**: a Gap (list's, case 7) over the segments of one editor, for `drag`. The segment drawn
  at the point's height is the target, before or after it by which half of its lines the point is in; above the first is
  before it, below the last after it. Heights are the editor's own (`lineBlockAt`), so segments outside the drawn part
  answer by CodeMirror's estimate. list's `gaps` can't serve: it asks which element the point is over, and a segment is
  lines of the editor, which no element of its own stands for and which the editor redraws as it likes. `drag` itself
  needs no change: its `itemOf` is the app's (the handle beside the hovered segment), its Drawn is the segments' keys
  heard through `viewUpdates`, its Reorder is `segments`' `reorder`, and `showing` draws a drop line.
- **Decorations.** Elements, marks and pieces are built for `view.visibleRanges`. They're rebuilt when the text, the
  viewport or the tree changes, and from scratch when the app dispatches `lookChanged`: what the Look draws changed with
  the text unchanged (a macro's value arrived, macros shown as written). While an IME composes, they're only moved with
  the text (kept from cyoa), and rebuilt once it ends.
  - Decorations that change vertical layout can't come from a function of the view (`@codemirror/view`,
    `EditorView.decorations`): block wrappers, block widgets, and replaced ranges that cover a line break. These are a
    state field instead. It moves through each change, and is rebuilt only for the top-level blocks whose node changed
    type or extent. A block wrapper wraps the lines starting in its range, so it starts where its node's line starts: a
    block nested on its parent's line (`> > quote`) starts after the line.
- **`reader({ grammar, look, overlays, textClass })`** returns
  `{ element, show(text), positionAt(node, offset), stop }`. It walks the syntax tree into DOM, using the same Look as
  the editor.
  - **Drawing.** It draws elements, leaves marks out, and draws pieces. Text inside a block is drawn as written, with
    the editor's `white-space: pre-wrap`, so a single newline is a line break on both surfaces. Each text node is a run
    of the source. Inline elements are drawn over the ranges they cover, whichever tree they come from, and an element
    is split where it overlaps another without nesting. An element whose content is all marks or nothing (an icon's
    `<i></i>`, an empty `<div>`) is still drawn, empty. An `<svg>` and what is in it are drawn in the SVG namespace,
    with the mixed-case element and attribute names the HTML standard restores (`viewBox`, `linearGradient`), since the
    HTML grammar hands them over lowercased.
  - **Space around marks.** The reader also leaves out the whitespace that only separates a mark from the text of its
    line (`# Title`, `> quote`), the whitespace between two marks of one node (a link's address and its title), the line
    break of a line holding nothing but marks (a code fence), and the whitespace at the ends of a run between blocks.
    Without that, `pre-wrap` would draw them.
  - **`show(text)`.** It reparses with the last tree's fragments, then redraws from the first top-level block that
    differs. A streamed reply therefore costs its last block per chunk.
  - **`positionAt`.** It gives the source position for a place in the reader's DOM. Every element knows the node it was
    drawn from.
- **Overlays.** An overlay is asked with the text's source and syntax tree as they were when it was asked, since some
  overlays are found from the tree (code highlighting needs each code block's language and content). In the editor,
  `overlays(list)` is an extension that draws overlay ranges as mark decorations over the visible part, asked for again
  when the text, the visible part or the overlay changes; an answer's positions are in the text as it was when asked,
  moved through the edits since. In the reader, they are spans around the text runs they cover, split at the elements
  they cross, asked for over the whole text at each `show`, and a later answer redraws from the first part it touches.
  Only the answer to the latest question is drawn. Overlays never change the tree or the text.
- **`suggestions(sources)`.** One completion mechanism over `@codemirror/autocomplete`, fed by Suggest values. An Option
  is `{ label, detail?, apply(view, from, to), info?() → later Element, section?, icon?() → Element }`. Options a label
  matches equally well keep their answer's order; options with a `section` are shown together under it, sections in the
  order they first come in the answer; `icon` is drawn where CodeMirror draws its own.
  - **Changed while building a block menu (Notion's "/")**: CodeMirror broke ties by label, so a menu's order (Text,
    Heading 1, Heading 2, ...) came out alphabetical, and an Option had no way to carry a group or an icon. `section`
    and `icon` were added, both optional, and ties keep the source's order, which mentions and emoji (most relevant
    first) want too.
- **`toolbar({ view, tools })`.** Buttons for a Watched list of Tools, in a space the field always reserves, so showing
  it never moves the field. Its state is `aria-pressed` (from `on`) and `aria-disabled` (from `applies`). A press keeps
  the editor's selection and focus. It gives its buttons as a Watched, for what is composed onto them. Which tools a
  person has is the app's: the list it passes and keeps.
- **`keyHints({ buttons, keyOf, held })`.** Composed onto any tool buttons (the toolbar's, the selection bar's): each
  button's tooltip names its key from `keyOf(id)`, the key as shown, which the app makes with keybinds' `formatSteps`,
  so the editor imports nothing from keybinds. While `held` holds (keybinds' `modifierHeld`, a Watched boolean), each
  button with a key shows it in `data-keys`.
- **`toolbarKeys({ element, buttons, orientation })`** returns `{ by, edge, stop }`. Composed onto any tool buttons (the
  toolbar's, the selection bar's): the moves of the WAI-ARIA Authoring Practices' toolbar
  (https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/). The toolbar is one stop in the Tab order (a roving tabindex: the
  button last focused, else the first, has 0 and the rest -1). `by(n)` focuses the button `n` on from that one, wrapping
  at the ends **(P)**, and `edge(n)` the button `n` from an end: list's `move` over `arrayStep` of the buttons, wrapped
  by `wrapStep`. A button whose tool doesn't apply is moved to like the rest (`aria-disabled`, still focusable), as the
  Practices have it. It reads no key: the app binds the arrow keys along `orientation` (`horizontal` by default, set as
  `aria-orientation`) to `by(±1)`, and Home and End to `edge(±1)`, with keybinds on the toolbar's element. It follows
  the buttons as they are drawn again; stopped, it leaves every button in the Tab order.
  - **Added for the antisocial-network prototype's accessibility pass**: `toolbar` gives `role=toolbar`, which says
    these moves work, and nothing gave them, so Tab went through every button.
  - **Fixed after review:** it read the arrow keys, Home and End itself; now the app binds them.
- **`keyboardInset({ window })`.** A Watched over `visualViewport`: how much of the window the on-screen keyboard
  covers. The app places the toolbar above it (from cyoa's `toolbar.ts`).
- **`selectionBar({ view, tools })`.** The tools beside the selection, in list's `popover`, anchored to the selection's
  rectangle, shown while text is selected and the editor has focus. Its element goes inside the editor's, and it gives
  whether it is shown, and its buttons, as Watched values.
- **`topLayerTooltips()`.** Every tooltip CodeMirror shows in an editor (suggestions, hover tooltips, any an app adds
  through `showTooltip`) is drawn in one `manual` popover, open while the editor shows any, whose source is the editor:
  nothing around the editor clips a tooltip or paints over it, and what overlays the page learns of a tooltip from the
  popover's `toggle` events. The popover is an empty box at the window's top left corner, given to CodeMirror as its
  tooltips' `parent`, so CodeMirror places them against the window, `fixed` or (Safari, iOS) `absolute`, as it would
  without it. It is inside the editor's element, so tooltips inherit from the editor and match the selectors they did.
  `textEditor` always composes it in, since a tooltip outside the top layer is what an app has to remember to avoid.
- **`viewUpdates(view, fn)`.** Hears every update of an editor made elsewhere, until stopped: how the toolbar and the
  selection bar follow the state.

Keys are the app's: it binds each Command with keybinds, as a Handler that runs it on the editor being written in. No
module here reads a key event.

### Modules (markdown)

- **`htmlInMarkdown`**, a `MarkdownConfig` the app composes into its grammar
  (`parser.configure([GFM, htmlInMarkdown, ...its own])`).
  - HTML blocks and tags are parsed by `@lezer/html` through `parseMixed`. The tags of one leaf block (a paragraph, a
    heading, a table) are mounted as one overlay so their opening and closing tags pair into one element; an HTML block
    is an overlay over its own range, so the `HTMLBlock` node stays in the tree beside its elements. So is a block that
    starts with a comment (`CommentBlock`), whose last line can hold HTML after the comment. Checked with
    `@lezer/markdown` 1 and `@lezer/html` 1: in `a <b>bold *x* y</b>`, `resolveInner` inside either tag gives `Element`
    2–19, positions in the outer text, also when the element spans a line break. The overlay's `Element` covers markdown
    nodes it doesn't contain (`Emphasis` 10–13 is the paragraph's child), so both surfaces draw an HTML element as a
    wrapper over the range it covers, nesting the markdown inside it.
  - Without it (an app's "show tags as text"), nothing is mounted on the HTML nodes, and with no rule for them their
    source is drawn as text.
- **`markdownLook(html)`, `gfmLook(html)`, `htmlLook(html)`** return the Looks of CommonMark, of GFM's syntax and of
  HTML inside markdown, which the app composes to match its grammar.
  - Every mark node (`EmphasisMark`, `HeaderMark`, `Link/URL`, ...) is a `mark`.
  - Emphasis, strong, strikethrough, code and links are elements. Headings, quotes, lists and code blocks are `block`.
    Tables are `block`s for the reader `only`. A code block carries its language in `data-language`.
  - Images are `beside` pieces, with `data-unsized` when the text gives no size.
  - Reference links and images (`[text][label]`, `[text][]`, `[text]`) point where their definition does; one that
    nothing defines is drawn as written. `definitionOf(node, read)` gives the definition, for an app's own fields on it
    (an image size).
  - A rule line, an escape, an entity, a hard break and a task's box are pieces for the reader only: what they stand for
    in the reader, and their source, dimmed, in the editor.
  - Every element with attributes from the text (an HTML element, a link, an image, a task's box) goes through
    `html(name, attributes, content) → { name, attributes, content } | none`. That is the app's policy (what's allowed,
    how classes and styles are rewritten). `none` draws the source as text. `content` is the text of an element whose
    content is raw text (`style`, `script`, `textarea`, `title`), which the reader draws as a piece.
  - The editor can't put a block element inside a line, so it draws only phrasing HTML elements (`b`, `span`, ...) and
    leaves the rest to the reader. A void element (`br`, `img`) is a piece for the reader. A close tag that closes
    nothing is hidden, as browsers ignore it.
- **Formatting state and commands** (cyoa's `format.ts`).
  - `hasStyle(state, style)` reads the syntax tree, so italics aren't mistaken for half of bold.
  - `toggleStyle(style)`. With nothing selected and no word at the cursor, it writes an empty pair to type into, and
    pressing it again with nothing typed takes the pair out. At the end of styled words it steps past the closing mark.
    This is the "switch for what's typed next" and its pressed state.
  - Styles are bold, italic, strikethrough, code and underline. Underline is `<u>`, found by walking the overlay its
    tags are in, since a position between the tags isn't in it.
  - `heading`, `quote`, `list`, `codeBlock` and `link`, each a Command, with `on` where it has a state: `inHeading`,
    `inQuote`, `inList`, `inCodeBlock`, `inLink`.
- **Paste.** `htmlToMarkdown(html, shows)` turns each block of HTML into markdown, and keeps as HTML a block whose
  markdown `shows` other visible text (`shows` draws markdown, with the reader). `markdownPaste({ choose, shows })`
  pastes HTML as `choose({ markdown, html, plain })` picks, the markdown by default. Offering the other texts after a
  paste is the app's.

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
  The palette is a combobox (case 5) over the commands; the right-click menu is a menu (case 4) over them. Neither reads
  keys to open: they are opened by commands the app binds. Built as keybinds' `palette` and `contextMenu` (Keybinds,
  above), with list's `textValue` and `filtered`.
- **Edit keeps the reader's place.** A selection in the reader becomes the same source range in the editor, through
  `positionAt`; with none, the cursor goes to the end of the text, where a person continues writing.
- **Paste is the markdown package's.** Converting HTML to markdown is general markdown; the choice of what is pasted is
  its option.
- **Overtype is its own extension.** `overtype()` (cyoa's): typing the character that is already next, where it closes a
  mark, steps over it, and a phone keyboard's "word replaced by the word and one more character" is that keystroke. An
  app composes it in or leaves it out; nothing else carries it as an option. `toggleStyle` stepping past a closing mark
  is separate and stays.
- **An image takes its space before it loads** (no layout shift). An upload writes `=WxH` when it inserts the image, so
  its size is in the text. An image without a size is drawn in a box of fixed size and fitted inside it. editor.md's
  "the same space either way" is about the cursor being in the source or not, which the `beside` piece meets.

## SOLID check

S = one responsibility, O = new cases added modules only, L = substitutable, I = depends on no more than it uses, D =
owns what it uses.

| Module                                       | Uses (owns)                                                       | Implements                   | S                              | O                                           | L                                                | I                                           | D            |
| -------------------------------------------- | ----------------------------------------------------------------- | ---------------------------- | ------------------------------ | ------------------------------------------- | ------------------------------------------------ | ------------------------------------------- | ------------ |
| arrayList                                    | —                                                                 | Value, Drawn, held keys      | the list's state               | split in case 8                             | draws all                                        | each consumer takes one face                | owns nothing |
| heldKeys                                     | Removal                                                           | held keys                    | holds over reported removals   | beside cursorPages, unchanged               | moves holds inside the edit, as arrayList does   | removals and additions only, no list        | owns all     |
| arrayStep/Compare/Find/KeysAt/Locate/Reorder | Value of keys                                                     | one each                     | one question                   | one module per question                     | answers now, which a later answer may equally do | one shape each                              | —            |
| move                                         | Value, Step, Set                                                  | `by`, `edge`                 | moving                         | unchanged across 9 cases                    | applies only its latest answer                   | three narrow shapes                         | owns all     |
| wrapStep                                     | Step                                                              | Step                         | wrapping                       | a Step over a Step                          | any Step                                         | one shape                                   | owns all     |
| render                                       | Drawn, Mount, Facet                                               | ItemOf                       | elements for keys              | Mount extracted (case 6)                    | never relies on which keys are drawn             | no selection, focus or layout               | owns all     |
| flowMount, groupMount, rowMount              | —                                                                 | Mount                        | where an element goes          | new Mounts                                  | render behaves alike                             | —                                           | —            |
| mark, ids, reveal, place, posInSet           | Test / Watched / Rank, Place                                      | Facet                        | one attribute, style or scroll | new Facets                                  | apply depends on no other facet                  | one shape each                              | owns all     |
| activeDescendant                             | Watched, idOf                                                     | Facet                        | one attribute                  | field or list, by parameter                 | names only what render has applied it to         | —                                           | owns all     |
| pick, hoverIntent                            | ItemOf, Set                                                       | —                            | pointer → key                  | —                                           | —                                                | —                                           | owns all     |
| rangeSelection                               | held keys, Compare                                                | Test, toggle/extend/all      | selected intervals             | —                                           | any Compare                                      | —                                           | owns all     |
| typeahead                                    | Find, Value, Set                                                  | `type`, Watched              | prefix → key                   | —                                           | late answers dropped if superseded               | —                                           | owns all     |
| cell, popover, focusWhen, dismiss, textValue | Watched / Set                                                     | Watched, Set                 | one DOM behaviour each         | popover fits by its own placing             | —                                                | —                                           | owns all     |
| filtered                                     | keys and watch, Watched query                                     | Drawn, Value, held keys      | the keys a query keeps         | beside arrayList, unchanged                 | any list, any query                              | `keys` and `watch` only, of the list        | owns all     |
| withHeaders                                  | Drawn                                                             | Drawn                        | one transform                  | new Drawn                                   | —                                                | —                                           | owns all     |
| adjacent                                     | Step, changes, Drawn                                              | Adjacent                     | one neighbour per drawn key    | added for runs                              | applies only each key's latest answer            | one Step direction                          | owns all     |
| runs                                         | Adjacent, Together                                                | Test                         | one predicate over pairs       | new Test; withHeaders, groupMount unchanged | any answer timing                                | no items, no layout                         | owns all     |
| drag, gaps, edgeScroll                       | ItemOf, Gap, Reorder, Showing, Drawn, held keys / ItemOf / Scroll | Gap                          | the gesture / gap / scrolling  | Gap and Showing widened (tab strip)         | any Gap, any Drawn                               | —                                           | owns all     |
| leadingGaps                                  | ItemOf                                                            | Gap                          | the gap by the leading edge    | beside gaps, unchanged                      | any Gap's answer: a key and a side               | the drag's key and press only               | owns all     |
| follow, makeRoom                             | Showing / Showing, Rank                                           | Facet, Showing, Test (`has`) | one `translate` each           | beside the drop marks, which are unchanged  | apply depends on no other facet                  | `rank` only, of Rank                        | owns all     |
| slideMoved                                   | Drawn, Test                                                       | Facet                        | one `translate` slide          | beside follow and makeRoom, unchanged       | any Drawn; leaves what it is told to             | `watch` only, of Drawn; `has` only, of Test | owns all     |
| viewport, scaledViewport                     | —                                                                 | Watched range, Scroll        | the scroller                   | scaled added                                | coarse px in scaled is within contract           | —                                           | —            |
| rows, cards                                  | —                                                                 | RanksIn, Place, Extent       | one layout                     | cards added                                 | sizes are never assumed                          | three faces                                 | —            |
| visibleRanks, windowing                      | Watched, RanksIn / KeysAt, Locate                                 | Watched, Drawn, Rank         | what to draw                   | unchanged by cards                          | any layout, any answer timing                    | —                                           | owns all     |
| sizer                                        | Extent, Watched                                                   | —                            | scroll size                    | —                                           | —                                                | —                                           | owns all     |
| stickToBottom                                | Watched range, Scroll, Watched                                    | —                            | one view kept at the bottom    | beside keepInPlace, unchanged               | taken wherever viewport is                       | `watch` only, of the layout and ranks       | owns all     |
| server modules                               | a transport function                                              | Step, KeysAt, ...            | one question each              | —                                           | late answers                                     | —                                           | —            |

Each abstraction in the first table is owned by the modules listed there, implemented by those in this one, and is one
question (I); its implementations are listed above (L); none was widened after its first case, except the recorded
changes (O).

## Still open

- Nothing beyond the open items noted under each case.
