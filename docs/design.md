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
  for each piece of state (`@zag-js/listbox` `dist/listbox.types.d.ts:60-80`, read in the evaluation). **Proposed:**
  `@interact/core` has one primitive for this, so every component handles control the same way.
- **Commands.** Components know nothing about commands. A bridge needs only two operations: "list the commands available
  in a context" and "run one by id". With those it keeps buttons, menus and the palette in step with any command system,
  and keybinds is one such system.
- **Generated code.** Framework wrappers and typed declarations are generated from a Custom Elements Manifest
  (`@interact/codegen`).

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
- Change notifications say what changed: a range inserted, a range removed, a range changed, or the count changed. A
  view can then shift or refetch exactly what's affected.
- Selection and focus need to refer to items whose positions move, so a source also gives each item a key.

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
- **Scroll position.** Native scrolling over a capped height is one of the inputs to the virtual window, not the source
  of truth. The source of truth is the position of the item at the top of the view, which keeps keyboard navigation,
  `scrollTo(position)` and restoring a view exact. **Unverified:** how native scrolling feels near the cap's edges, and
  how variable item heights interact with the offset. Neither grid was measured scrolling natively, because setting
  `scrollTop` in headless Chrome triggered no fetch.

### Selection (Settled model)

A selection is a filter plus exceptions: "everything matching F, except these keys", or "nothing, except these keys".
Selecting all of ten billion items then costs nothing, and so does deselecting one of them.

**Derived:**

- The filter is stored in the selection itself. Changing what the view shows afterwards doesn't change what is selected.
- Counting selected items asks the source for the count matching F, then subtracts the exceptions that match F. So a
  source that supports filtered selection must also count by filter.
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

## DOM (Settled)

### Shadow or light DOM

The consumer chooses shadow or light DOM per instance, or once as an app default. Styles work in both: adopted
stylesheets in shadow DOM, and `@scope` in light DOM.

**Derived:** a view's template and stylesheet are the same in both modes, and the mode decides only where the stylesheet
goes.

**Unverified:** how one stylesheet is written so that `:host`/`::part` in shadow DOM and `@scope` in light DOM both
select correctly. This is the first thing the DOM package proves.

FAST only switches between shadow and light DOM per definition, not per instance (`shadowOptions: null`), and in light
DOM it adopts styles into the root without scoping them (`element-controller.js:705-709`).

### Registration

Importing a module has no side effects. Classes are exported, and the app registers them under names it chooses, with
one call and a prefix. `test/rules.test.js` imports every module and fails if any of them defines an element or changes
the page.

**Derived:** styles and code never depend on tag names. keybinds already marks each element with its kind
(`data-keybinds="<kind>"`, `core.js:177`), and the same idea holds here.

Two of the evaluated libraries register on import:

- Web Awesome defines `wa-button` on import, and the class can't be registered a second time under another name ("this
  constructor has already been used with this registry").
- Vaadin defines its grid on import too (`src/vaadin-grid.js:393`), though its mixin module alone defines nothing.

### Server rendering and hydration

Server rendering emits Declarative Shadow DOM for shadow-mode instances. Hydration then adopts that markup instead of
re-rendering it.

The evaluation found two things to learn from:

- **Inlining styles in every instance is too heavy.** Web Awesome's server renderer inlines each component's whole
  stylesheet into every instance: one button and one select came to 61,477 characters. **Proposed:** light-DOM instances
  share one page stylesheet. For shadow instances, find the cheapest way to share a stylesheet across declarative shadow
  roots; which way that is remains unverified.
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

**Proposed:**

- A component token defaults to a global role token, and a part or state token defaults to the component token. Setting
  any level overrides everything below it.
- Web Awesome's grid of role × kind × emphasis is the reference for naming global tokens, for example
  `--wa-color-brand-fill-quiet|normal|loud` and `-on-*` (`styles/themes/default.css`).

### Selectors and precedence

Every selector has zero specificity, via `:where()`. Precedence comes only from cascade layers. `test/rules.test.js`
enforces both for every stylesheet outside keybinds.

**Proposed:** the layer order is structure, then theme, then the app's own layer, so an app overrides anything without
competing on specificity.

Web Awesome uses layers too (`styles/layers.css`), but its components barely use `:where()`.

## Generated wrappers and types (Settled)

`@interact/codegen` reads a Custom Elements Manifest and writes typed declarations and framework wrappers.

**Derived:** the manifest needs at least what Web Awesome's records for each tag: attributes, properties, events, slots,
CSS parts, CSS states and CSS properties (`dist/custom-elements.json`).

**Unverified:**

- Whether `@custom-elements-manifest/analyzer` reads this repo's JSDoc-typed classes correctly. As a development
  dependency it doesn't break the no-runtime-dependency rule.
- Which framework wrappers are worth generating, given each framework's own custom element support.

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
- The contents of Vaadin's keyboard and accessibility mixins (only located by name).
- Whether AG Grid's select-all is meant to follow the active filter.
- Native scrolling in either grid.

## Build order (Proposed)

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

## Open questions for the owner

1. **Bridge freshness.** With only "list" and "run", a button's enabled state updates when the app tells the bridge to
   look again, or when a menu or palette opens. An optional third operation, "tell me when the list changes", would
   remove that call. Should the bridge accept one when the command system has it?
2. **Package boundaries.** Should the five packages above be the split? The alternative is fewer packages with more
   subpath modules. Either way an app ships only the modules it imports.
3. **Wrappers.** Which frameworks get generated wrappers?
