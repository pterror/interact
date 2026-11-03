# Design

"interact" is a working name.

## Goal

Building a UI takes less work and less to learn, the result behaves well without extra effort, and none of it is tied to
a framework. An app's code holds only what is specific to that app. The library is fully general: no app's needs shape
it.

Sections are marked by where they come from:

- **Settled**: decided with the owner. Changing it needs the owner.
- **Derived**: follows from what's settled, the repo's rules (`CLAUDE.md`), or something measured, which is cited.
- **Proposed**: a design choice made here that nothing forces yet. It is open until the owner approves it or building it
  settles it.
- **Unverified**: assumed and not yet checked. It gets checked when the step that needs it is built.

## Rules this repo inherits

keybinds' `CLAUDE.md` governs the whole repo; its repo-wide rules now sit in the root `CLAUDE.md`. These shape the
design:

- No runtime dependencies (root `CLAUDE.md`, "Hard Constraints"). Packages here may depend on each other. Nothing
  outside the repo may be a runtime dependency. `test/rules.test.js` enforces this.
- Plain JavaScript with fully type-safe JSDoc: no casts, no `any`, no `@ts-` directives (**Settled**). tsgo runs with
  every strictness option (`tsconfig.base.json`), and oxlint with every category and plugin, type-aware
  (`.oxlintrc.json`). oxfmt formats everything (`.oxfmtrc.json`). `bun run check` runs all three, and
  `test/rules.test.js` enforces the no-casts rule. A rule is off only where it contradicts another rule or a convention
  the code follows, with the reason next to it.
- One module per part, and one test file per module that passes when run alone.
- An app ships only what it uses. For keybinds this meant one module per input and per piece of syntax, and it took the
  keyboard-only build from 5.1 KB to 2.57 KB gzipped (`packages/keybinds/TODO.md`). The same holds here. Each behavior,
  view, renderer and model is its own module, and whatever is optional is passed in rather than imported.
- Syntax or options whose module isn't loaded are an error that names the module. They never silently do nothing
  (`packages/keybinds/src/core.js:421`).

## Packages

The five packages are settled, and each is usable on its own.

Dependencies only point down this list. So far each new package is a manifest only; its first module comes with the
first build step.

| Package                | Holds                                                                                                             | DOM        |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------- |
| `@interact/core`       | Controllable state, events, state machines, data sources, selection, focus scopes                                 | none       |
| `@interact/dom`        | Templates with holes; DOM renderer, string renderer, hydration; custom element base; registration; style adoption | yes        |
| `@interact/components` | Each component's behavior and default web view, its structural CSS, and the command bridge                        | yes        |
| `@interact/theme`      | The default visual theme: tokens and their values                                                                 | CSS only   |
| `@interact/codegen`    | Development tool: generates typed declarations and framework wrappers from a Custom Elements Manifest             | build time |
| `keybinds`             | The standalone command and binding engine                                                                         | yes        |

keybinds depends on none of the others, and none of the others depend on it (**Settled**: "Keybinds' core stays
standalone"). The bridge in `@interact/components` meets keybinds through two operations and imports nothing from it.

## Components (Settled, with the derived parts marked)

A component is its behavior, written once as a plain API, plus a default view anyone can replace.

- **The behavior** is a class with no DOM in it. It has methods, observable state and events, and uses a state machine
  only where modes and timing call for one: a menu opening and closing with pointer intent, a combobox, a tooltip's
  delays. A component without modes is a few fields and methods. A behavior can be driven by tests, by the DOM, or later
  by a terminal view.
- **The view** belongs to one target family. Web views are templates with holes, used by three things:
  - a DOM renderer;
  - a string renderer, for server rendering, which emits Declarative Shadow DOM when the instance uses shadow DOM;
  - hydration, which adopts the server's markup instead of replacing it.

  Custom elements join a behavior to a web view. Terminal views can come later.

- **State.** Data goes in and events come out. Each piece of state is either controlled (the app owns it and hears
  change requests) or left to the component. zag.js does this with a `value` / `defaultValue` / `onValueChange` triple
  for each piece of state (`@zag-js/listbox` `dist/listbox.types.d.ts:60-80`, read in the evaluation). **Derived:**
  `@interact/core` has one primitive for this, `Controllable` (`packages/core/src/controllable.js`), so every component
  handles control the same way. The component calls `request(next)`. Every request is heard (`onRequest`). Left to the
  component, the value changes at once; controlled, it changes only when the app calls `set`. `subscribe` hears actual
  changes, and `control(controlled)` hands the value to the app or back after construction, which a custom element
  created by the browser needs.
- **Behaviors are readonly to their views (Derived).** A behavior's state is held in `Controllable`s in readonly fields,
  and it changes only through methods; nothing on a behavior is assignable. oxlint's `prefer-readonly-parameter-types`
  enforces this for every function a behavior is handed to, with no exemption per component: its `allow` takes exact
  names only (probed in oxlint 1.90.0: a glob path or a regex name clears nothing), so the readonly type is what makes
  every future component pass. `Controllable.control()` and the listbox's `source` as a `Controllable` replaced the two
  setters that broke it (commit 3a0ee7a).
- **Commands.** Components know nothing about commands. A bridge needs only two operations: "list the commands available
  in a context" and "run one by id". With those it keeps buttons, menus and the palette in step with any command system,
  and keybinds is one such system. It also accepts an optional third, "tell me when the list changes" (**Settled**):
  where the command system provides it the bridge is live, and otherwise it looks again when the app asks or a menu or
  the palette opens.
- **Generated code.** Framework wrappers and typed declarations are generated from a Custom Elements Manifest
  (`@interact/codegen`).

### The listbox (Derived, built)

- `Listbox` (`packages/components/src/listbox.js`) is the behavior, with no DOM. Its state is `active` and `selection`,
  both `Controllable`. Its parts:
  - `items` (`items.js`): the source, read through a bounded `BlockCache`, with failed reads reported by `onError`.
  - `scroll` (`scroll-rows.js`): `top` and `rows`, both `Controllable`, with `window()`, `scrollTo()` and `reveal()`.
  - `choose` (`chooser.js`): single or multiple mode; `press()`; `all()`, which selects everything as one filter;
    `isSelected()`; and `count()`, which counts without reading.
- Also on `Listbox`: `source`, a `Controllable` (a new source starts over); `key()`, which takes keys as DOM-free
  actions (`listbox-keys.js`, acted on in `listbox-act.js`); `goTo(position, extend)`; `type(character)`; `focus()`;
  `activate()` and `onActivate()`; `positions()`; and `subscribe()`.
- **Keyboard (Derived, checked against the WAI-ARIA APG listbox pattern and its example code):** arrows, Home, End and
  the page keys move the active item; Space toggles it; Enter activates it. In multiple mode, Shift with a move or with
  Space selects from the anchor through the active item, Ctrl+Shift+Home/End select from the active item to the first or
  last and go there, and Ctrl+A selects everything. The anchor is the item last chosen (the APG's "most recently
  selected"); moving doesn't move it, and a Shift move before any choice starts from where the move started.
- **Focus entering (Derived, the APG listbox pattern):** the active item stays and is shown. With nothing active, focus
  goes to the first selected item and shows it, when the source can place items (`findsSelected`, below); the answer is
  dropped if a key made something active first, or the source changed. Without that capability, or with nothing
  selected, it goes to the item last chosen, or the top item (`listbox-focus.js`; tested in all three browsers in both
  DOM modes, with the first selected item five billion down).
- **Typeahead (Derived, settled with the owner):** a character goes to the next item whose text starts with it, and
  characters typed within 500ms (the APG example's wait) to the next whose text starts with all of them, going round to
  the start. The whole of what was typed is always looked for first, so "aa" reaches "Aaron"; only when nothing starts
  with it, and it is one character typed again and again, does it move on to the next item starting with that character
  (`typeahead.js`). A space continues what is being typed. Text is compared by `startsWithTyped`
  (`packages/core/src/text.js`): from its start, ignoring case and accents. `typeahead.js` keeps what was typed;
  `Items.findPrefix` asks the source's `findPrefix` when it has one, and otherwise looks among the items read.
- **Accessibility (Derived):** axe-core 4.14.0 finds nothing in the listbox as the server renders it, or live, focused
  with items chosen, with the theme and without, in both DOM modes in Chrome 156, Firefox 157 and WebKit 27.2
  (`listbox-view.test.js`). It first found the no-theme selected colors: `Highlight` on `HighlightText` is about 3:1 in
  Firefox and 4:1 in WebKit, so the fallback is Canvas tinted with Highlight under CanvasText. In forced colors a
  selected option takes the person's own `Highlight` and `HighlightText` (tested in Chrome and Firefox, which emulate
  forced colors; WebKit only matches the media query). The active option's outline takes the selected text color on a
  selected option, where the theme's focus color matched the fill.
- **From Vaadin Grid's keyboard and a11y mixins (Derived, read):** `aria-activedescendant` names only an option that has
  arrived, as Vaadin holds a cell's focus event while its row loads (`__pendingBodyCellFocus`); focus entering brings
  the active item into view. Vaadin's guards for a focused element going stale as rows are reused
  (`__updateItemsFocusable`) have no counterpart to need: the active item is a position that moves with the source's
  changes, and options are keyed by position. Its page keys (the active row ends at the edge it moved toward) are what
  `reveal` already does.
- Selecting by position reads nothing, because the source makes a filter for the positions. Selecting all ten billion
  then deselecting one counted 9,999,999,999, with 100 items read in all.
- `listboxView()` is the default web view, and `listboxElement(create)` is the element class. The app registers the
  class, and `create(host)` builds each instance's listbox.

### What moves out of keybinds (Derived)

Today `packages/keybinds/src/components/` holds six shadow-DOM elements, and two of them overlap with the `CommandHub`
(`src/hub.js`):

- `CommandHub` builds those elements (`hub.js:118-127`), pushes context into them (`hub.js:339-347`) and paints
  `data-command` buttons (`hub.js:405-433`). That is the bridge's job, and it moves to `@interact/components`.
- keybinds keeps its sources, store, listening, `held` and `axis`.
- keybinds' `TODO.md` names the three menus as 880 lines that each carry their own rendering, keyboard navigation and
  dismissal. Rebuilding them as one menu behavior over shared collection and focus models removes that duplication.

The elements are rewritten from the requirements, not ported. Once their replacements exist, the old modules and
`styles/palette.css` are deleted from keybinds in the same change, so the old and new versions never sit side by side.
Until then they are fenced: `test/repo.js` and `.oxlintrc.json` skip keybinds and say why, and
`packages/keybinds/TODO.md` lists what it takes to bring keybinds under the repo's rules (5,369 lint diagnostics, 206
casts).

These users still install keybinds from its own repository (`"keybinds": "github:pterror/keybinds"`):

- `~/git/cyoa/package.json:27`
- `~/git/pteraworld/package.json:23`

That repository is untouched.

## Collections (Settled models; mechanics Derived from the evaluation)

Every collection component works the same from ten items to ten billion, with no cost per item. Lists, menus, grids and
trees all take the same kind of data source.

### Data source

**Settled:** items by position, a count, and change notifications. An in-memory source ships with the library.

**Derived:**

- Positions are plain numbers, since 10^10 is well below 2^53.
- Fetching is by range and may be asynchronous. Items not yet fetched render as placeholders whose size is known in
  advance, so nothing shifts when they arrive.
- Change notifications say what changed: a range inserted, a range removed, a range changed, or a reset. A view can then
  shift or refetch exactly what's affected. A count that grows (a remote source learning more) is an insertion at the
  end, so it needs no kind of its own.
- Selection and focus need to refer to items whose positions move, so a source also gives each item a key.
- The contract is `Source<T, F>` (`packages/core/src/source.js`): `count()`, `read(start, end)` (the items at once, or a
  promise of them), `key(item)`, `subscribe(listener)` for changes, and filters of the source's own type `F`.
  `span(start, end)` makes a filter for the items now at those positions, `matches(filter, item)` tests one, and
  `countMatching(filter)` counts one, at once or later. `shiftPosition(position, change)` says where a position is after
  a change.
- A source that can search its items' text has `findPrefix(text, from)`: the first position at or after `from` whose
  item's text starts with `text`, compared as `startsWithTyped` compares, at once or later. Typing in a list asks it,
  since only the source knows every item; without it, a list searches the items it has read (`BlockCache.findHere`,
  which looks at no more than the cache's blocks).
- A source that can place items has `positionOf(key)`, where an item is now, and `firstMatching(filter, except)`, the
  first position a filter matches whose key isn't in `except`. With them, `firstSelected(selection, source)`
  (`selection.js`) finds where a selection starts: the filter's first item whose key wasn't removed, or an added key's
  item, whichever comes first. The source excludes the removed keys in its own query (a server's `NOT IN`), so nothing
  is read, except one item for a key both added and removed, which is selected only while the filter misses it.
  Composing them in core keeps what "selected" means in one place, `isSelected`'s; a source answering for a whole
  selection would hold a second copy. `findsSelected` says whether a source has what a selection needs: `firstMatching`
  for a filter, `positionOf` for added keys. `MemorySource` has both, each step of `firstMatching` passing over one
  excepted key.
- `MemorySource` (`packages/core/src/memory-source.js`) holds the items in an array, and searches them by `textOf`
  (default `plainText`: a string or number as itself). Its filters are spans between two keys, so a span keeps meaning
  the same items as others are inserted around it. Its key-to-position index is the only thing it keeps per item besides
  the items themselves, rebuilt lazily after a change.

### Virtualization

The view keeps only a window of items, plus a bounded cache of fetched blocks. The evaluation ran both grids against
10^10 rows, and the failure modes show what this design must avoid:

- **Mapping scroll pixels linearly onto rows lands on the wrong row.** AG Grid 36.2.0 caps its scroll height at
  32,000,048 px and maps it linearly. At 10^10 rows one pixel covers about 13,000 rows, and `ensureIndexVisible` landed
  tens to hundreds of rows off. Asked for 8e9, it showed 7,999,999,733. Source:
  `ag-grid-community/dist/package/main.esm.mjs:34809-34900`.
- **A capped virtual count with a moving index offset lands exactly.** Vaadin Grid 25.3.5 caps the virtual count at
  100,000 and shifts an index offset as you scroll. Every jump landed on the right row: asked for 5e9, it showed
  5,000,000,000. Source: `component-base/src/virtualizer-iron-list-adapter.js:12-13,820-858`. This is the approach to
  take.
- **A cache indexed by position breaks past 2^32.** Vaadin keeps items in a JS array (`cache.js:23`). Indices above
  2^32−2 become string-keyed properties, and `length = 1e10` throws. AG Grid's block cache (`cacheBlockSize`,
  `maxBlocksInCache`) stayed level at about 1,000 nodes. The cache here is therefore a bounded map of blocks keyed by
  block number, with least-recently-used eviction.
- **Derived:** the cache is `BlockCache` in `@interact/core` (`packages/core/src/block-cache.js`), not part of the web
  virtualizer. Every collection view needs it, a future terminal view included, and none of it touches the DOM.
  - Views read items (`get`) and follow changes through the cache, never the source directly. It drops whatever a change
    made stale, including reads still on their way, before passing the change on, so a view can't re-read stale items.
  - A block arriving is reported as `changed` over its positions, so arrivals and edits are handled the same way.
  - A source that answers at once (`MemorySource`) has its block in the cache before `ensure` returns, so in-memory
    lists never show placeholders.
  - Tested against a computed source of 10^10 items (`block-cache.test.js`).
- **Scroll position.** Native scrolling over a capped height is one of the inputs to the virtual window, not the source
  of truth. The source of truth is the position of the item at the top of the view, which keeps keyboard navigation,
  `scrollTo(position)` and restoring a view exact.
- **Derived (built; measured in Chrome 156, Firefox 157 and WebKit 27.2):**
  - The top position is a `Controllable` in `ScrollRows` (`packages/components/src/scroll-rows.js`), DOM-free, with the
    rows showing beside it. The web view turns it into pixels after each render and back from each scroll event
    (`listbox-view.js`, `sync` and `scrolled`), and leaves the scroll position alone when it already shows the top.
  - The tallest scrollable area: Chrome and WebKit 33,554,428px, clamping anything taller; Firefox 17,895,696px,
    collapsing anything taller to nothing. Device pixel ratio doesn't change these; CSS `zoom` divides them in CSS
    pixels (Firefox at zoom 2: 8,947,848). So the cap is in pixels on screen: one row fewer than 17,895,696px holds at
    the rows' pitch times the element's zoom (`virtual-rows.js`, `rowCap`; zoom from `currentCSSZoom`, or the product of
    computed `zoom` where WebKit lacks it, `row-measure.js`). Until a row is measured, and on the server, the cap is
    10,000 rows, under the limit for rows up to 1,789px on screen.
  - The pitch is measured from a row once and handed back to CSS (`--interact-listbox-pitch`), which lays out the spacer
    and every row from it, so script and layout multiply the same number. Chrome snaps a 27.3px row to 27.296875px;
    multiplying the unsnapped value drifted about 2,000px over the cap. Rows are placed with `inset-block-start`, not a
    transform: with transforms, Firefox showed the last row out of place near the cap.
  - The offset (the position of the first scrollable row) moves only when the top comes within a quarter of the
    scrollable rows of an end that isn't a real end, and then centres the top. Moving it under the person keeps how far
    into the row they had scrolled.
  - In all three browsers and both DOM modes (`listbox-view.test.js`): `scrollTo(5e9)` shows 5,000,000,000 through
    5,000,000,009 fully visible; the last jump shows 9,999,999,990 through 9,999,999,999; the same with rows 27.3px
    tall, and with 600px rows at zoom 2 (cap 14,912 rows, the area under the limit). The cache stays at or under its 16
    blocks over 60 jumps, with at most 21 options in the DOM. The wheel across an offset move goes forward 3 or 4 rows
    per turn, never back or skipping, and stops at the last item.
  - Rows have one fixed height (a token); variable heights wait.
- **Unverified:** smooth and momentum scrolling across an offset move (headless browsers delivered each wheel turn as
  one instant step); Safari itself (WebKit 27.2 is playwright's Linux build) and mobile browsers; browser zoom from its
  own controls (only CSS `zoom` was measured); variable row heights.

### Selection (Settled model)

A selection is a filter plus exceptions: "everything matching F, except these keys", or "nothing, except these keys".
Selecting all of ten billion items then costs nothing, and so does deselecting one of them.

**Derived:**

- The filter is stored in the selection itself. Changing what the view shows afterwards doesn't change what is selected.
- Exceptions go both ways (`packages/core/src/selection.js`). A selection is `{ filter, removed, added }`: every item
  the filter matches, except the keys in `removed`, plus the keys in `added`. Without both directions, "this span and
  one more item" (a span, then a Ctrl+click outside it) would have no form.
  - `toggle` puts the key in whichever set fits, depending on whether the filter matches the item.
  - `spanning(source, start, end)` selects a range as the source's own filter. Select-all is the span over every
    position, so even a Shift+End over billions of items is one filter.
- Counting is `countMatching(filter) - removed.size + added.size` (`countSelected`). So a source that supports filtered
  selection must also count by filter. Keys are counted as they were when toggled: an item deleted since still counts
  until the selection changes, because a removal reports positions, not keys.
- AG Grid's server-side selection uses the same shape, `{ selectAll, toggledNodes }`. In the evaluation it stayed
  `selectAll: true` after the filter changed, and whether that is intended is unverified.
- Vaadin and zag.js hold selected items or keys in full: Vaadin's `selectAll` with a data provider clears the selection
  (`vaadin-grid-selection-column-mixin.js:70-76`), and zag.js keeps a `Set` of keys (`@zag-js/collection`
  `selection.d.ts`). Both are references for anchor ranges and modes (single, multiple, extended), not for the model.

### Focus scopes (Settled model)

A focus scope is a region with its own rules: where focus enters, whether it is trapped, and where it goes back to when
the region closes. keybinds' hub already does that last part by hand (`hub.js:130-150`).

**Derived:**

- In a virtual collection, the focused item may be scrolled out of the window. The view keeps the focused item rendered
  whatever the window holds, so focus never falls back to the page.
- Overlays that close (menus, the palette, dialogs) form a stack, so Escape and outside presses close the top one only.
  zag.js has a working stack to read (`@zag-js/dismissable` `dist/layer-stack.mjs`), as do its typeahead and tabbable
  helpers (`@zag-js/dom-query`).
- **Derived (built, measured in Chrome 156):** focus stays on the listbox's viewport, and the active option is its
  `aria-activedescendant` (`listbox-view.js`). The active option is always among the positions rendered
  (`ScrollRows.positions`), hidden but present when it is outside the window. With the active item scrolled 2,000 rows
  away, focus and the active descendant were still there, and the next ArrowDown brought it back into view, in both DOM
  modes and all three browsers. The keys follow the WAI-ARIA listbox pattern (see The listbox).
- What the listbox needs is built (`packages/core/src/focus.js`):
  - `entry(left, count)`: where focus enters a collection. It goes back to where it left, while that's still inside,
    otherwise to the first item, and nowhere when the collection is empty.
  - `move(position, by, count)`: moves the active position and keeps it inside.

  The active position follows changes through `shiftPosition`. Trapping, restoring focus and the overlay stack come with
  the first overlay (the menu), since the listbox needs none of them.

## DOM (Settled)

### Shadow or light DOM

The consumer chooses shadow or light DOM per instance, or once as an app default. Styles work in both: adopted
stylesheets in shadow DOM, and `@scope` in light DOM.

**Derived:** a view's template and stylesheet are the same in both modes, and the mode decides only where the stylesheet
goes.

**Derived (measured in Chrome 156, Firefox 157 and WebKit 27.2):** one stylesheet selects correctly in both modes when
the component writes its host as `:scope` and `@interact/dom` wraps the text when it adopts it
(`packages/dom/src/css.js`, `scopedText`):

- in light DOM, `@scope ([data-interact="<kind>"]) to ([data-interact]) { … }`, adopted once by the document or shadow
  root the instance is in;
- in shadow DOM, two scopes: `@scope (:host) to ([data-interact-view]) { … }` for the host alone, and
  `@scope (:host > [data-interact-view]) to ([data-interact]) { … }` for everything below it, with `:scope` written as
  `:host` there. The view is rendered inside that one element of dom's own (`data-interact-view`, `display: contents`,
  in the declarative shadow root too). Firefox 157 drops every element below the host from `@scope (:host) to (…)`
  whatever the limit ([Mozilla bug 2023867](https://bugzilla.mozilla.org/show_bug.cgi?id=2023867)), and in every engine
  a scope root matches only selectors naming `:scope`, so the elements at the top of a shadow root need a root above
  them that isn't the host.

The `to ([data-interact])` bound stops either scope at any component inside, so a component never styles another's
insides. `@layer` inside `@scope` works in both modes, so a component's own layers survive the wrapping. Shown by
`packages/dom/src/component.test.js` ("styles with one stylesheet in shadow and light DOM, stopping at a component
inside"): host red and count blue in both modes, and a badge inside left unstyled.

Parts are attributes (`part="count"`) in both modes. From outside, `::part()` reaches them in shadow DOM and
`[part~="count"]` in light DOM; custom properties reach both.

FAST only switches between shadow and light DOM per definition, not per instance (`shadowOptions: null`), and in light
DOM it adopts styles into the root without scoping them (`element-controller.js:705-709`).

### Registration

Importing a module has no side effects. Classes are exported, and the app registers them under names it chooses, with
one call and a prefix. `test/rules.test.js` imports every module and fails if any of them defines an element or changes
the page.

**Derived:** styles and code never depend on tag names. keybinds already marks each element with its kind
(`data-keybinds="<kind>"`, `core.js:177`), and the same idea holds here.

**Derived (built):**

- `component(view, create)` (`packages/dom/src/component.js`) makes a class and defines nothing.
  - `create` is given the element, so an instance adopting server markup can start in the state the server rendered it
    in. With no access to the element, a hydrating listbox would start without its source, render nothing, and lose the
    server's nodes.
  - A view that has to read layout or drive the page has `rendered(behavior, root)`, called after the first render or
    adoption and after every render since. The listbox needs it to measure its rows and set its scroll position after
    each change; menus will need it for anchor geometry.
- `register(classes, { prefix, mode })` (`register.js`) defines `<prefix>-<kind>` for each class. It defines a subclass
  of its own each time, so one class can be registered under two prefixes, which Web Awesome's classes can't.
- Every instance carries `data-interact="<kind>"`.
- An instance's DOM mode comes from, in order:
  - a declarative shadow root, if it has one;
  - its `dom-mode` attribute;
  - the `mode` the app registered it with;
  - shadow.

Two of the evaluated libraries register on import:

- Web Awesome defines `wa-button` on import, and the class can't be registered a second time under another name ("this
  constructor has already been used with this registry").
- Vaadin defines its grid on import too (`src/vaadin-grid.js:393`), though its mixin module alone defines nothing.

### Server rendering and hydration

Server rendering emits Declarative Shadow DOM for shadow-mode instances. Hydration then adopts that markup instead of
re-rendering it.

The evaluation found two things to learn from:

- **Inlining styles in every instance is too heavy.** Web Awesome's server renderer inlines each component's whole
  stylesheet into every instance: one button and one select came to 61,477 characters.

  **Derived (measured in Chrome 156):** light-DOM instances share one page stylesheet, and each shadow instance links to
  one stylesheet URL. The test page held 100 and 3,000 instances, with a 3.1 KB scoped stylesheet served 400 ms late.
  Paint was sampled every frame from the top of the page:

  | Technique                                                                                               | Bytes per instance                | First frame                                                                                                  |
  | ------------------------------------------------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------ |
  | `<style>` inlined in each shadow root                                                                   | 3,234 (grows with the stylesheet) | styled                                                                                                       |
  | `<link rel="stylesheet">` in each shadow root                                                           | 140 (fixed)                       | none until the stylesheet arrived (404 ms), then styled; never unstyled, with or without scripts in the page |
  | Declarative adopted stylesheets (`shadowrootadoptedstylesheets` with `<style type="module" specifier>`) | 172                               | unstyled: not supported in Chrome 156 without flags                                                          |
  | Light DOM with one page `<style>`                                                                       | 87                                | styled                                                                                                       |

  So `renderComponent` (`packages/dom/src/render-component.js`) links shadow instances to `{ href }` by default, with
  `'inline'` for a page that can't serve the stylesheet. For light DOM the page includes `stylesheetText(view, 'light')`
  once, marked by `stylesheetAttributes`. On upgrade, a shadow root adopts the constructed sheet and drops the server's
  `<link>`/`<style>`, so the rules have one source. A light instance uses the page's sheet instead of adopting a second
  copy. `component.test.js` shows all three in Chrome.

- **Hydration (built):** `renderToString` marks child holes with `<!--i[-->`…`<!--i]-->` and bound elements with a
  `<!--i@-->` before them (`packages/dom/src/markers.js`). `hydrate` walks the markers in the same order the DOM
  renderer finds them in a fresh clone (`collect.js`). It keeps the server's nodes and attaches parts. Repeated items
  are paired by position, and then reconciled by key as on any update (`reconcile.js`). Markup from a different template
  is an error, not a silent re-render. A missing, `null` or `false` attribute is left out; an empty string keeps it.
- **Formatting templates:** oxfmt formats `html` and `css` templates. With any `htmlWhitespaceSensitivity` but `strict`
  it adds whitespace text to rendered markup. Strict only moves whitespace inside tags, which the template scanner drops
  (`prepare.js`).
- **FAST's hydration works.** In headless Chrome it adopted server markup, kept the same nodes, and attached event
  bindings. Two parts are references for the markers and the reconciliation of repeated items: `fast-element`
  `dist/esm/hydration/repeat-ranges.js` and `markers.js`. FAST's rule that a missing or null value leaves the attribute
  out, while an empty string keeps it, is worth matching.

## Styling (Settled)

Structural CSS ships with each component. The visual theme is separate, in `@interact/theme`.

### Tokens

Tokens are named by role, and can be set at five levels:

| Level     | Applies to                       |
| --------- | -------------------------------- |
| Global    | every component                  |
| Component | one kind of component            |
| Part      | one part of a component          |
| State     | a component or part in one state |
| Instance  | a single element                 |

**Derived (built, measured in Chrome 156):**

- A component's structural sheet resolves every visual value on the element itself: an instance's token (set on the
  element), else the component's (`--interact-listbox-*`), else the theme's global role token (`--interact-color-*`,
  `--interact-size-*`), else a system color, so a component works with no theme at all (`listbox-styles.js`). Resolving
  on the element is what makes an instance token work: a custom property that refers to another is resolved where it is
  declared, so a chain declared on `:root` would ignore anything set on one element.
- State tokens (`--interact-listbox-option-selected-fill`) stand on their own over the part's. Shown in both DOM modes:
  with the theme loaded, a component token on the page replaced the global, a part token set the options, the selected
  option kept its state token, and a token on one element applied to it (`listbox-view.test.js`, tokens).
- The theme is tokens only (`packages/theme/tokens.css`): the theme's rules can't reach into a shadow root, only its
  inherited custom properties can, so it sets values and the components' structural sheets use them. Global names follow
  Web Awesome's role × kind × emphasis grid (`--interact-color-brand-fill-loud`, `-brand-on-loud`,
  `-neutral-fill-quiet`, `-surface`, `-on-surface`, `-border`, `-focus`), light and dark through `light-dark()`.

### Selectors and precedence

Every selector has zero specificity, via `:where()`. Precedence comes only from cascade layers. `test/rules.test.js`
enforces both for every stylesheet outside keybinds.

**Derived:** the layer order is `interact.structure`, then `interact.theme`, declared at the top of both the structural
sheets and the theme (`@layer interact.structure, interact.theme;`), so it holds whichever loads first. The app's own
styles come after both: by the cascade's rules an unlayered rule or a later layer wins without competing on specificity
(not measured here). In shadow DOM the order matters only within a component's own sheet, since the theme reaches it
through tokens.

Web Awesome uses layers too (`styles/layers.css`), but its components barely use `:where()`.

## Generated wrappers and types (Settled)

`@interact/codegen` reads a Custom Elements Manifest and writes typed declarations and framework wrappers.

**Derived:** the manifest needs at least what Web Awesome's records for each tag: attributes, properties, events, slots,
CSS parts, CSS states and CSS properties (`dist/custom-elements.json`).

**Settled:** codegen targets every mainstream framework. All of them get typed declarations. A framework gets a wrapper
wherever its own custom element handling falls short of idiomatic: events as callbacks, and two-way binding where the
framework has it.

**Unverified:** whether `@custom-elements-manifest/analyzer` reads this repo's JSDoc-typed classes correctly. As a
development dependency it doesn't break the no-runtime-dependency rule.

keybinds' `TODO.md` has a case of the problem codegen solves. `inputs` is set at runtime but missing from the generated
declarations, so pteraworld has to cast to set it.

## Evaluation

The evaluation installed and ran Web Awesome, FAST, AG Grid (server-side row model), Vaadin Grid and zag.js, using
headless Chrome and Node. All five have runtime dependencies, so under the no-runtime-dependency rule none of them can
be a dependency. Each serves as a reference for specific parts.

| Library     | Version, license                                        | Reference for                                                                                                                            | Doesn't fit because                                                                                                      |
| ----------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Web Awesome | 3.14.0, MIT                                             | Token naming grid; manifest shape; layer list                                                                                            | Registers on import with fixed names; shadow DOM only; server render inlines all styles per instance; no collections     |
| FAST        | fast-element 3.1.2, MIT                                 | Hydration markers and repeat reconciliation; per-registry `define({ name, registry })`                                                   | No component layer for v3 (fast-foundation needs fast-element 1.x); shadow/light chosen per definition only; no manifest |
| AG Grid     | 36.2.0; server-side row model is Enterprise, commercial | Block cache API; select-all-except state shape; max-height probe                                                                         | Commercial; not a custom element; lands off by hundreds of rows at 10^10; 528 KB gzipped core                            |
| Vaadin Grid | 25.3.5, Apache-2.0                                      | Virtual count plus offset (lands exactly); part names; keyboard navigation and accessibility mixins                                      | Registers on import; array cache breaks past 2^32; selection holds items, no select-all with a provider                  |
| zag.js      | 1.47.0, MIT                                             | Interaction state machines (menu with pointer intent, combobox); controllable state triple; dismissable layer stack; typeahead; tabbable | Collections in memory only; selection a full `Set`; needs `process` shimmed unbundled                                    |

Not verified:

- Web Awesome's hydration in a browser, and its gzipped size.
- Vaadin's keyboard and accessibility mixins were read after the slice (see The listbox).
- Whether AG Grid's select-all is meant to follow the active filter.
- Native scrolling in either grid.

## Build order

**Done:** the listbox slice, as below, then its gaps: every browser proof point in Firefox and WebKit as well as Chrome,
with the row cap set from the smallest measured limit; the listbox checked against the APG pattern, Vaadin's keyboard
and a11y code and axe-core; typeahead with a source capability; behaviors readonly to their views. What it settled is
under Collections, Focus scopes, DOM and Styling. The listbox's API is in Components.

The first step is one vertical slice: a listbox over a ten-billion-item source, server-rendered and hydrated, in both
DOM modes. It takes these pieces:

- **`@interact/core`:** controllable state, the data source interface and the in-memory source, selection, and focus
  scopes.
- **`@interact/dom`:** templates with holes, the DOM renderer, the string renderer, hydration, registration with a
  prefix, and style adoption in both DOM modes.
- **`@interact/components`:** a listbox, meaning its behavior, its default view with virtualization, and its structural
  CSS.
- **`@interact/theme`:** the global tokens it uses.

It comes first because it is the smallest component that touches every settled decision at once. It also covers every
point the evaluation flagged as unverified or broken elsewhere:

- one stylesheet working in both DOM modes;
- sharing styles across declarative shadow roots;
- landing exactly at 10^10;
- a bounded cache;
- selection as a filter plus exceptions;
- keeping focus on a virtualized item.

Its pieces are also what comes next is made of. The menu, the palette and the combobox are listbox behavior plus a focus
scope and an overlay, and the command bridge feeds the menu and palette. After that, keybinds' elements can be replaced
and deleted.

## Settled with the owner after the first draft

1. **Bridge freshness.** The bridge accepts an optional change notification and is live where the command system
   provides one (see Components).
2. **Package boundaries.** The five packages stay, and each is usable on its own.
3. **Wrappers.** Typed declarations for every mainstream framework, and wrappers where its own custom element handling
   falls short of idiomatic (see Generated wrappers and types).
4. **The slice's gaps** (closed): Firefox and WebKit with the row cap from the smallest real limit; the APG pattern,
   Vaadin's keyboard and a11y code and an accessibility checker; typeahead as an optional source capability, searching
   what's loaded otherwise; no readonly-parameter exemption per component (oxlint has no pattern form, so behaviors are
   readonly types instead). Variable row heights wait.
5. **Order.** The listbox slice comes first. Bringing keybinds under the repo's rules (its 5,369 lint diagnostics and
   206 casts) is its own task after that.
