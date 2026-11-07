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
  (`packages/keybinds/src/core.js:421`).

## Packages

The package split is not decided: "the `interact` library seems designed wrong, smells monolithic already which makes me
deeply uncomfortable" (owner, 2026-11-04T13:27:42). Each package is usable on its own.

Dependencies only point down this list. So far each new package is a manifest only; its first module comes with the
first build step.

| Package                | Holds                                                                                                                       | DOM        |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------- | ---------- |
| `@interact/core`       | Controllable state, events, state machines, data sources, selection, focus scopes, layers, placement                        | none       |
| `@interact/dom`        | Templates with holes; DOM renderer, string renderer, hydration; custom element base; registration; style adoption; overlays | yes        |
| `@interact/components` | Each component's behavior and default web view, its structural CSS, and the command bridge                                  | yes        |
| `@interact/theme`      | The default visual theme: tokens and their values                                                                           | CSS only   |
| `@interact/codegen`    | Development tool: generates typed declarations and framework wrappers from a Custom Elements Manifest                       | build time |
| `keybinds`             | The standalone command and binding engine                                                                                   | yes        |

keybinds depends on none of the others, and none of the others depend on it (**Settled**: "Keybinds' core stays
standalone"). The bridge in `@interact/components` meets keybinds through two operations and imports nothing from it.

## Components (Settled, with the derived parts marked)

A component is its behavior, written once as a plain API, plus a default view anyone can replace.

- **The behavior** is a class with no DOM in it. It has methods, observable state and events, and uses a state machine
  only where modes and timing call for one: a menu opening and closing with pointer intent, a combobox, a tooltip's
  delays. A component without modes is a few fields and methods. A behavior can be driven by tests, by the DOM, or later
  by a terminal view. **Derived:** the menu's timing came to one timer (a submenu opening once the pointer rests on its
  entry) and an area the pointer may cross (`menu-submenu.js`), so core has no state machine yet; the combobox is the
  next place one may be needed.
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

### The menu (Derived, built)

- **The listbox, changed for it rather than copied:** a selection mode of `none` (items are activated, never selected;
  select-all does nothing), `skip` for items focus passes over, honored by every move, Home, End, typing and focus
  entering (`landing.js`), a `typing` getter so Space can be part of what is typed, and the virtualized viewport taken
  out of the listbox's view (`rows-view.js`, `rows-styles.js`) so rows can be menu items. A listbox now also reads again
  after a source changes items in place, which left rows blank before.
- `Menu` (`packages/components/src/menu.js`) is the behavior: its entries in a `Listbox` that selects nothing and passes
  over separators; a `Layer`; a `point` for a context menu; `open('first' | 'last' | 'none')`, `openAt(point)`,
  `close()`, `closeAll()`, `activate(position, 'enter' | 'space' | 'press')`, `openSubmenu(position, focus)`,
  `pointTo(position, pointer)`, `headFor(area)`, `onSelect`, `takeFocus()` (a submenu opened from a key, or closed back,
  asks for focus; its view gives it) and `subscribe`. `menuKey(menu, key, { direction, modifiers })` gives the keys.
- **Entries (`menu-entry.js`, from the APG menu and menu button pages, fetched):** commands, checkbox and radio items,
  separators, and submenus, each with an id; an item may be disabled (focusable, does nothing) and show a shortcut.
  Whether an item is checked is the app's; activating one is reported. The APG doesn't define a `group` role for menus,
  so radio items that go together sit between separators, as its examples do. `menuEntries(list)` is an in-memory source
  that typing searches by label.
- **Collections:** a menu's entries come through a source, like the listbox's, and its rows are the listbox's
  virtualized rows; a menu of any length costs the same. It shows as many rows as it has entries, up to `rows` (10).
  Rows don't size a virtualized list, so a menu is `--interact-menu-width` wide at least.
- **Keys (the APG menu and menu button patterns):** on the button, Enter and Space open on the first item, Down on the
  first, Up on the last. In the menu, the arrows, Home, End and typing move, passing over separators, without wrapping
  (optional in the APG); Enter runs an item, or opens its submenu with focus on its first item, and closes the menus
  above; Space does the same, but leaves a checkbox or radio item's menu open; the arrow toward the inline end opens a
  submenu, the arrow back closes it, and Escape closes only the menu focus is in, focus going back to its parent or to
  the button; Tab moving focus out closes them all.
- **Submenus:** a menu of its own, in an overlay inside its parent's overlay, beside its entry. With the pointer, an
  entry becomes active as the pointer moves over it, its submenu opens once the pointer has rested there 200ms (zag.js's
  wait), and any other closes. Leaving an entry toward its open submenu notes an area (`intentArea`, in core): from just
  behind the pointer to the submenu's near edge and round its far side, zag.js's polygon. While the pointer stays in it,
  crossing other entries changes nothing; once it strays, the next entry it is over takes over, closing the submenu.
- **Views:** `menuButtonView()` and `contextMenuView()`, with `menuButtonElement` and `contextMenuElement`, and
  `openOnContextMenu(target, menu)`, which opens a menu at the point a context menu was asked for. A context menu sits
  with its corner exactly at the point (no gap).
- **Proven** (`menu-view.test.js`, Chrome 156, Firefox 157 and WebKit 27.2, shadow and light DOM): the keys above; Space
  on a checkbox item; submenus from the keyboard and the pointer, including crossing other entries diagonally on the way
  and straying; a context menu at its point, focus going back to where it came from; server markup adopted with its
  button kept; and axe-core finding nothing with a submenu open.
- **Keyboard-opened context menus:** the Context Menu key and Shift+F10 open the menu at the start of the focused
  element's bottom edge (the inline end in right-to-left text), not at the point the engine reports: Chrome reports the
  element's centre with `button` -1; an engine giving no point would have put it at 0,0. A request is taken as from the
  keyboard by `button` -1, or by no point and no press count (`menu-element.js`). Headless Firefox and WebKit fire no
  `contextmenu` for those keys at all, so the keys are tested in Chrome and a keyboard-style request in all three.
- **A long menu's size:** when only some rows are rendered, each item says its place and the menu's size
  (`aria-posinset`, `aria-setsize`), as ARIA asks for a partial set. Both count separators, since which entries before
  an item are separators isn't known without reading them. A menu rendered whole leaves the counting to the browser,
  which gets separators right. The listbox numbers its options always; it has no separators, so its numbers are exact.
- **Unverified:** screen readers (only axe); touch; a long menu's numbers when it has separators (they count them).

### The command palette (Derived, built)

- **Pattern (the APG combobox and modal dialog pages, fetched):** a modal dialog holding an editable combobox (the
  search field, `role="combobox"`, `aria-autocomplete="list"`, `aria-expanded="true"` since its list always shows,
  `aria-controls` the results) whose popup is a listbox of the commands found: list autocomplete with automatic
  selection. DOM focus stays in the field, which names the active command as its `aria-activedescendant`; the active
  command is the one `aria-selected`. That is the APG's combobox exactly, inside the APG's modal dialog: focus moves
  into the dialog on open (to its field), Tab stays inside it (the field is its only stop), Escape closes it, and focus
  goes back to the opener. A dialog with a separate focusable listbox would make every key cross from the field to the
  list and back.
- **Behavior:** `Palette` (`palette.js`): `layer` (modal), `query` (a `Controllable`), `list` (a `Listbox` that selects
  nothing and passes over commands that can't run), `open()`, `close()`, `type(text)`, `key(key)`, `run(position)`,
  `subscribe`, `dispose`. Options: `bridge`, `context` (read as it opens; its commands are found and run in that
  context), `id`, `label` (the dialog's name), `searchLabel` (the field's), `rows`, and `inactive`: `'show'` (greyed,
  `aria-disabled`, passed over) or `'hide'`. Opening finds every command; the first that can run is active. The arrows
  and page keys move the active command; Enter runs it; Home, End and the rest edit the query. What shows stays until a
  new search answers. A command runs once the palette has gone and focus is back on the opener.
- **View:** `paletteView()`, `paletteElement(create)`, `paletteStyles`. The results are the virtualized viewport with
  `focusable: false` (no Tab stop, no active descendant of its own: the field has it). What the query matched is a
  `<mark part="match">`; a command's description, group and shortcut show beside its label. The dialog shows `rows` rows
  whatever is found, and a `role="status"` region lying over the results says when nothing is, so nothing shifts as the
  query changes. Its secondary text is the text's own color at 0.75 opacity: system GrayText on the fill failed axe's
  contrast check (about 3.9:1 on white), as it does for a command that can't run only because disabled text is exempt.
- **Proven** (`palette-view.test.js`, Chrome 156, Firefox 157, WebKit 27.2, shadow and light DOM): opening with focus in
  the field, every command found and the first active as the combobox says; typing finding commands and marking what
  matched; the arrows passing a command that can't run; Enter and the pointer running a command once focus is back on
  the opener; Escape closing and running nothing; Tab staying in the field; the same height with nothing found, and the
  status saying so; axe-core finding nothing open; server markup adopted with its field kept, then opening.
- **Unverified:** screen readers (only axe); a remote `search` under load (only a slow in-page one, whose late answer is
  dropped); input methods composing in the field (Enter while composing is left to the input method, untested).

### The combobox (Derived, built)

- **Pattern (the APG combobox page and its select-only and list-autocomplete examples, fetched):** a field with
  `role="combobox"` controlling a listbox popup; DOM focus stays in the field, which names the active option as its
  `aria-activedescendant`, and that option is the one `aria-selected`. `aria-expanded` follows the popup's layer.
- **Kinds (`combobox-options.js`):** select-only (a focusable field showing the option chosen, `aria-haspopup`, a fixed
  source); editable without autocomplete (an input over a fixed source); editable with `list` autocomplete (the options
  are what the app's `suggest(text)` finds, at once or later), with `manual` selection (nothing active until the arrows)
  or `automatic` (the first found active); and `both`, list plus inline completion, always automatic. The options are a
  union type, so `suggest` exists exactly for the kinds that suggest.
- **Behavior:** `Combobox` (`combobox.js`): `layer`, `list` (a `Listbox` that selects nothing; its active option is the
  field's), `value` (the option chosen, a `Controllable`), `text` (an editable field's, a `Controllable` that follows
  the option chosen), `kind`, `suggestions`, `open(at)`, `close()`, `toggle()`, `choose(position)`, `chooseActive()`,
  `clear()`, `type(text, deleting)`, `key(key, { alt, shift, toggle })`, `point(position)`, `completion`,
  `keepCompletion()`, `subscribe`. Options come from a source, so ten billion cost what ten do: opening a select-only
  one over 10^10 numbers lands on the one chosen, five billion in, through the source's `positionOf`; without it, on the
  first.
- **Keys (`combobox-keys.js`, the APG's):** select-only, closed: Down, Enter and Space open on the option chosen (else
  the first), Alt+Down on the option chosen, Up and Home on the first, End on the last, a character typed on the option
  it starts. Open: the arrows, page keys, Home and End move without wrapping; Enter, Space and Alt+Up choose; typing
  goes to the option whose text starts with what was typed, the whole of it first. Editable, closed: Down opens on the
  first, Up on the last, Alt+Down without moving. Open: the arrows and page keys move (from none, Down to the first and
  Up to the last); Enter and Alt+Up choose; Home, End and the side arrows give the cursor back to the text, no option
  active, keeping an inline completion as typed text. Escape closes, choosing nothing; with the list closed, it empties
  an editable field (`clearOnEscape`, on by default). Enter with an editable list closed is left to the page (a form). A
  key while an input method composes is the input method's (`combobox-field.js`).
- **Leaving:** the field is the popup's anchor, so it counts as inside its layer. Tab or a press elsewhere dismisses the
  layer (`focus-outside`, `outside`), and a combobox that selects by itself (select-only, `automatic`, `both`) chooses
  its active option then, as the APG's select-only example does; Escape never chooses.
- **Suggestions (`combobox-suggest.js`):** only the answer for the text typed last is shown (`Latest`); none found, or
  the field emptied, closes the list.
- **Shared with the palette:** its search field is the same editable combobox field (`combobox-field.js`, with the
  composition check in one place), its list keys (`field-keys.js`), and its dropping of stale answers (`latest.js`). The
  palette stays its own behavior: its list is always shown inside a modal dialog, with no layer of its own.
- **No state machine in core:** the only modes are the layer's open state and the listbox's typeahead timer, and the
  only timing is that timer; landings and suggestions are answers of which only the latest counts.
- **View:** `comboboxView()`, `comboboxElement(create)`, `comboboxStyles`. The popup is `popover="manual"`, anchored
  below the field with `focus: 'stay'`, at least as wide as the field and no taller than its options; a press in it
  keeps focus in the field. An inline completion shows after what was typed, selected.
- **A design fix in the viewport:** a viewport made with `focusable: false` now says `tabindex="-1"`. Without it,
  browsers made the scrolling listbox a Tab stop of its own, and Tab from the field went into it.
- **Proven** (`combobox-view.test.js`, Chrome 156, Firefox 157, WebKit 27.2, shadow and light DOM, 60 tests): the
  select-only keys, a character typed, Tab choosing and moving on, choosing by pointer with focus kept in the field,
  Escape keeping the choice; editable suggestions, Down and Enter choosing, two Escapes closing then emptying; inline
  completion selected after what was typed and chosen with Enter; ten billion options opening on the one chosen and End
  going to the last; server markup adopted with its field kept, opening on the option chosen; and axe-core finding
  nothing closed or open, in a page whose content is in a landmark.
- **Unverified:** screen readers (only axe); touch; a remote `suggest` under load; input methods composing in the field.
- **Inside another layer (Derived):** Escape with the list closed empties the field and leaves the layer open; the next
  Escape closes the layer. Shown in a modal dialog in all three engines, both DOM modes (`combobox-view.test.js`).

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
  answer (`command-system.js`, `command-search.js`).
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
  (`inside-layer.js`) is judged on the event's composed path, so shadow roots and slots hide nothing.
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
  in the bubble phase, and only when nothing in the page prevented its default (`escape-listener.js`). A control inside
  a layer with its own use for Escape (a combobox emptying its field) takes it first; a layer dismissed by it then takes
  the key from the rest of the page. Hearing it in the capture phase closed a modal dialog before a closed combobox in
  it could empty its field, in all three engines.
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
  Giving focus back is `focus-return.js`, and the binding sets the layer's `shown` once it is done. A press that
  dismisses waits for the pointer to come up before giving focus back, so a press on something focusable keeps focus
  there, and only a press on nothing loses it to the overlay's opener (a backdrop press on a modal returns to its
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
(`data-keybinds="<kind>"`, `core.js:177`), and the same idea holds here.

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
under Collections, Focus scopes, DOM and Styling. The listbox's API is in Components. Then the overlay layer: layers,
their stack and placement in core, their binding in dom (see Overlays). Then the menu with submenus, and the command
bridge (see The menu, and Commands under Components). Then the command palette, with the bridge's search, and three gaps
the menu left: Tab out of the page, a long menu's size, and a context menu asked for from the keyboard (see The command
palette, The menu and Overlays). Then the combobox, sharing its field, list keys and stale-answer dropping with the
palette (see The combobox). Next: keybinds' menus and palette moved onto them.

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
2. **Package boundaries.** Not decided (see Packages).
3. **Wrappers.** Typed declarations for every mainstream framework, and wrappers where its own custom element handling
   falls short of idiomatic (see Generated wrappers and types).
4. **The slice's gaps** (closed): Firefox and WebKit with the row cap from the smallest real limit; the APG pattern,
   Vaadin's keyboard and a11y code and an accessibility checker; typeahead as an optional source capability, searching
   what's loaded otherwise; no readonly-parameter exemption per component (oxlint has no pattern form, so behaviors are
   readonly types instead). Variable row heights wait.
5. **Order.** The listbox slice comes first. Bringing keybinds under the repo's rules (its 5,369 lint diagnostics and
   206 casts) is its own task after that. Done: keybinds passes every check with no fence.
