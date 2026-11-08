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

## Abstractions

Each is owned by the module(s) named, which declare it.

| Abstraction | Shape                                                               | Owned by                                              |
| ----------- | ------------------------------------------------------------------- | ----------------------------------------------------- |
| Value       | `() → T`                                                            | move (`from`), typeahead (`from`)                     |
| Watched     | `get() → T`, `watch(fn) → stop`                                     | activeDescendant, popover, windowing, sizer, posInSet |
| Set         | `(T) → void`                                                        | move (`to`), typeahead (`to`), pick (`to`)            |
| Step        | `step(k \| none, n) → later key \| none`                            | move                                                  |
| Find        | `find(prefix, after: k \| none) → later key \| none`                | typeahead                                             |
| Drawn       | `keys() → Key[]`, `watch(fn)`                                       | render                                                |
| Mount       | `put(element, before: element \| none)`, `remove(element)`          | render                                                |
| Facet       | `apply(key, element)`, `watch(fn(keys?))`                           | render                                                |
| ItemOf      | `itemOf(eventTarget) → {key, element} \| none`                      | pick, drag, gaps                                      |
| Test        | `has(key) → bool`, `watch(fn(keys?))`                               | mark                                                  |
| KeysAt      | `keysAt(fromRank, toRank) → later Key[]`                            | windowing                                             |
| Locate      | `locate(key) → later rank \| none`                                  | windowing                                             |
| Rank        | `rank(key) → rank \| none` (drawn keys only, immediate)             | place, posInSet                                       |
| Compare     | `compare(a, b) → -1 \| 0 \| 1` (drawn or held keys only, immediate) | rangeSelection                                        |
| RanksIn     | `ranksIn(fromPx, toPx, count) → [fromRank, toRank)`                 | visibleRanks                                          |
| Place       | `place(rank) → rect`                                                | place                                                 |
| Extent      | `extent(count) → size`                                              | sizer                                                 |
| Gap         | `gapAt(point) → before: key \| none`                                | drag                                                  |
| Reorder     | `move(key, before: key \| none)`                                    | drag                                                  |
| Scroll      | `scrollBy(px)`                                                      | edgeScroll                                            |

`Step`: `step(none, 1)` is the first key, `step(none, -1)` the last; `step(k, n)` goes `n` keys on and stops at the
edge; `none` comes back only for an empty list. `Find` returns the first key after `after` (wrapping) whose text starts
with `prefix`, ignoring case. `Drawn` draws every key the list holds for others (below) and at least every visible key.
`Facet.watch` reports the keys whose facet changed, or nothing for "any". `render` mounts an element, then applies every
facet to it in one synchronous pass, and applies a facet again to the keys it reports.

**Held keys.** A list gives out held keys: `hold(initial, whenRemoved)` is a Watched, Set and Test whose key is always
in that list, or none. The list updates it inside the edit that removes its key, to the next key (`next`), the previous
(`previous`) or none (`none`), before anything hears of the edit. A held key never names a removed item.

## Case 1: a plain listbox

| Module             | Does                                                                                                                                            | Parameters                                     | Gives                                        |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | -------------------------------------------- |
| `arrayList`        | holds keys in memory, and the keys held from it                                                                                                 | initial keys                                   | `set(keys)`, `keys()` (Value), Drawn, `hold` |
| `arrayStep`        | steps through an array                                                                                                                          | keys (Value)                                   | Step                                         |
| `move`             | moves a key by `n` steps, or from an edge; moves made while one is under way queue from its result, and a change from elsewhere drops the queue | from, step, to                                 | `by(n)`, `edge(n)`                           |
| `render`           | keeps one element per drawn key, in order                                                                                                       | drawn, create (`key → element`), mount, facets | ItemOf, `stop()`                             |
| `flowMount`        | puts elements into one container in order                                                                                                       | container                                      | Mount                                        |
| `mark`             | an attribute set while a test holds, and another or none while it doesn't                                                                       | test, attribute, on, off                       | Facet                                        |
| `ids`              | gives each element an id from its key                                                                                                           | idOf (`key → string`)                          | Facet                                        |
| `activeDescendant` | points an element's `aria-activedescendant` at a key's id                                                                                       | element, active (Watched), idOf                | `stop()`                                     |
| `pick`             | a click on an item hands its key on                                                                                                             | element, itemOf, to                            | `stop()`                                     |
| `reveal`           | scrolls a key's element into view when the key changes, after the pass that applies it                                                          | target (Watched)                               | Facet                                        |

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

## Case 5: a combobox

DOM focus stays in a text field; the list is a popover. Adds `textValue` (Watched and Set over a field's value). The
list's Drawn and Step implementations read the query (an in-memory `filtered` over `arrayList` and `textValue`, with its
own holds, or the server's). `activeDescendant` is given the field instead of the list. Keys are bound on the field and
must work while typing. On a new query the active key becomes the first result **(P)**; Enter writes the active item's
text into the field and closes the list **(P)**.

## Case 6: grouping

**Changed:** `render` first took a `container` and inserted elements itself. Nesting options inside `role=group`
elements needed that changed, so the container became the Mount abstraction and `flowMount` its first implementation.
Adds `groupMount` (Mount: puts each element into its group's element, making the group when its first row arrives and
removing it with its last; parameters: container, groupOf) and `withHeaders` (Drawn: a header row before each group's
first key, from a Drawn and groupOf). Step has no headers in it, so navigation skips them.

## Case 7: drag to reorder

Adds `drag`: pointer down on an item, move, drop; asks Gap where the pointer is and calls Reorder. Parameters: element,
itemOf, gap, reorder. Adds `gaps` (Gap from the element under the pointer and `render`'s ItemOf: before or after that
item by which half it is in), `edgeScroll` (scrolls while the pointer is near an edge during a drag), and
`arrayReorder`. The drop position is shown by `mark(dropBefore, 'data-drop-before')`, where `dropBefore` is a `cell`
that `drag` sets. Keyboard: Alt+Up/Down move the active item by one **(P)**.

## Case 8: long lists, drawn only partly (windowing)

**Changed:** `arrayList` first answered every question (Step, Drawn, Compare, ...). Case 2 would have added Compare to
it, which is a modification; so each question became its own module over the array (`arrayStep`, `arrayCompare`,
`arrayFind`, `arrayKeysAt`, `arrayLocate`, `arrayReorder`), and `arrayList` only holds keys.

Adds:

- `viewport`: a scroll container's visible range (Watched) and Scroll.
- `rows`: a layout of rows of one estimated height **(P)**; gives RanksIn, Place and Extent.
- `visibleRanks`: the ranks in view, from the visible range, RanksIn and the count (Watched).
- `windowing`: the ranks in view plus an overscan **(P)** one screen each way, and every key the list holds for others,
  placed by Locate. Parameters: ranks, keysAt, held, locate. Gives Drawn and Rank.
- `place`: Facet placing each element at `Place(Rank(key))`, so elements never move each other (no layout shift).
- `sizer`: sets the scrollable size from Extent and the count.
- `posInSet`: Facet setting `aria-posinset` and `aria-setsize` from Rank and the count.
- `arrayKeysAt`, `arrayLocate`.

`render`, `move`, `mark`, `pick`, `reveal`, `drag` and `gaps` are unchanged: the active key is always drawn, at its
place, so `reveal` scrolls to it and `aria-activedescendant` always names an element; the pointer is always over drawn
items, so `gaps` needs no layout.

## Case 9: a grid of cards

Adds `cards`: a layout of fixed-size cards in as many columns as the width holds; gives RanksIn, Place, Extent, and the
column count as Watched. Up/Down are `move.by(∓columns)`; Left/Right are ±1 and run on across rows **(P)**. Semantics
stay a listbox **(P)**; `role=grid` would add a `rowMount` (Mount grouping by rank and column count), nothing else.

**Changed:** Step began as `after(k)`/`before(k)`. Moving by a row of columns or a page would have been many calls (many
round trips to a server) and a loop in `move`, so it became `step(k, n)`.

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

No module here depends on keybinds. The app may use `keybinds(commands, context, { target, inputs: [keys()] })` to call
`move.by`, `toggle` and the rest, with `target` the focused element of each level. Where it fits: per-element `target`,
`captureInput` (the combobox's field), `execute` returning false to pass a key on.

**Designed change, for typeahead.**

- A key syntax piece `printed()` **(P)**, beside `symbols()` and `aliases()`: it accepts the key name `printed`, and
  adds the lookup `printed` to every key event that types one character with no Ctrl, Alt or Meta (Shift allowed). The
  command gets the event, and so `event.key`. This adds a module; nothing in keybinds changes for it.
- `BindingIndex.exact` in `core.js` returns the commands of the first lookup that has any, so a command bound to Space
  whose `when` doesn't hold stops the event reaching the `printed` binding. Lookups are already "best first"; the index
  should return every lookup's commands in that order, so the first command that applies runs. That is a fix to the
  abstraction, and changes which command runs only where the first lookup's commands don't apply.

Where it doesn't fit these rules otherwise:

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
| activeDescendant                             | Watched, idOf                          | —                       | one attribute                  | field or list, by parameter | the key is always drawn                          | —                             | owns all     |
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

- **Anchoring the window** by rank shifts what's on screen when items are inserted above; anchoring by key avoids that
  but needs a second KeysAt shape **(P: by key)**.
