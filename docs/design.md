# Design

Every name and every UX choice here is a proposal for the owner, not decided. Proposals are marked **(P)**.

## Rules this follows

- A module does one thing. A feature is a new module; no existing module changes for it.
- A module states the narrow shapes it uses (its abstractions) and owns them. Implementations conform. Two modules
  that use the same shape each declare it; they coincide structurally, and nothing shared is imported.
- A parameter is a value of an abstraction the module owns (a function, or a small record of functions), never a
  module. The app makes each module, takes the values it needs from one and hands them to another, by hand. No
  registry, container, event bus or plugin list.
- Every answer about the items may be late (it may come from a server). No module relies on when an answer
  arrives, on answers arriving in order (a module applies only the answer to its latest question), on how big
  anything is, or on which elements exist at a given moment.
- Keys are opaque item identities. Nothing reads their contents.

## Abstractions

Each is owned by the module(s) named, which declare it.

| Abstraction | Shape | Owned by |
|---|---|---|
| Value | `get() → T` | move (`from`), typeahead (`from`) |
| Watched | `get() → T`, `watch(fn) → stop` | popover, windowing (`visible`, `count`), sizer, posInSet |
| Set | `set(T)` | move (`to`), typeahead (`to`), pick (`to`) |
| Step | `step(k \| none, n) → later key \| none` | move |
| Find | `find(prefix, after: k \| none) → later key \| none` | typeahead |
| Drawn | `keys() → Key[]`, `watch(fn)` | render |
| Mount | `put(element, before: element \| none)`, `remove(element)` | render |
| Facet | `apply(key, element)`, `watch(fn(key \| all))` | render |
| KeyOf | `keyOf(eventTarget) → key \| none` | pick, drag |
| ElementOf | `elementOf(key) → element \| none` | elementReveal, flowGaps |
| Test | `has(key) → bool`, `watch(fn(key \| all))` | mark |
| KeysAt | `keysAt(fromRank, toRank) → later Key[]` | windowing |
| Locate | `locate(key) → later rank \| none` | rankReveal |
| Rank | `rank(key) → rank \| none` (drawn keys only, immediate) | place, posInSet |
| Compare | `compare(a, b) → -1 \| 0 \| 1` (immediate) | rangeSelection |
| RanksIn | `ranksIn(fromPx, toPx, count) → [fromRank, toRank)` | windowing |
| Place | `place(rank) → rect` | place, rankReveal, layoutGaps |
| Extent | `extent(count) → size` | sizer |
| Gap | `gapAt(point) → before: key \| none` | drag |
| Reorder | `move(key, before: key \| none)` | drag |
| Scroll | `scrollTo(px)`, `scrollBy(px)` | rankReveal, edgeScroll |

`Step` contract: `step(none, 1)` is the first key, `step(none, -1)` the last; `step(k, n)` goes `n` keys on and stops at
the edge (clamps); a key not in the list behaves as `none`; `none` comes back only for an empty list. `Find` returns the
first key after `after` (wrapping) whose text starts with `prefix`, ignoring case.

## Case 1: a plain listbox

| Module | Does | Parameters | Gives |
|---|---|---|---|
| `cell` | holds one value | initial | Value, Watched, Set, Test (`has(k)` = equals) |
| `arrayList` | holds keys in memory | initial keys | Watched of keys, Drawn, Reorder (later) |
| `arrayStep` | steps through an array | keys (Value) | Step |
| `move` | moves a value by `n` steps; presses made while one is under way queue from its result; a change from elsewhere drops the queue | from, step, by (`() → n`), to | `run()` |
| `render` | keeps one element per drawn key, in order, and applies every facet to each element it makes and again when that facet changes | drawn, create (`key → element`), mount, facets | KeyOf, ElementOf |
| `flowMount` | puts elements into one container in order | container | Mount |
| `mark` | an attribute present while a test holds | test, attribute, value | Facet |
| `ids` | gives each element an id from its key | idOf (`key → string`) | Facet |
| `activeDescendant` | points an element's `aria-activedescendant` at the active key | element, active (Watched), idOf | — |
| `pick` | a click on an item hands its key on | element, keyOf, to | — |
| `elementReveal` | scrolls a drawn key's element into view | elementOf | `reveal(k)` |

Wiring (the app, by hand): `active = cell()`, `selected = cell()`. Down/Up are `move` from `active` by ±1, Home/End are `move` from none by
1 and -1, all setting `active`; Enter and Space set `selected` to `active`; `pick` sets `active` then `selected`;
active changes call `elementReveal`. Facets: `ids`, `mark(active, 'data-active')`, `mark(selected, 'aria-selected')`.
The container has `role=listbox`, `tabindex=0` and keeps DOM focus; items get `role=option` from `create`.

Keys are bound by the app (with keybinds, see below). No module here knows about keys, the DOM event that triggered
it, or any other module.

UX **(P)**: selection does not follow the active item (a `follow` wiring line adds that); no wrapping at the ends
(a `wrapStep` value made from a Step adds it); PageUp/PageDown are `move` by the number of visible rows.

## Case 2: multiple selection

Adds `rangeSelection`: the selected keys as a list of key intervals, with `toggle(k)`, `extend(anchor, k)`, `all()`,
`none()`, and Test. It takes a Compare, and costs nothing per item, so "all of a billion" is one interval. Adds
`arrayCompare` (Compare, from a key→position map over the array). Wiring: Space toggles; Shift+arrows run `move`, then
`extend(anchor, active)`; Ctrl+A is `all()`; `pick` hands on the event's modifiers with the key **(P)**; `anchor` is
another `cell`. `mark(selection, 'aria-selected')` is unchanged. The container gets `aria-multiselectable`.

## Case 3: typeahead

Adds `typeahead`: collects printed characters into a prefix that clears after a pause (**(P)** 500 ms), asks Find from
the active key and sets the result. Parameters: element, find, from, to. Adds `arrayFind` (Find, over the array and a
`textOf(key)`). Typing the same letter repeatedly cycles through items starting with it **(P)**.

## Case 4: a menu with submenus

A menu is case 1 with other wiring: `role=menu`, items `role=menuitem`, Enter runs the item's action instead of
selecting. A submenu is another instance of the same modules. Adds:

- `popover`: shows an element as a popover anchored to another, while a Watched boolean (a `cell`) is true.
- `focusWhen`: focuses an element when a Watched boolean becomes true.
- `dismiss`: calls a Set with `false` on Escape or a press outside the given elements.
- `hoverIntent`: hands on the key under the pointer after it rests (**(P)** 100 ms), so hover moves the active item and
  opens submenus without opening every one the pointer crosses.

Each menu level binds its keys on its own element, so the focused level gets them. Right/Enter on an item with a
submenu opens it and moves its active key to the first item; Left/Escape closes it and focus returns.

## Case 5: a combobox

DOM focus stays in a text field; the list is a popover. Adds `textValue` (Watched and Set over a field's value). The
list's Drawn and Step implementations read the query (an in-memory `filtered` over `arrayList` and `textValue`, or the
server's). `activeDescendant` is given the field instead of the list. Keys are bound on the field and must work while
typing. On a new query the active key becomes the first result **(P)**; Enter writes the active item's text into the
field and closes the list **(P)**.

## Case 6: grouping

**Changed:** `render` first took a `container` and inserted elements itself. Nesting options inside `role=group`
elements needed that changed, so the container became the Mount abstraction and `flowMount` its first implementation.
Adds `groupMount` (Mount: puts each element into its group's element, making the group when its first row arrives and
removing it with its last; parameters: container, groupOf) and `withHeaders` (Drawn: a header row before each group's
first key, from a Drawn and groupOf). Step is unchanged and has no headers in it, so navigation skips them.

## Case 7: drag to reorder

Adds `drag`: pointer down on an item, move, drop; asks Gap where the pointer is and calls Reorder. Parameters: element,
keyOf, gap, reorder. Adds `flowGaps` (Gap from drawn elements' rectangles), `edgeScroll` (scrolls while the pointer is
near an edge during a drag), and `arrayReorder`. The drop position is shown by `mark(dropBefore, 'data-drop-before')`
where `dropBefore` is a `cell` that `drag` sets. Keyboard: Alt+Up/Down move the active item by one **(P)**.

## Case 8: long lists, drawn only partly (windowing)

**Changed:** `arrayList` first answered every question (Step, Drawn, Compare, ...). Case 2 would have added Compare
to it, which is a modification; so each question became its own module over the array (`arrayStep`, `arrayCompare`,
`arrayFind`, `arrayKeysAt`, `arrayLocate`, `arrayReorder`), and `arrayList` only holds keys.

Adds:

- `viewport`: a scroll container's visible range (Watched) and Scroll.
- `rows`: a layout of rows of one estimated height **(P)**; gives RanksIn, Place, Extent, and rank-at-point.
- `windowing`: from the visible range, RanksIn, KeysAt and the count, keeps the keys to draw (plus an overscan
  **(P)** one screen each way). Gives Drawn and Rank.
- `place`: Facet placing each element at `Place(Rank(key))`, so elements never move each other (no layout shift).
- `sizer`: sets the scrollable size from Extent and the count.
- `pinned`: Drawn that adds keys from a Watched (the active key) to another Drawn, so `aria-activedescendant` always
  points at an element and focus is never on a dropped element.
- `rankReveal`: `reveal(k)` by Locate, Place and Scroll; replaces `elementReveal` in the wiring.
- `layoutGaps`: Gap by rank-at-point and Place, for drag over drawn and undrawn items alike.
- `posInSet`: Facet setting `aria-posinset` and `aria-setsize` from Rank and the count.
- `arrayKeysAt`, `arrayLocate`.

`render`, `move`, `mark`, `pick` and `drag` are unchanged.

## Case 9: a grid of cards

Adds `cards`: a layout of fixed-size cards in as many columns as the width holds; gives RanksIn, Place, Extent,
rank-at-point, and the column count as Watched. Up/Down are `move` with `by` = ∓columns; Left/Right are ±1 and run on
across rows **(P)**. Semantics stay a listbox **(P)**; `role=grid` would add a `rowMount` (Mount grouping by rank and
column count), nothing else.

**Changed:** Step began as `after(k)`/`before(k)`. Moving by a row of columns or a page would have been many calls (many
round trips to a server) and a loop in `move`, so it became `step(k, n)`.

## The huge case: a server with billions of items

Only implementations change; every module above stays as is.

| Abstraction | Server implementation |
|---|---|
| Step | "the key `n` after `k`" from an ordered index: a range read of `n` keys from `k` |
| KeysAt, Locate, count | an order-statistic index (each node counts its subtree), so rank → key and key → rank are logarithmic |
| Find | an index over (text prefix, position), answering "the first match after `k`" |
| Compare | keys carry their position in the index order, so comparing needs no request |
| Reorder | the moved item's position becomes a key between its new neighbours (fractional) |
| Drawn, count changes | the server pushes changes; `windowing` asks again |
| Scroll / visible range | a `scaledViewport` that maps a capped physical scroll height onto the full extent, since browsers cap element height (millions of px) |

Each server module asks for what a window needs in one request, and caches what it has seen. Selection is intervals,
so "select all" and "delete selected" are one request each, never a key list.

## Keybinds (`packages/keybinds`)

No module here depends on keybinds. The app may use `keybinds(commands, context, { target, inputs: [keys()] })` to
call `move.run`, `toggle` and the rest, with `target` the focused element of each level. Where it fits: per-element
`target`, `captureInput` (the combobox's field), `sequences()` not needed, `execute` returning false to pass a key on.

Where it doesn't fit these rules:

- **Open/closed.** `core.js` names each optional piece as its own option (`releases`, `holds`, `sequences`,
  `anyModifiers`) and calls them by name; `binding.js` hard-codes the suffixes `:up`, `:hold`, `:tap` and the modules
  they need; `command.js` hard-codes the input kinds (`BINDING_FIELDS`: keys, mouse, gamepad). A new phase, suffix or
  kind of input means editing those files.
- **Module as parameter.** `inputs`, `releases`, `holds`, `sequences` and `anyModifiers` are module instances handed to
  `keybinds()`.
- **Interface segregation.** `Command` makes `label` required and carries palette and menu fields (`category`,
  `description`, `menu`, `rank`, `hidden`) that binding a key doesn't use. `Dispatch`, given to every input, bundles
  context, presses, candidates, axes and execution.
- **Dependency inversion.** `Input` and `Dispatch` are declared in `input.js`, beside the inputs, not by `core.js`,
  which uses them.
- **Missing.** No binding means "any printed character", so `typeahead` reads key events itself, and when Space is part
  of a typed prefix it must win over a Space binding. With two listeners that order is decided by listener order, which
  is outside both.

## SOLID check

S = one responsibility, O = new cases added modules only, L = substitutable, I = depends on no more than it uses,
D = owns what it uses. "—" in Implements means it only uses abstractions.

| Module | Uses (owns) | Implements | S | O | L | I | D |
|---|---|---|---|---|---|---|---|
| cell | — | Value, Watched, Set, Test | holds a value | unchanged | any reader | each consumer takes one face | owns nothing |
| arrayList | — | Watched keys, Drawn | holds keys | split in case 8 | — | — | — |
| arrayStep/Compare/Find/KeysAt/Locate/Reorder | Value of keys | one each | one question | one module per question | answers now, which a later answer may equally do | one shape each | — |
| move | Value, Step, Set | `run` | moving | unchanged across 9 cases | applies only its latest answer | three narrow shapes | owns all |
| render | Drawn, Mount, Facet | KeyOf, ElementOf | elements for keys | Mount extracted (case 6) | never relies on which keys are drawn | no selection, focus or layout | owns all |
| flowMount, groupMount, rowMount | — | Mount | where an element goes | new Mounts | render behaves alike | — | — |
| mark, ids, place, posInSet | Test / Rank, Place | Facet | one attribute or style | new Facets | idempotent apply | one shape each | owns all |
| activeDescendant | Watched, idOf | — | one attribute | field or list, by parameter | — | — | owns all |
| pick, hoverIntent | KeyOf, Set | — | pointer → key | — | — | — | owns all |
| elementReveal, rankReveal | ElementOf / Locate, Place, Scroll | reveal | reveal | rankReveal added | see caveats | — | owns all |
| rangeSelection | Compare | Test, toggle/extend/all | selected intervals | — | any Compare | — | owns Compare |
| typeahead | Find, Value, Set | — | prefix → key | — | late answers dropped if superseded | — | owns all |
| popover, focusWhen, dismiss, textValue | Watched / Set | Watched, Set | one DOM behaviour each | — | — | — | owns all |
| withHeaders, pinned | Drawn, Watched | Drawn | one transform | new Drawn | — | — | owns all |
| drag, edgeScroll | KeyOf, Gap, Reorder / Scroll | — | the gesture / scrolling | — | any Gap | — | owns all |
| flowGaps, layoutGaps | ElementOf / Place | Gap | gap at point | — | — | — | — |
| viewport, scaledViewport | — | Watched range, Scroll | the scroller | scaled added | coarse px in scaled is within contract | — | — |
| rows, cards | — | RanksIn, Place, Extent | one layout | cards added | sizes are never assumed | four faces | — |
| windowing | Watched, RanksIn, KeysAt | Drawn, Rank | what to draw | unchanged by cards | any layout, any KeysAt timing | — | owns all |
| sizer | Extent, Watched | — | scroll size | — | — | — | owns all |
| server modules | a transport function | Step, KeysAt, ... | one question each | — | late answers | — | — |

Each abstraction in the first table is owned by the modules listed there, implemented by those in this one, and is
one question (I); its implementations are listed above (L); none was widened after its first case, except the two
recorded changes (O).

## What isn't fully SOLID, or is open

- **Pairings the types don't enforce.** `elementReveal` and `flowGaps` work only when every item is drawn; with
  windowing the app must wire `rankReveal` and `layoutGaps` instead. Each module keeps its own contract, but a wrong
  pairing is a wiring bug, not impossible by construction.
- **A removed active key.** `Step` treats it as none, so moves work, but the active cell holds a key that isn't in the
  list until the next move. Making that impossible needs the list to own which key is active. Open.
- **Keys that carry their position** (needed for Compare without requests) change when an item is reordered, so a
  dragged item's selection and active state must move with it. Open.
- **Anchoring the window** by rank shifts what's on screen when items are inserted above; anchoring by key avoids that
  but needs a second KeysAt shape. Open **(P: by key)**.
- **typeahead and keybinds both reading keys**, above.
