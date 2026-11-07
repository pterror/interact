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
  every strictness option (`tsconfig.base.json`), and oxlint type-aware (`.oxlintrc.json`) with every category but
  restriction, over the plugins this code uses, and the restriction rules that catch defects turned on one by one. Rules
  whose only effect is the code's shape (sizes, counts, ordering, one of two equal spellings) are off: they split code
  by line count instead of by responsibility. oxfmt formats everything (`.oxfmtrc.json`). `bun run check` runs all
  three, and `test/rules.test.js` enforces the no-casts rule.
- One module per part, and one test file per module that passes when run alone.
- An app ships only what it uses. For keybinds this meant one module per input and per piece of syntax, and it took the
  keyboard-only build from 5.1 KB to 2.57 KB gzipped (`packages/keybinds/TODO.md`). The same holds here. Each behavior,
  view, renderer and model is its own module, and whatever is optional is passed in rather than imported.
- Syntax or options whose module isn't loaded are an error that names the module. They never silently do nothing
  (`packages/keybinds/src/core.js:66`).

## Packages

The package split is not decided: "the `interact` library seems designed wrong, smells monolithic already which makes me
deeply uncomfortable" (owner, 2026-11-04T13:27:42). Each package is usable on its own.

Dependencies only point down this list. So far each new package is a manifest only; its first module comes with the
first build step.

| Package                | Holds                                                                                                                                                                    | DOM        |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| `@interact/core`       | The extension mechanism and the list pipeline; controllable state, events, data sources, selection, focus, layers, placement                                             | none       |
| `@interact/dom`        | Templates with holes; DOM renderer, string renderer, hydration; custom element base; registration; style adoption; overlays; view plugins and the default list rendering | yes        |
| `@interact/components` | Each component's behavior and default web view, its structural CSS, and the command bridge                                                                               | yes        |
| `@interact/theme`      | The default visual theme: tokens and their values                                                                                                                        | CSS only   |
| `@interact/codegen`    | Development tool: generates typed declarations and framework wrappers from a Custom Elements Manifest                                                                    | build time |
| `keybinds`             | The standalone command and binding engine                                                                                                                                | yes        |

keybinds depends on none of the others, and none of the others depend on it (**Settled**: "Keybinds' core stays
standalone"). The bridge in `@interact/components` meets keybinds through two operations and imports nothing from it.

## Extensions

### The model (Settled with the owner, as good enough for now)

The library was monolithic: virtualization was built into the listbox, the menu, the palette and the combobox
(`virtual-rows.js`, `scroll-rows.js`, `rows-view.js`, row measuring, `rows-styles.js`, with core's block cache), so
every list carried it and every new feature needed support built in. The owner's definition: "if you have to build
support for every feature in then it's wrong." Virtualization came from a requirement that every collection component
work the same from ten items to ten billion; the owner never decided it for this library (it was another app's), and it
is dropped. The model that replaces it, with CodeMirror 6's facets, state fields, view plugins and transactions with
effects as prior art:

- A component is a small core plus extension points. Extensions read and change its state, handle its input, transform
  its items and wrap its rendering, without the core anticipating them.
- The built-in features (keyboard navigation, typeahead, selection, the default rendering, windowing) are extensions
  written against the same API an app uses. A feature that can't be written as an extension means the API has a gap, and
  the API is fixed; the feature is never built into a core.
- Rendering is a pipeline extensions step into: a list stage, then an item stage. The default rendering is the last
  extension, and replaceable.
- The list stage works on a lazy source, never on materialized items: a count, items by range, the position of an item.
  An array is a trivial source. List-stage extensions turn a source into a source. Filtering, sorting and grouping that
  can't be done lazily are pushed down to the source as a query, which it answers with its own indexes.
- Changes go through transactions carrying effects ("reveal item i", "selection moved"). Extensions send and handle
  them; the core only delivers them.
- Windowing is one extension: its own state (scroll offset, measured sizes), watching the scroll container, mapping the
  list stage to the visible slice plus spacers, handling "reveal item i". Neither the menu nor keyboard navigation knows
  it exists. Without it, "reveal" falls back to scrolling the element into view.

### The mechanism (Proposed, built)

DOM-free in `@interact/core`; what needs the page in `@interact/dom`.

- **State** (`state.js`). `defineField({ create, update })` is a state field: a value made with the state, and changed
  only by `update(value, transaction)`. `defineFacet(combine)` (or `listFacet()`) is a facet: extensions each give it an
  input with `facet.of(input)`, and `state.facet(facet)` is their combination. `defineEffect()` is an effect type;
  `type.of(value)` is an effect, `effect.is(type)` narrows one, and `transaction.effectsOf(type)` gives a transaction's
  values of a type. An extension is a field, a facet input, a plugin, or any nesting of lists of them; the same part
  given twice counts once, so extensions include what they depend on. `precedence(level, extension)` orders parts
  (`highest` to `lowest`, then the order given). `State.create(extensions)` makes a state, and
  `state.update({ effects, filter })` a `Transaction` with `startState`, `state` and `effects`. Fields work out their
  new value the first time it is asked for, so one field's update can read another's new value in any order; a field
  needing its own value is an error. Every field is worked out before the transaction is done, and the new state keeps
  no link to the old.
- **Controlled state.** `transactionFilter` filters every transaction's effects unless it says `filter: false`.
  `controlled(type, heard)` hands a piece of state to the app: effects of that type are dropped and heard as requests,
  and the app applies what it decides with `filter: false`. That is the settled controlled/uncontrolled model (see
  Components) on transactions; `Controllable` stays only for `Layer`'s open state, which the overlays share.
- **Store** (`store.js`). `new Store(extensions)` is a component's live state: `state`, `dispatch(spec)` (a transaction
  dispatched while another applies goes right after it, in order), `handle(input)`, `subscribe(listener)` (after the
  plugins), `plugin(plugin)` and `destroy()`. An input is an effect (`keyInput`, `inputs.js`; a list's `press`);
  `handle` offers it to the `inputHandler` facet's handlers in precedence order until one takes it: `true` takes it and
  tells the page to prevent the default, `'keep-default'` takes it and leaves the default to happen (a key that edits a
  text field's text), `false` passes it on. `definePlugin(store => ({ update, destroy }))` is a plugin: a life beside
  the state (a timer, a subscription) that hears every transaction and may dispatch its own. A `Store` is a behavior in
  the sense of Components: it has `subscribe`, so `component()` renders it.
- **Queries** (`query.js`). `defineQuery()` is a kind of question with input `Q` and answer `A`:
  `query.ask(source, input)` gives `{ answer }` (at once or a promise) or undefined when the source doesn't know the
  query. A source answers through its optional `ask(question)`: `query.input(question)` reads a question that is the
  query's, and `query.answer(value)` makes the answer. Only the query can read its own questions and answers, so this is
  typed with no casts.
- **Sources** (`source.js`). `ItemSource<T>` is the lazy source: `count`, `read(start, end)` (at once or later), `key`,
  `subscribe` for changes, and optional `positionOf(key)` and `ask(question)`. `Source<T, F>`, which the components read
  now, is an `ItemSource` with the selection filters and `findPrefix` named in it; when the components are rebuilt those
  become queries of the extensions that ask them.
- **The list pipeline** (`list-pipeline.js`). `listPipeline(source)` makes one list's pipeline, `ListPipeline<T, R>`,
  where `R` is what it renders as (a template in the page, a string in tests, a terminal's lines later). Its `extension`
  holds the source (`source`, set by `setSource`), the list, and a plugin dispatching each change the list reports as
  `changed`. A component with two lists has two pipelines, and an extension is written against the one it is given.
  - The list stage. `transform` steps each make a source from the one before, in precedence order from the source: a
    step is `{ depends, apply }`, and `apply` runs again only when its input source or what `depends(state)` gives
    changes (`Object.is`). `listOf(state)` is the list; every position in an effect is a position in it. `rows` steps
    choose what renders: from every position, rows of `{ kind: 'item', position }` or `{ kind: 'gap', from, to }`
    (positions not rendered), read one at a time so a step over a long list makes only what it keeps. `keep` gives
    positions that must render (the active item, so focus never falls out); `visible` says which positions show, from
    whichever extension knows.
  - Positions in fields: `mapPosition(position, transaction)` moves a position through the `changed` effects a
    transaction carries, and gives undefined when its item went or the list was replaced (a new source, a step applied
    again). An extension that keeps an item across a replacement keeps its key and asks `positionOf`.
  - The item stage: `item` steps are `(row, next, state) => R`, outermost first; a step decorates by calling `next` and
    replaces what comes after by not calling it. The container stage: `container` steps render the rendered rows (each
    with its key) together, the same way. Rows and the container take attributes from every extension (`attributes`,
    `containerAttributes`; `part`, `class` and `style` joined, otherwise the first in precedence order).
  - `render(state)` reads the items of the rows rendered, a run of positions at a time; an item a source gives only
    later renders as not read yet (`item: undefined`), and the source reports it as `changed` when it arrives.
  - `reveal` asks for a position to be shown; `reveals` says an extension shows revealed items itself.
- **In the page** (`@interact/dom`). A hole standing alone in a tag, `<div ${attributes(values)}>`, takes attributes by
  name, so a rendering can carry attributes it never names (`template.js`, rendered, written on the server and adopted
  like any hole). `viewPlugin((store, root) => ({ rendered, destroy }))` is a view plugin: made when the view first
  renders, given the element the view is in, told after each render of the transactions applied since the one before,
  and destroyed when the element leaves the page (`store-view.js`). `storeView({ kind, styles, render })` is a `View` of
  a store for `component()`. `defaultRendering(list, { text, role, rowRole, label })` is the last step of the item and
  container stages, at `lowest`: the list as an element with every extension's container attributes, an item row as an
  element with its text and every extension's row attributes (`data-position`, `role`, `part="row"`), a gap as an empty
  element whose size the extension making it sets through attributes. Its view plugin hands keys to the store as
  `keyInput`s and presses on rows as the list's `press`, and, unless `reveals`, brings a revealed row's element into
  view (`scrollIntoView({ block: 'nearest' })`).
- **Gaps the listbox found, fixed in the mechanism (Derived, built with it):**
  - A list's pipeline knows its source's own type: `ListPipeline<T, R, S>`, so an extension can ask more of the source
    than an `ItemSource` has (selection, the source's filters). The pipeline is invariant in `S` (`setSource` takes an
    `S`), so an extension is generic in it.
  - What an item is called is the list's `text` facet (a string or number as itself by default), read by the default
    rendering and by typeahead alike; the default rendering took it as an option before.
  - A press says how many presses in a row it makes (`count`, from the click's `detail`), so a double press activates.
  - `findPrefix`, the query typing asks a source (`find-prefix.js`), answered by `MemorySource`.
  - A store's view shows what its extensions say (`viewContent`, in `store-view.js`), so one view serves every instance,
    each with its own store and list; `storeView` took a `render` before.
  - `component()` follows its behavior before the view first hears it rendered, so a view plugin that dispatches then
    (windowing measuring after adopting server markup) is rendered; it was missed before.
- **Gaps the menu, palette and combobox found, fixed in the mechanism (Derived, built with them):**
  - A view inside another's: a submenu is a menu of its own, a store, shown in an overlay inside its menu's.
    `mountStore(store, element)` runs a store's view plugins on any element (`storeView` is built on it), and an element
    belongs to the innermost view mounted around it: `inOwnView(root, node)`, `ownElement(root, selector)`. The default
    rendering, windowing, focus entering and the components' own view plugins act only on their own view, so a key, a
    press or a scroll in a submenu is never its menu's too. `contentOf(store)` is what a store's view shows, for a view
    that renders another's inside its own.
  - A field controlling a list (a combobox's, the palette's search field) keeps its keys: the default rendering marks
    its list `data-list` and takes keys only from inside it.
  - The pointer over a row: the list's `hover` input (`position`, the pointer's `x` and `y`, whether the list has
    focus), which the default rendering reports and `followPointer` takes, and a submenu's pointer intent before it.
  - An input taken while its default still happens: `'keep-default'` (above). A closed combobox keeps the list's keys
    from it without stopping Page Down scrolling the page, and an editable one's Home and End move the cursor while it
    puts the active option back in the field.
  - A field naming the active option instead of the list: `active.descendantIn(state)` is public, and the list's own
    `aria-activedescendant` is left out by an attribute of higher precedence.
  - A windowed list as short as its items: `windowing(list, { shrink: true })` shows no more rows than there are items
    (a menu, a combobox's popup); without it a list shows `rows` whatever it has (the listbox, the palette, whose height
    must not move).
- **Tests:** `state.test.js`, `store.test.js`, `query.test.js`, `list-pipeline.test.js` in core (among them a keyboard
  navigation and a windowing written as two extensions that name neither each other nor anything the core knows of them,
  meeting only through `reveal`, `keep` and `reveals`); `store-view.test.js`, `default-rendering.test.js` and the spread
  hole's in the template modules' tests in dom. The store view and default rendering run in all three browsers, both DOM
  modes, as the rebuilt listbox's view (`listbox-view.test.js`).

### The features on it

**Derived, built** for the listbox (see The listbox, under Components, and Windowing, under Collections), each an
extension of a list pipeline, with the gaps above fixed in the mechanism: the active item (`active(list)`, given to the
extensions that act on it rather than looked up, so they share one field without a registry), keyboard navigation,
typeahead, selection, focus entering, the default rendering and windowing. Two choices the plan left open: a move says
whether Shift was held and whether focus entering made it (`ActiveMove`), which selection reads; and selection follows a
move in single mode by a transaction filter, so the app's `controlled` hears it as a request. A component's own
rendering (a menu item with its shortcut and check mark) is an `item` step above the default one that calls `next` for
the gap rows it doesn't render itself, and reads every extension's attributes (`attributesOf`) for the rows it does.

**Derived, built** for the menu, palette and combobox (see each, under Components), on the same extensions and the gaps
they found: the active item following the pointer (`followPointer`), submenus (`submenus`), each component's core, and
the default set each is made of (`menuExtensions`, `paletteExtensions`, `comboboxExtensions`).

**Proposed, not built yet:**

- **Drag to reorder:** a view plugin listening for pointer events on the view's element (rows found by `data-position`),
  a field of the drag (from, over), a `rows` step showing the dragged row where it would land (reordering rows, not the
  list, so no position anyone holds moves), `part` through attributes; the drop is the app's to make on its source,
  whose `removed` and `inserted` changes move every position held.
- **Load as you scroll:** the app's source grows, reporting an insertion at its end; a view plugin watching the last row
  (an `IntersectionObserver` on `[data-position]` of the last position, or `visible` with windowing) calls the app's
  `loadMore`; a field of whether it is loading, and a `container` step wrapping the list with a status after it while it
  is.
- **Grouped sections:** the list's items are entries, an item or a group's heading; a `transform` step puts headings in
  lazily from where groups start, which it asks of the source as a query (an in-memory source answers by scanning once);
  headings are passed over by navigation's `skip`, never selected, and rendered by an `item` step.

### Open

- Grouped sections in ARIA: the APG groups a listbox's options in `role="group"` elements, which a flat item stage can't
  nest. Flat headings are the first build; whether rows need a nested container stage is open.
- Reconfiguring a running store (CodeMirror's compartments: switching a list from single to multiple selection) has no
  mechanism yet; nothing in the four proofs needs it.
- Several lists of one store in one view: a view inside another's is its own (`mountStore`), but two pipelines of one
  store in one view would both hear each other's keys and presses, since the default rendering finds its list by
  `data-list` and its rows by `data-position`.
- An extension can't bring its own stylesheet: views adopt one stylesheet, fixed per view. The menu's, palette's and
  combobox's join windowing's structure (`windowingStyles`), as the listbox's does, so it is there whether or not the
  extension is included.
- Selection selects in the source (its filters are the source's), so a list-stage step that makes another list of it is
  an error when it selects. Asking the filters as queries of the list, which a step could answer or pass on, waits on
  the selection model (Questions for the owner, 1).

## Components (Settled, with the derived parts marked)

A component is its behavior, written once as a plain API, plus a default view anyone can replace. The behavior is a
store configured with extensions (see Extensions): a small core, and its features (keyboard navigation, typeahead,
selection, the pointer, submenus, windowing, the rendering) as extensions beside it. The listbox, the menu, the palette
and the combobox are built so. The menu, the palette and the combobox are stores of their own (`Menu`, `Palette`,
`Combobox` extend `Store`), made from their core (`MenuCore`, `PaletteCore`, `ComboboxCore`) and the extensions an app
gives as `extensions(core)`; `menuExtensions()`, `paletteExtensions()` and `comboboxExtensions()` are what each is made
of by default, and give nothing the core knows of. Each has methods for what an app and a view do to it (`open`,
`close`, `choose`, ...), which dispatch effects or handle inputs; nothing is built in that an extension couldn't do.

- **The behavior** is a class with no DOM in it. It has methods, observable state and events, and uses a state machine
  only where modes and timing call for one: a menu opening and closing with pointer intent, a combobox, a tooltip's
  delays. A component without modes is a few fields and methods. A behavior can be driven by tests, by the DOM, or later
  by a terminal view. **Derived:** the menu's timing came to one timer (a submenu opening once the pointer rests on its
  entry) and an area the pointer may cross (`submenus.js`, the pending entry a field whose timer a plugin keeps), so
  core has no state machine; the combobox needed none either.
- **The view** belongs to one target family. Web views are templates with holes, used by three things:
  - a DOM renderer;
  - a string renderer, for server rendering, which emits Declarative Shadow DOM when the instance uses shadow DOM;
  - hydration, which adopts the server's markup instead of replacing it.

  Custom elements join a behavior to a web view. Terminal views can come later.

- **State.** Data goes in and events come out. Each piece of state is either controlled (the app owns it and hears
  change requests) or left to the component. zag.js does this with a `value` / `defaultValue` / `onValueChange` triple
  for each piece of state (`@zag-js/listbox` `dist/listbox.types.d.ts:60-80`, read in the evaluation). **Derived:**
  every component handles control the same way, on transactions: `controlled(type, heard)` (see Extensions) drops the
  effects that would change a piece of state and hands them to the app as requests, and the app applies what it decides
  with `filter: false` (the combobox's `setValue`). Left to the component, the value changes at once. A layer's open
  state, which the overlays share outside any store, is a `Controllable` (`packages/core/src/controllable.js`): the
  component calls `request(next)`, every request is heard (`onRequest`), controlled it changes only when the app calls
  `set`, and `control(controlled)` hands it to the app or back after construction, which a custom element created by the
  browser needs.
- **Behaviors are readonly to their views (Derived).** A behavior's state is in its store's fields (and a layer's
  `Controllable`s), held in readonly fields, and it changes only through transactions and methods; nothing on a behavior
  is assignable. oxlint's `prefer-readonly-parameter-types` enforces this for every function a behavior is handed to,
  with no exemption per component: its `allow` takes exact names only (probed in oxlint 1.90.0: a glob path or a regex
  name clears nothing), so the readonly type is what makes every future component pass.
- **Commands.** Components know nothing about commands. A bridge needs only two operations: "list the commands available
  in a context" and "run one by id". With those it keeps buttons, menus and the palette in step with any command system,
  and keybinds is one such system. It also accepts an optional third, "tell me when the list changes" (**Settled**):
  where the command system provides it the bridge is live, and otherwise it looks again when the app asks or a menu or
  the palette opens. **Derived, built:** `CommandBridge` (`packages/components/src/command-bridge.js`) takes a
  `CommandSystem` of `list(context)`, `run(id, context)` and optional `subscribe(listener)`; a listed command has its
  id, label, `enabled`, and optionally a shortcut, category and description. `refresh()` is the app's "look again".
  `showCommands(menu, bridge, context)` fills a menu (disabled where a command can't run; listed when it opens, and
  again on every change while open, in place, so the active item stays) and runs the command chosen, in the context it
  was chosen in, once the menu has gone and focus is back where it was (`Layer.afterHidden`, see Overlays), so the
  command acts on what the person was on; `bindCommandButtons(root, bridge, context)` does the same for `data-command`
  buttons. keybinds' side is `hub.commandSystem()` (`packages/keybinds/src/command-system.js`): a context is a menu's
  tag, or undefined for every command; hidden commands are never listed; it is live through a `context` event the hub
  sends whenever its context is synced, which refreshing does too. Neither package imports the other: the shapes match,
  and a root test joins them (`test/command-bridge.test.js`). The adapter is a hub method rather than a function taking
  the hub because a `CommandHub` can't be a readonly parameter (its getters expose element classes); the method hands
  closures over its own operations to `systemOf`.
- **Searching commands (Derived, built).** A palette finds commands by what is typed. A command system may have a fourth
  operation, `search(query, context)`, answering at once or later with the commands found, best first, each with the
  `positions` in its label the query matched (UTF-16 code units) for marking them. Ranking stays with the system that
  knows how to rank (keybinds' scorer and history, or a server); the components never rank its commands for it. Without
  `search`, `bridge.search` finds commands among those `list` gives, by label (`matchCommands`, `command-match.js`):
  ignoring case and accents with the comparison typeahead uses, labels starting with the query first, then a word in
  them starting with it, then any other match, each tier in the order listed. One source of truth either way: the
  system's list or the system's search. A search answers with every command it found, so memory is per command found,
  never per command the system has; a system with very many matches keeps its answer short itself. The palette numbers
  its searches and drops an answer to any but the last.
- **Generated code.** Framework wrappers and typed declarations are generated from a Custom Elements Manifest
  (`@interact/codegen`).

### The listbox (Derived, built on extensions)

- **The core** (`listbox(current, { id, label })`, `listbox.js`) is what makes a list a listbox and no more: the list is
  a `listbox` with an accessible name and its rows are options with ids (`<id>-<position>`, unique in the page for light
  DOM); Enter or a double press activates an item (the `activated` effect, which an app hears from the store's
  transactions); and the list is what the listbox's view shows (`viewContent`). Everything else a listbox does is an
  extension beside it, written against the same API an app would use, none knowing another's insides:
  - `active(list)` (`active-item.js`): the active item, the one extension the others are given, so they share one field.
    A position set by `moved` effects and moved by `mapPosition`, nothing once its item goes or the list is replaced;
    `keep` of it; `part="active"` on its row and the list's `aria-activedescendant`, named by the id some extension
    gives the row, only once its item has arrived; a press makes an item active unless an extension before it takes the
    press. Its `skip` facet (items focus passes over) and `entering` facet (where focus entering may go) are what others
    give it; `landing()` honors `skip` for every extension that moves.
  - `navigation(current)` (`navigation.js`): the arrows, Home, End and the page keys, as `moved` and `reveal` in one
    transaction; a page is as many rows as `visible` says show, else ten.
  - `typeahead(current, { now })` (`typeahead.js`): the typing rules below; its field is what was typed, when, and a
    count of searches, the time carried in the `typed` effect.
  - `selection(current, { mode })` (`list-selection.js`): single or multiple; its field is the selection and the anchor,
    set by `selected` and `anchored` effects; in single mode a transaction filter adds the selection to the transaction
    that moves the active item (none for focus entering), so no second one; `aria-selected` and `part="selected"` on
    rows, `aria-multiselectable` on the list; `controlled(selection.selected, ...)` hands it to the app. Without it a
    list selects nothing (a menu's `none`).
  - `focusEntering(current)` (`focus-entering.js`): a view plugin hearing focus come into the view's element.
  - `windowing(list, { rows, top })` (`windowing.js`, structure in `windowing-styles.js`): see Windowing, under
    Collections. Without it the listbox renders every row, and `reveal` falls back to the default rendering bringing the
    row into view.
  - `defaultRendering(list)` (`@interact/dom`): the elements, last.
- `listboxView()` is the store's view with the listbox's stylesheet, and `listboxElement(create)` the element class;
  `create(host)` makes each instance's store from the extensions the app wants. Parts: `list`, `option`, `active`,
  `selected` (were `viewport`, `option-active`, `option-selected`), `gap`.
- **Keyboard (Derived, checked against the WAI-ARIA APG listbox pattern and its example code):** arrows, Home, End and
  the page keys move the active item; Space toggles it; Enter activates it. In multiple mode, Shift with a move or with
  Space selects from the anchor through the active item, Ctrl+Shift+Home/End select from the active item to the first or
  last and go there, and Ctrl+A selects everything. The anchor is the item last chosen (the APG's "most recently
  selected"); moving doesn't move it, and a Shift move before any choice starts from where the move started. The anchor
  now moves with the source's changes, as the active item does.
- **Focus entering (Derived, the APG listbox pattern):** the active item stays and is shown. With nothing active, focus
  goes to the first selected item and shows it, when the source can place items (`findsSelected`, below); the answer is
  dropped if a key made something active first, or the source changed. Without that capability, or with nothing
  selected, it goes to the item last chosen, or the top item shown (tested in happy-dom, `focus-entering.test.js`, and
  in all three browsers in both DOM modes, `listbox-view.test.js`).
- **Typeahead (Derived, settled with the owner):** a character goes to the next item whose text starts with it, and
  characters typed within 500ms (the APG example's wait) to the next whose text starts with all of them, going round to
  the start. The whole of what was typed is always looked for first, so "aa" reaches "Aaron"; only when nothing starts
  with it, and it is one character typed again and again, does it move on to the next item starting with that character.
  A space continues what is being typed (typeahead's input handler is at `high`, before selection's Space). Text is the
  list's `text` facet, compared by `startsWithTyped` (`packages/core/src/text.js`): from its start, ignoring case and
  accents. It asks the list the `findPrefix` query (`packages/core/src/find-prefix.js`), which `MemorySource` answers;
  unanswered, it looks among the rows rendered. An answer that comes later is dropped if more was typed meanwhile.
- **Accessibility (Derived):** axe-core 4.14.0 finds nothing in the listbox as the server renders it, or live, focused
  with items chosen, with the theme and without, in both DOM modes in Chrome 156, Firefox 157 and WebKit 27.2
  (`listbox-view.test.js`, run again on the rebuilt listbox: 96 tests, all passing). It first found the no-theme
  selected colors: `Highlight` on `HighlightText` is about 3:1 in Firefox and 4:1 in WebKit, so the fallback is Canvas
  tinted with Highlight under CanvasText. In forced colors a selected option takes the person's own `Highlight` and
  `HighlightText` (tested in Chrome and Firefox, which emulate forced colors; WebKit only matches the media query). The
  active option's outline takes the selected text color on a selected option, where the theme's focus color matched the
  fill.
- **From Vaadin Grid's keyboard and a11y mixins (Derived, read):** `aria-activedescendant` names only an option that has
  arrived, as Vaadin holds a cell's focus event while its row loads (`__pendingBodyCellFocus`); focus entering brings
  the active item into view. Vaadin's guards for a focused element going stale as rows are reused
  (`__updateItemsFocusable`) have no counterpart to need: the active item is a position that moves with the source's
  changes, and options are keyed by item. Its page keys (the active row ends at the edge it moved toward) are what
  `reveal` already does.
- Selecting by position reads nothing, because the source makes a filter for the positions. The selection selects in the
  source, so a list-stage step that makes another list of it is an error when it selects (see Extensions, Open).
- **Not kept:** reading every source through a `BlockCache` and `onError` for failed reads. A source that answers later
  reports its items' arrival as `changed` (the pipeline's contract) and its own failures; a block cache as a list-stage
  step isn't built.

### The menu (Derived, built on extensions)

- **The core** (`MenuCore`, `menu.js`) is what makes a list a menu and no more: the list is a `menu` (`part="viewport"`,
  id `<id>-menu`, named by its label, or a submenu by its entry) and its rows are its entries, each with its role, id
  (`<id>-<position>`) and state (`aria-checked`, `aria-disabled`, `aria-haspopup`) and parts (`item`, `item-active`,
  `item-disabled`, `separator`), shown as its check mark, label, shortcut and a submenu's arrow (an `item` step above
  the default rendering's); focus passes over separators (`skip`) and typing finds items by label (`text`); Enter, Space
  and a press run an item (`chosen`) and close the menus up to the first (`closeAll`), Space leaving a checkbox or radio
  item's menu open; it opens in a `Layer`, at a point for a context menu (`placed`), and nothing is active once it
  closes; it asks for focus to come to its list (`askFocus`, a count its view plugin follows). `Menu` is its store:
  `open('first' | 'last' | 'none')`, `openAt(point)`, `close()`, `closeAll()`, `setItems(source)`, `onSelect`, and
  `active`, `count`, `entry(position)`, `point`, `submenu`, `layer`. Beside it:
  - `submenus(menu, { extensions, wait })` (`submenus.js`): a submenu's entry opens it with Enter, Space or the arrow
    toward the inline end (read from the page's `direction` as an arrow is pressed), focus in it, or with a press, focus
    staying; the arrow back in a submenu closes it, and a submenu closing by itself asks for focus back. A submenu is a
    `Menu` made with the same `extensions`, its content rendered in an overlay after its menu's list (a `container`
    step), its view plugins mounted there (`mountStore`); what is chosen in it is its menu's `chosen` too, and it closes
    when its menu does. The pointer resting on an entry opens its submenu, and the area it may cross on the way there is
    noted as it leaves the entry (see Submenus, below). It says which submenu is open through the core's `opened` facet,
    and its entry's `aria-expanded`.
  - `followPointer(current, { focus: true })` (`follow-pointer.js`): the item the pointer is over becomes active, and
    focus comes to the list; submenus take the pointer's moves before it.
  - `navigation`, `typeahead`, `focusEntering`, `windowing(list, { rows, shrink: true })`, `defaultRendering` (as the
    listbox's).
  - `menuExtensions({ rows, wait })` (`menu-extensions.js`) is that set, each submenu made the same way: what a menu is
    made of today.
- **Entries (`menu-entry.js`, from the APG menu and menu button pages, fetched):** commands, checkbox and radio items,
  separators, and submenus, each with an id; an item may be disabled (focusable, does nothing) and show a shortcut.
  Whether an item is checked is the app's; activating one is reported. The APG doesn't define a `group` role for menus,
  so radio items that go together sit between separators, as its examples do. `menuEntries(list)` is an in-memory source
  that typing searches by label.
- **Collections:** a menu's entries come through a source, like the listbox's. With `menuExtensions` it is windowed, as
  it was, showing as many rows as it has entries, up to `rows` (10); windowed rows don't size the list, so a menu is
  `--interact-menu-width` wide at least. Without windowing it renders whole. Whether a menu includes windowing is the
  owner's (Questions for the owner, 4); the menu's core and its other extensions don't know it.
- **Keys (the APG menu and menu button patterns):** on the button, Enter and Space open on the first item, Down on the
  first, Up on the last. In the menu, the arrows, Home, End and typing move, passing over separators, without wrapping
  (optional in the APG); Enter runs an item, or opens its submenu with focus on its first item, and closes the menus
  above; Space does the same, but leaves a checkbox or radio item's menu open; the arrow toward the inline end opens a
  submenu, the arrow back closes it, and Escape closes only the menu focus is in, focus going back to its parent or to
  the button; Tab moving focus out closes them all. A key is an input to the menu's store
  (`menu.handle(keyInput.of(...))`); `menuKey` is gone.
- **Submenus:** a menu of its own, in an overlay inside its parent's overlay, beside its entry. With the pointer, an
  entry becomes active as the pointer moves over it, its submenu opens once the pointer has rested there 200ms (zag.js's
  wait), and any other closes. Leaving an entry toward its open submenu notes an area (`intentArea`, in core): from just
  behind the pointer to the submenu's near edge and round its far side, zag.js's polygon. While the pointer stays in it,
  crossing other entries changes nothing; once it strays, the next entry it is over takes over, closing the submenu;
  reaching the submenu ends the way there.
- **Views:** `menuButtonView()` and `contextMenuView()` (`menu-view.js`), with `menuButtonElement` and
  `contextMenuElement`, and `openOnContextMenu(target, menu)`, which opens a menu at the point a context menu was asked
  for. Each renders the menu's content (`contentOf`) in an overlay, beside its button (whose clicks and Up and Down are
  the view's, as the APG menu button pattern has them) or at its point, and mounts the menu's view plugins on its
  element. A context menu sits with its corner exactly at the point (no gap).
- **Proven** (`menu-view.test.js`, 66 tests, Chrome 156, Firefox 157 and WebKit 27.2, shadow and light DOM, run again on
  the rebuilt menu): the keys above; Space on a checkbox item; submenus from the keyboard and the pointer, including
  crossing other entries diagonally on the way and straying; a context menu at its point, focus going back to where it
  came from; server markup adopted with its button kept; and axe-core finding nothing with a submenu open.
  `menu.test.js` and `submenus.test.js` drive the stores directly.
- **Keyboard-opened context menus:** the Context Menu key and Shift+F10 open the menu at the start of the focused
  element's bottom edge (the inline end in right-to-left text), not at the point the engine reports: Chrome reports the
  element's centre with `button` -1; an engine giving no point would have put it at 0,0. A request is taken as from the
  keyboard by `button` -1, or by no point and no press count (`menu-element.js`). Headless Firefox and WebKit fire no
  `contextmenu` for those keys at all, so the keys are tested in Chrome and a keyboard-style request in all three.
- **A long menu's size** (windowing's): when only some rows are rendered, each item says its place and the menu's size
  (`aria-posinset`, `aria-setsize`), as ARIA asks for a partial set. Both count separators, since which entries before
  an item are separators isn't known without reading them. A menu rendered whole leaves the counting to the browser,
  which gets separators right. The listbox numbers its options the same way; it has no separators, so its numbers are
  exact.
- **Unverified:** screen readers (only axe); touch; a long menu's numbers when it has separators (they count them).

### The command palette (Derived, built on extensions)

- **Pattern (the APG combobox and modal dialog pages, fetched):** a modal dialog holding an editable combobox (the
  search field, `role="combobox"`, `aria-autocomplete="list"`, `aria-expanded="true"` since its list always shows,
  `aria-controls` the results) whose popup is a listbox of the commands found: list autocomplete with automatic
  selection. DOM focus stays in the field, which names the active command as its `aria-activedescendant`; the active
  command is the one `aria-selected`. That is the APG's combobox exactly, inside the APG's modal dialog: focus moves
  into the dialog on open (to its field), Tab stays inside it (the field is its only stop), Escape closes it, and focus
  goes back to the opener. A dialog with a separate focusable listbox would make every key cross from the field to the
  list and back.
- **The core** (`PaletteCore`, `palette.js`): a modal `layer`, the field's query, the context it opened in (read as it
  opens; its commands are found and run in that context) and whether a search has answered; the results a listbox
  (`part="viewport"`, id `<id>-results`, no Tab stop, no active descendant of its own: the field has it) whose options
  are the commands found (`result`, `result-active`, `result-disabled`, `aria-selected` on the active one), passing over
  commands that can't run; a plugin searching as it opens, as the query changes and as the bridge says its commands
  changed while it is open, only the latest answer shown, what shows staying until it comes, the first command that can
  run active; Enter or a press runs the active command once the palette has gone and focus is back on the opener; the
  arrows and page keys are the results', every other key the field's (`'keep-default'`); and the dialog with its search
  field and a status, and its view plugin showing the dialog modally and hearing the field. Options: `bridge`,
  `context`, `id`, `label` (the dialog's name), `searchLabel` (the field's), `placeholder`, `inactive` (`'show'`:
  greyed, `aria-disabled`, passed over; or `'hide'`) and `extensions`. `Palette` is its store: `open()`, `close()`,
  `type(text)`, `key(key)`, `run(position)`, and `query`, `active`, `count`, `result(position)`, `layer`.
- **Extensions:** `paletteExtensions({ rows })` (`palette-extensions.js`): navigation, `followPointer`, windowing that
  always shows `rows` rows (10) whatever is found, and the default rendering.
- **View:** `paletteView()` (a store view), `paletteElement(create)`, `paletteStyles`. What the query matched is a
  `<mark part="match">`; a command's description, group and shortcut show beside its label. The dialog shows `rows` rows
  whatever is found, and a `role="status"` region lying over the results says when nothing is, so nothing shifts as the
  query changes. Its secondary text is the text's own color at 0.75 opacity: system GrayText on the fill failed axe's
  contrast check (about 3.9:1 on white), as it does for a command that can't run only because disabled text is exempt.
- **Proven** (`palette-view.test.js`, Chrome 156, Firefox 157, WebKit 27.2, shadow and light DOM, run again on the
  rebuilt palette): opening with focus in the field, every command found and the first active as the combobox says;
  typing finding commands and marking what matched; the arrows passing a command that can't run; Enter and the pointer
  running a command once focus is back on the opener; Escape closing and running nothing; Tab staying in the field; the
  same height with nothing found, and the status saying so; axe-core finding nothing open; server markup adopted with
  its field kept, then opening.
- **Unverified:** screen readers (only axe); a remote `search` under load (only a slow in-page one, whose late answer is
  dropped); input methods composing in the field (Enter while composing is left to the input method, untested).

### The combobox (Derived, built on extensions)

- **Pattern (the APG combobox page and its select-only and list-autocomplete examples, fetched):** a field with
  `role="combobox"` controlling a listbox popup; DOM focus stays in the field, which names the active option as its
  `aria-activedescendant`, and that option is the one `aria-selected`. `aria-expanded` follows the popup's layer.
- **Kinds (`kindOf`, `combobox.js`):** select-only (a focusable field showing the option chosen, `aria-haspopup`, a
  fixed source); editable without autocomplete (an input over a fixed source); editable with `list` autocomplete (the
  options are what the app's `suggest(text)` finds, at once or later), with `manual` selection (nothing active until the
  arrows) or `automatic` (the first found active); and `both`, list plus inline completion, always automatic. The
  options are a union type, so `suggest` exists exactly for the kinds that suggest.
- **The core** (`ComboboxCore`, `combobox.js`): a `layer` of its own; the option chosen, the text of an editable field
  (which follows the option chosen) and whether its last edit deleted; the options a listbox (`part="viewport"`, id
  `<id>-listbox`, no Tab stop, no active descendant of its own) whose rows are `option`, `option-active`,
  `option-chosen`; its keys (below), gated by whether the list is open, at `highest` so the list's extensions hear only
  what the combobox leaves them; landing on the option chosen as it opens; suggestions; the inline completion; leaving
  choosing the active option; and the field and popup, with a view plugin hearing the field and placing the popup.
  Options come from a source: opening a select-only one lands on the option chosen through the source's `positionOf`;
  without it, on the first. An app owns the option chosen with `controlled(core.chosen, heard)` among its extensions,
  and sets what it decides with `setValue`. `Combobox` is its store: `open(at)`, `close()`, `toggle()`,
  `choose(position)`, `clear()`, `type(text, deleting)`, `key(key, modifiers)`, `setValue(value)`, and `value`, `text`,
  `completion`, `kind`, `active`, `count`, `option(position)`, `layer`.
- **Extensions:** `comboboxExtensions({ rows, now })` (`combobox-extensions.js`): navigation, typeahead in a select-only
  one, `followPointer`, windowing that shows as many rows as there are options up to `rows` (10), and the default
  rendering.
- **Keys (the APG's):** select-only, closed: Down, Enter and Space open on the option chosen (else the first), Alt+Down
  on the option chosen, Up and Home on the first, End on the last, a character typed on the option it starts. Open: the
  arrows, page keys, Home and End move without wrapping; Enter, Space and Alt+Up choose; typing goes to the option whose
  text starts with what was typed, the whole of it first. Editable, closed: Down opens on the first, Up on the last,
  Alt+Down without moving. Open: the arrows and page keys move (from none, Down to the first and Up to the last); Enter
  and Alt+Up choose; Home, End and the side arrows give the cursor back to the text, no option active, keeping an inline
  completion as typed text. Escape closes, choosing nothing; with the list closed, it empties an editable field
  (`clearOnEscape`, on by default). Enter with an editable list closed is left to the page (a form). A key while an
  input method composes is the input method's (`combobox-field.js`).
- **Leaving:** the field is the popup's anchor, so it counts as inside its layer. Tab or a press elsewhere dismisses the
  layer (`focus-outside`, `outside`), and a combobox that selects by itself (select-only, `automatic`, `both`) chooses
  its active option then, as the APG's select-only example does; Escape never chooses.
- **Suggestions:** only the answer for the text typed last is shown (`Latest`); none found, or the field emptied, closes
  the list.
- **Shared with the palette:** its search field is the same editable combobox field (`combobox-field.js`: the template,
  and `hearField`, which hears typing and keys with the composition check in one place), and its dropping of stale
  answers (`latest.js`). The palette stays its own core: its list is always shown inside a modal dialog, with no layer
  of its own.
- **No state machine in core:** the only modes are the layer's open state and typeahead's timer, and the only timing is
  that timer; landings and suggestions are answers of which only the latest counts.
- **View:** `comboboxView()` (a store view), `comboboxElement(create)`, `comboboxStyles`. The popup is
  `popover="manual"`, anchored below the field with `focus: 'stay'`, at least as wide as the field and, windowed, no
  taller than its options; a press in it keeps focus in the field. An inline completion shows after what was typed,
  selected.
- **The listbox is no Tab stop:** it says `tabindex="-1"`, as the palette's results do. Without it, browsers made the
  scrolling listbox a Tab stop of its own, and Tab from the field went into it.
- **Proven** (`combobox-view.test.js`, Chrome 156, Firefox 157, WebKit 27.2, shadow and light DOM, run again on the
  rebuilt combobox): the select-only keys, a character typed, Tab choosing and moving on, choosing by pointer with focus
  kept in the field, Escape keeping the choice; editable suggestions, Down and Enter choosing, two Escapes closing then
  emptying; inline completion selected after what was typed and chosen with Enter; opening on the option chosen through
  `positionOf`; server markup adopted with its field kept, opening on the option chosen; and axe-core finding nothing
  closed or open, in a page whose content is in a landmark.
- **Unverified:** screen readers (only axe); touch; a remote `suggest` under load; input methods composing in the field.
- **Inside another layer (Derived):** Escape with the list closed empties the field and leaves the layer open; the next
  Escape closes the layer. Shown in a modal dialog in all three engines, both DOM modes (`combobox-view.test.js`).

### Names the rebuild changed (Proposed, the owner's to approve)

Kept where they could be: every part the menu, palette and combobox had on a row or a list stays (`viewport`, `row`,
`item`, `item-active`, `item-disabled`, `separator`, `check`, `label`, `shortcut`, `arrow`, `result`, `result-active`,
`result-disabled`, `match`, `description`, `category`, `option`, `option-active`, `option-chosen`, `overlay`, `submenu`,
`button`, `dialog`, `search`, `results`, `status`, `combobox`, `field`, `value`, `placeholder`, `popup`), as do the
tokens, the ids and the element kinds. Changed, because the default rendering and windowing give them:

- **Parts added:** `list` on every list (beside `viewport`), `active` on the active row (beside `item-active`,
  `result-active`, `option-active`), and `gap` for the rows windowing doesn't render.
- **Parts gone:** `spacer` (windowing places rows by gaps, with no spacer element), and the combobox's `list`, which was
  an element around its listbox: the listbox itself is `list` now, as in the listbox.
- **Public names:** `menuKey` is gone (a key is an input to the menu's store). A menu's, palette's and combobox's `rows`
  (and the combobox's `now`, the menu's `wait`) moved to `menuExtensions`, `paletteExtensions` and `comboboxExtensions`,
  and each takes `extensions`. `Menu`, `Palette` and `Combobox` are stores: their `list` (a `Listbox`) is their core's
  (`core.list`, a list pipeline), and they have `active`, `count` and `entry`, `result` or `option` instead; the menu's
  `takeFocus`, `activate`, `openSubmenu`, `pointTo` and `headFor`, the palette's `dispose` (now `destroy`) and the
  combobox's `suggestions`, `point`, `chooseActive` and `keepCompletion` are gone or its core's; the palette's `query`
  and the combobox's `value` and `text` are values, not `Controllable`s (the combobox's `controlled(core.chosen, ...)`
  and `setValue` replace `value.control` and `value.request`). Types: `Menu<F>` and `MenuEntry<F>` lost their filter
  type, `Combobox<T, F>` is `Combobox<T>`, and `paletteElement` and `comboboxElement` make elements of a `Store`.

### What moves out of keybinds (Derived)

The palette, both context menus and `data-command` buttons have moved: keybinds' `CommandPalette`, `BasicContextMenu`
and `ContextMenu`, their shared menu modules, the hub's wiring for them (`palette`, `menu`, `openPalette`, `openMenu`,
`bindButtons`) and their part of `styles/palette.css` are deleted. A `CommandHub` drives `@interact/components`'
`Palette`, `Menu` and `bindCommandButtons` through `hub.commandSystem()` and the `CommandBridge`, and neither package
imports the other (`test/keybinds-components.test.js`: keys opening the palette, keybinds' scorer ranking what is typed,
a context menu and a button following the hub's context live, axe clean; Chrome, Firefox and WebKit, both DOM modes).

- **Ranking stays keybinds'.** `hub.commandSystem({ matcher, scorer, source, sourceDelay })` lists a menu's commands
  (ranked by a scorer if given, as the old scored menu did) and searches with `searchCommands`, its matcher and scorer;
  a `source` of further commands is asked once typing pauses, as the old palette's was, and its commands run from its
  answer (`command-system.js`).
- **Overlays take the keyboard by the platform's own signal.** keybinds' components marked themselves
  `data-keybinds-modal`; overlays made elsewhere know nothing of keybinds. An open `<dialog>` or popover on an event's
  composed path now keeps bindings from firing as a marked element does (`modal.js`). This also applies to a page's own
  open dialogs and popovers, which before took the keyboard only when marked.
- keybinds keeps its sources, store, listening, `held` and `axis`, and still has the cheatsheet, the settings panel and
  the radial menu as its own web components (`packages/keybinds/TODO.md`).

What the deleted components did, and where it is now:

| Feature                                          | Now                                                                                               |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| Palette opened with `$mod+K` (`auto-trigger`)    | A hub command whose `execute` opens the `Palette` (guide, root test)                              |
| `placeholder`                                    | `Palette`'s `placeholder` option (none unless given)                                              |
| `hide-inactive`                                  | `Palette`'s `inactive: 'hide'`                                                                    |
| `matcher`, `source`, `sourceDelay`               | `hub.commandSystem()` options                                                                     |
| Bindings shown through `inputs`                  | Each listed command's `shortcut`: its first binding through any of the hub's inputs               |
| Matched letters highlighted                      | Search results' `positions`, now only from the label (a match on the id marked the wrong letters) |
| `execute` event                                  | Wrapping the command system's `run` (guide)                                                       |
| `close` event                                    | The component's `layer.open`                                                                      |
| Menus' `auto-trigger` on `contextmenu`, `target` | `openOnContextMenu(target, menu)`                                                                 |
| `menu` tag, `position`                           | `showCommands(menu, bridge, () => tag)`, `menu.openAt(point)`                                     |
| Scored menu's `scorer`, `history`                | `hub.commandSystem({ scorer: defaultScorer(history) })`                                           |
| Scored menu's search field                       | **Open:** not built (below)                                                                       |
| Scored menu's "▾ N more" row, `maxVisible`       | **Open:** not built (below)                                                                       |

**Open (the owner's):** whether a context menu gets a search field above its items, as keybinds' scored menu had, and
whether a menu shows its top few (seven by default) with a row revealing the rest, as that menu did. Menus here follow
the APG menu pattern, which has neither: typing moves to an item by its first letters, and a long menu scrolls.

These users still install keybinds from its own repository (`"keybinds": "github:pterror/keybinds"`):

- `~/git/cyoa/package.json:27`
- `~/git/pteraworld/package.json:23`

That repository is untouched.

## Collections (Settled models; mechanics Derived)

Lists, menus, grids and trees all take the same kind of data source (**Open:** whether the owner decided this; see
Questions for the owner).

### Data source

**Settled:** items by position, a count, and change notifications. An in-memory source ships with the library.

**Derived:**

- Positions are plain numbers, exact to 2^53.
- Fetching is by range and may be asynchronous. Items not yet fetched render as placeholders whose size is known in
  advance, so nothing shifts when they arrive.
- Change notifications say what changed: a range inserted, a range removed, a range changed, or a reset. A view can then
  shift or refetch exactly what's affected. A count that grows (a remote source learning more) is an insertion at the
  end, so it needs no kind of its own.
- Selection and focus need to refer to items whose positions move, so a source also gives each item a key.
- The contract is `ItemSource<T>` (`packages/core/src/source.js`): `count()`, `read(start, end)` (the items at once, or
  a promise of them), `key(item)`, `subscribe(listener)` for changes, and optionally `positionOf(key)` and
  `ask(question)` (see Extensions). `shiftPosition(position, change)` says where a position is after a change. The
  components read `Source<T, F>`, an `ItemSource` with filters of the source's own type `F`: `span(start, end)` makes a
  filter for the items now at those positions, `matches(filter, item)` tests one, and `countMatching(filter)` counts
  one, at once or later. These and `firstMatching` below are to become queries of the extensions that ask them, as
  `findPrefix` is.
- A source that can search its items' text answers the `findPrefix` query (`find-prefix.js`; `MemorySource` does): the
  first position at or after `from` whose item's text starts with `text`, compared as `startsWithTyped` compares, at
  once or later. Typing in a list asks it, since only the source knows every item; unanswered, typing looks among the
  rows rendered.
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

### Reading sources that answer later (Derived)

- A source that answers later reports its items' arrival as `changed` over their positions, so arrivals and edits are
  handled the same way; that is the contract the list pipeline renders by (see Extensions). An item not read yet renders
  as not read (`aria-busy`).
- `BlockCache`, which the listbox as it was read every source through, is deleted with it. On the extension model a
  block cache is a list-stage step for a source that answers later, which a list over an array doesn't include; it isn't
  built.

### Windowing (Derived, built as an extension)

- `windowing(list, { rows, top })` (`windowing.js`) is one extension; neither navigation nor anything else in the
  listbox knows it exists. Its field is the top position (the source of truth for where the list is scrolled), the
  offset, the pitch rows are laid out at once measured, and the cap; `reveal` scrolls just enough, `scrollTo` jumps, and
  its view plugin dispatches `scrolled` from the list's scroll events and `measured` after measuring a row, and puts the
  scroll position where the top is after each render. A `rows` step gives a gap before, the window's rows (what shows
  and five either side), the `keep` positions outside it (hidden but present), and a gap after; each row and gap is
  placed in its scrollable row by attributes (`--interact-row`, `--interact-gap-rows`), the list says how many rows show
  and the pitch, and a partial set's rows say `aria-posinset` and `aria-setsize`. It gives `reveals` and `visible`.
- It keeps the old viewport's reach, the open owner question left as it was: a capped scroll height with a moving offset
  (after Vaadin Grid), so it lands exactly in a list of ten billion rows (`virtual-rows.js`). Placing rows one after
  another (gaps then rows in flow) put the top row more than half a pixel off in WebKit with rows 27.3px tall, so rows
  are placed by `calc(row * pitch)`, as the scroll position is worked out.
- **Measured on the rebuild** (Chrome 156, Firefox 157, WebKit 27.2): Firefox keeps a scroll position as a 32-bit float
  (16,000,000.7 set reads back 16,000,001; past 2^24 it moves in steps of 2), so the cap is now 2^23 pixels on screen,
  under which a position is within a quarter pixel, not Firefox's tallest area (17,895,696); a lower cap costs nothing,
  the offset moves more often. Browsers keep scroll positions to about a whole pixel (WebKit read 4,194,137.55 back as
  4,194,137, Chrome 4,194,141.39 as 4,194,142), so the position is put to the nearest whole pixel and a scroll event
  from where windowing put it is taken as its own; before that, WebKit's rounding moved the top back a row.
- Rows have one fixed height (a token); variable heights wait (Settled with the owner, below).
- The menu, palette and combobox window through the same extension, which their default sets include (`menuExtensions`,
  `paletteExtensions`, `comboboxExtensions`); a menu's and a combobox's shrink to their items (`shrink`), the palette's
  keep `rows` so its height never moves.

### Selection (Settled model)

A selection is a filter plus exceptions: "everything matching F, except these keys", or "nothing, except these keys".
Selecting all of ten billion items then costs nothing, and so does deselecting one of them. **Open:** this was marked
settled in the first draft beside the dropped requirement, which is its reason here; whether it is the owner's decision
is a question for the owner (below).

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
the region closes. keybinds' hub already does that last part by hand (`hub.js:293-362`).

**Derived:**

- In a windowed list, the focused item may be scrolled out of the window. The windowing renders the positions `keep`
  gives (the active item's) whatever the window holds, so focus never falls back to the page.
- Overlays that close (menus, the palette, dialogs) form a stack, so Escape and outside presses close the top one only.
  zag.js has a working stack to read (`@zag-js/dismissable` `dist/layer-stack.mjs`), as do its typeahead and tabbable
  helpers (`@zag-js/dom-query`).
- **Derived (built, measured in Chrome 156):** focus stays on the listbox's list element, and the active option is its
  `aria-activedescendant` (`active-item.js`). The active option is always among the positions rendered (the active
  item's `keep`, which windowing renders), hidden but present when it is outside the window. With the active item
  scrolled 2,000 rows away, focus and the active descendant were still there, and the next ArrowDown brought it back
  into view, in both DOM modes and all three browsers. The keys follow the WAI-ARIA listbox pattern (see The listbox).
- What the listbox needs is built (`packages/core/src/focus.js`):
  - `entry(left, count)`: where focus enters a collection. It goes back to where it left, while that's still inside,
    otherwise to the first item, and nowhere when the collection is empty.
  - `move(position, by, count)`: moves the active position and keeps it inside.

  The active position follows changes through `shiftPosition`. Trapping, restoring focus and the overlay stack are built
  with the overlays (see Overlays).

## Overlays (Derived, built)

Menus, the palette and the combobox's popup are overlays: shown over the rest of the page, dismissed by the person,
placed against something. The model is in `@interact/core`, with no DOM; its binding to the page is in `@interact/dom`.

### The model (`@interact/core`)

- **`Layer`** (`layer.js`): something shown over the rest. Its open state is a `Controllable`, so an app that owns it
  hears every dismissal as a request it can refuse: that is the veto, with no mechanism of its own. A dismissal is first
  an event with its reason (`onDismiss`: `escape`, `outside`, `focus-outside`, `beneath`), then `open.request(false)`.
  Each layer says whether it is modal and which ways out close it (`closesOn`). `shown` is whether a view is showing it,
  which only the view knows and sets: true once it is on screen, false once it has gone and focus is back.
  `afterHidden(run)` runs at once when nothing shows the layer, else once its view says it has gone. A command chosen in
  a modal palette needs it: run before the dialog closes, the page is still inert and focus still in the dialog.
- **`LayerStack`** (`layer-stack.js`): the open layers in the order they opened (`track(layer)` follows one). A press or
  focus outside dismisses the layers above the highest one it was inside, from the top down, never those beneath the top
  modal layer, which can't be reached; focus moving outside never dismisses a modal layer; Escape dismisses only the top
  layer, if it closes on Escape; a layer closing dismisses every layer above it (`beneath`). Every layer above another
  counts as inside it, which is what makes a submenu inside its menu (zag.js's `layerStack` does the same).
- **`place(wanted)`** (`placement.js`): where something goes beside an anchor's rectangle (a point is one of no size):
  on the side wanted, in logical terms (`block-end`, `inline-end`, ...), or its opposite when only that fits, or the
  roomier one when neither does; lined up at the start, centre or end, with `start` at the right in right-to-left text;
  moved along the side as little as it takes to stay in the area, by a margin; with the room it has on that side, so it
  can shrink instead of overlapping. Vertical writing modes aren't handled.

### The binding (`@interact/dom`)

- **`syncOverlay(element, layer, options)`** (`overlay.js`), called from a view's `rendered`, brings an overlay element
  in line with its layer; **`releaseOverlay(element)`**, from the view's new `disconnected` hook, takes its layer out of
  the stack when the element leaves the page (the layer stays open, so it shows again if it comes back). Options:
  `anchor` (an element in any tree, or a point; none leaves placement to CSS), `placement`, `focus` (`move`: focus goes
  in on open and comes back on close; `stay`: it stays where it is, as in a combobox), and `initialFocus` (by default
  the first Tab stop, else the overlay).
- **Each document has one stack** (`document-layers.js`), made the first time an overlay asks, with capture-phase
  listeners on the document: pointerdown, click, focusin, keydown, pointerup/cancel. What counts as inside a layer
  (`happenedIn`) is judged on the event's composed path, so shadow roots and slots hide nothing.
- **Platform support, measured in Chrome 156, Firefox 157 and WebKit 27.2** (scripts in the session's scratchpad):
  - Same in all three: CSS anchor positioning (`anchor-name`, `position-anchor`, `anchor()`, `position-area`,
    `position-try-fallbacks: flip-block`, which flipped correctly), the popover API with the top layer above any
    `z-index`, `popover="hint"`, `<dialog>` `closedby`, `inert`, and `showModal()` making everything outside the dialog
    inert, from inside a shadow root too.
  - Hiding a popover can't be refused: `beforetoggle` on hide isn't cancelable in any of them. Preventing a modal
    dialog's `cancel` holds once; a second Escape closes it anyway. With `closedby="none"`, Escape neither closes it nor
    fires `cancel`.
  - CSS anchor positioning doesn't reach across trees: a name on an element in the page didn't reach a positioned
    element in a shadow root, nor the other way, in any engine; a name set on a shadow host from outside reached its
    shadow root in Firefox and WebKit but not Chrome; `showPopover({ source })` and `popovertarget` gave no implicit
    anchor in any. Only an anchor in the same tree (or the host, named by a `:host` rule) worked everywhere.
  - A popover shown over a modal dialog but outside the dialog's subtree is inert in all three: it can't be focused or
    pressed. Inside the dialog's subtree it works.
- **What that chose:**
  - A modal layer is a `<dialog closedby="none">` shown with `showModal()`: the platform makes the rest of the page
    inert (and the backdrop), and `closedby="none"` leaves Escape to the stack, where an app can refuse it. Any other
    layer is a `popover="manual"`, in the top layer, which the platform never dismisses by itself. Light dismiss is the
    stack's, not `popover="auto"`'s, because hiding can't be refused.
  - Positioning is by script (`anchored.js`), measuring the anchor and writing `--interact-overlay-x`/`-y` and the room
    available, which `overlayStyles` (joined into a view's stylesheet with `joinStyles`) turns into `left`, `top` and
    `max-width`/`max-height`. CSS anchor positioning can't serve an anchor in another tree (an app's button, a
    component's overlay in its own shadow root) or a point. It is placed at its natural size, then again at the size it
    shrank to, all before paint; it follows the page scrolling (any scroller), the window resizing, and the anchor or
    overlay changing size, once per frame (`Following`). An anchor moving without any of those isn't followed.
  - Opening an overlay over an open modal one when it isn't inside the modal's dialog is an error, not an overlay that
    can't be reached.
- **Escape is heard after the page (Derived):** the stack takes outside presses and Tab in the capture phase, but Escape
  in the bubble phase, and only when nothing in the page prevented its default (`EscapeListener`, `document-layers.js`).
  A control inside a layer with its own use for Escape (a combobox emptying its field) takes it first; a layer dismissed
  by it then takes the key from the rest of the page. Hearing it in the capture phase closed a modal dialog before a
  closed combobox in it could empty its field, in all three engines.
- **Edge cases taken from zag.js** (`@zag-js/dismissable`, `@zag-js/interact-outside`, `@zag-js/dom-query`, read in the
  evaluation's install): Escape is ignored while an input method composes; a press is judged on the composed path's
  first target in shadow DOM; a press on a scrollbar of the element pressed isn't outside (only where scrollbars take
  room: the test shows it in Chrome and WebKit; Firefox 157 headless keeps overlay scrollbars, which leave no such
  place); a press on a modal dialog's backdrop is outside although its target is the dialog (zag's point-in-rectangle
  check); a touch counts only once it becomes a click, so a finger scrolling dismisses nothing; focus moving while the
  pointer is down is left to the press; elements the layer is anchored to count as inside (zag's branches and its
  `aria-controls` trigger). Tab stops are gathered across shadow roots and slots, positive `tabindex` first, one radio
  per group, and never the container itself (`tabbable.js`; Firefox makes a `<dialog>` a stop).
- **Focus (the APG dialog, menu button, menu and combobox patterns, fetched):** focus goes into an overlay that moves
  it, and comes back to where it came from on close, unless something else took it meanwhile; a return target that has
  since hidden (a closed parent menu's item) passes to that overlay's own return target. A modal layer keeps Tab inside
  it, going round both ways (each engine's own `showModal` trap differed: Chrome and WebKit let Tab reach the page body,
  Firefox stuck on the last element). Tab out of a non-modal overlay closes it and leaves focus where Tab put it (the
  APG menu pattern). Tab out of the page (nothing after the overlay) closes it too: Chrome and WebKit then send a
  focusout with no related target and no focusin, which `document-layers.js` takes as focus moving outside every layer
  when a Tab caused it; focus then goes back to the opener, where the person finds it on coming back to the page. Focus
  leaving because the window did (another window or tab) is no Tab and closes nothing. Headless Firefox moves focus
  nowhere on a Tab past the page's last element, so its overlay stays open with focus in it, which is right there.
  Giving focus back is `giveFocusBack` (`overlay.js`), and the binding sets the layer's `shown` once it is done. A press
  that dismisses waits for the pointer to come up before giving focus back, so a press on something focusable keeps
  focus there, and only a press on nothing loses it to the overlay's opener (a backdrop press on a modal returns to its
  button).
- **Proven in Chrome 156, Firefox 157 and WebKit 27.2, in shadow and light DOM** (`overlay.test.js` and the module tests
  beside it): opening below its button in the top layer with focus inside; Escape closing it and returning focus; a
  press outside closing it, and a press on its own button closing it without reopening; Tab out closing it; nested
  popups (a press in the outer closes only the inner, Escape closes one at a time, a press outside closes both); the
  modal trap, the rest of the page unreachable, a backdrop press closing it, and the error for an overlay outside it; an
  app-owned popup hearing `escape` and `outside` and staying open; leaving the page and coming back; the closed popup
  from the server adopted with the same nodes, taking no room and moving nothing; axe-core finding nothing in the
  server's popup, an open popup or an open modal. Placement (`anchored.test.js`): below an element, at a point, flipped
  above at the bottom of the window, shifted at its right edge, shrunk to the room it has, following a scroll.
- **Unverified:** an anchor moving without a scroll, resize or size change; overlays in an `<iframe>`; touch input on a
  real device (only dispatched touch events); screen readers announcing the overlays (only axe-core).

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
(`data-keybinds="<kind>"`, `packages/keybinds/src/modal.js:18`), and the same idea holds here.

**Derived (built):**

- `component(view, create)` (`packages/dom/src/component.js`) makes a class and defines nothing.
  - `create` is given the element, so an instance adopting server markup can start in the state the server rendered it
    in. With no access to the element, a hydrating listbox would start without its source, render nothing, and lose the
    server's nodes.
  - A view that has to read layout or drive the page has `rendered(behavior, root)`, called after the first render or
    adoption and after every render since. The listbox needs it to measure its rows and set its scroll position after
    each change; overlays need it to show, hide and place themselves.
  - A view that took part of the page (an overlay in its document's stack) has `disconnected(behavior, root)`, called
    when the element leaves the page. A render scheduled before it left doesn't run.
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
  renderer finds them in a fresh clone (`collect`, `render.js`). It keeps the server's nodes and attaches parts.
  Repeated items are paired by position, and then reconciled by key as on any update (`reconcile`, `render.js`). Markup
  from a different template is an error, not a silent re-render. A missing, `null` or `false` attribute is left out; an
  empty string keeps it.
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
| AG Grid     | 36.2.0; server-side row model is Enterprise, commercial | Block cache API; select-all-except state shape; max-height probe                                                                         | Commercial; not a custom element; 528 KB gzipped core                                                                    |
| Vaadin Grid | 25.3.5, Apache-2.0                                      | Virtual count plus offset (lands exactly); part names; keyboard navigation and accessibility mixins                                      | Registers on import; selection holds items, no select-all with a provider                                                |
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
under Collections, Focus scopes, DOM and Styling. The listbox's API is in Components. Then the overlay layer: layers,
their stack and placement in core, their binding in dom (see Overlays). Then the menu with submenus, and the command
bridge (see The menu, and Commands under Components). Then the command palette, with the bridge's search, and three gaps
the menu left: Tab out of the page, a long menu's size, and a context menu asked for from the keyboard (see The command
palette, The menu and Overlays). Then the combobox, sharing its field, list keys and stale-answer dropping with the
palette (see The combobox). Then keybinds' menus and palette moved onto them (see What moves out of keybinds).

**Then:** the extension mechanism (see Extensions), and the listbox rebuilt on it: a core and its features as
extensions, with the API gaps it found fixed in the mechanism. Then the menu (with submenus, context menus and the menu
button), the palette and the combobox rebuilt on it, with the gaps they found fixed in the mechanism, and the legacy
listbox and the block cache deleted. **Next**, done by others: drag to reorder, load as you scroll and grouped sections
written as extensions with no change to the mechanism.

## Settled with the owner after the first draft

1. **Bridge freshness.** The bridge accepts an optional change notification and is live where the command system
   provides one (see Components).
2. **Package boundaries.** Not decided (see Packages).
3. **Wrappers.** Typed declarations for every mainstream framework, and wrappers where its own custom element handling
   falls short of idiomatic (see Generated wrappers and types).
4. **The slice's gaps** (closed): Firefox and WebKit with the row cap from the smallest real limit; the APG pattern,
   Vaadin's keyboard and a11y code and an accessibility checker; typeahead as an optional source capability, searching
   what's loaded otherwise; no readonly-parameter exemption per component (oxlint has no pattern form, so behaviors are
   readonly types instead). Variable row heights wait.
5. **Order.** The listbox slice comes first. Bringing keybinds under the repo's rules (its 5,369 lint diagnostics and
   206 casts) is its own task after that. Done: keybinds passes every check with no fence.

## Questions for the owner

Decisions the first draft marked settled, or that rest on the dropped requirement, which this file and its log can't
tell were the owner's:

1. **Selection as a filter plus exceptions** (see Selection): settled in the first draft with "selecting all of ten
   billion items then costs nothing" as its reason. Yours, or the dropped requirement's? If the latter, a selection
   extension could hold keys only.
2. **One kind of data source for lists, menus, grids and trees** (see Collections), and the data source and focus scope
   models marked settled in the first draft: yours? The model you accepted (a lazy source: a count, items by range, an
   item's position) agrees with the data source one.
3. **Windowing's reach:** should the windowing extension land exactly in billions of rows (the capped scroll height with
   a moving offset, and the row cap from the smallest browser limit you settled as one of the slice's gaps), or only
   window long lists?
4. **A menu and windowing:** does a menu include windowing (a long menu scrolls, as the APG has it), or render whole?
   This meets the open question of a "▾ N more" row (see What moves out of keybinds). `menuExtensions()` includes it, as
   menus did before the rebuild; the menu itself works either way.
5. **Names changed by the rebuild** (yours to approve): the parts and public names listed under Names, below.
6. **Grouped sections in ARIA:** flat headings among the options, or options nested in `role="group"` elements as the
   APG's grouped listbox has them, which needs a nested container stage (see Extensions, Open)?
