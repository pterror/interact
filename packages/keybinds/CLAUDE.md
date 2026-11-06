# CLAUDE.md

Behavioral rules for Claude Code in the keybinds package. The repo's `CLAUDE.md` at the root holds the rules for the
whole repo, which govern here too.

## Project Overview

Declarative, contextual keybindings for the web. Zero-dependency JavaScript library.

## Architecture

One module per part, JSDoc types checked via `tsconfig.json`; `src/index.js` re-exports everything.

- `src/core.js` — `keybinds()` and `validateCommands()`. `runner.js` runs commands in the app's context;
  `input-listener.js` is one input's presses (`held`, phases, sequences); `binding-index.js` looks presses up. Knows no
  particular input
- `src/command.js` (commands, axes, schemas), `binding.js` (parsing, splitting, conflicts), `binding-format.js` (display
  parts), `binding-mods.js` (modifiers), `input.js` (the input contract), `modal.js` (open overlays)
- `src/keys.js`, `src/mouse.js`, `src/gamepad.js`, `src/axes.js` — inputs: each parses and listens for its own bindings
  (`keys-listener.js` for the keyboard); `src/*-ui.js` formats and records them (`keys-recorder.js`)
- Syntax beyond modifiers and key names is opt-in, one module each: `releases.js` (`:up`), `holds.js` (`:hold`, `:tap`),
  `sequences.js` (`g i`), `any-modifiers.js`, `keys-symbols.js` (`?`), `keys-aliases.js` (`up`, `plus`). Without one,
  its syntax is an error. `keys-layout.js` shows physical keys as the person's layout types them
- Inputs report presses starting and ending (`d.down`, `d.up`); the core runs what's bound, and phases (releases, holds)
  and sequences hook in there
- `src/search.js`, `src/store.js`, `src/modifiers.js`
- `src/hub.js` — CommandHub: sources and context; `hub-bindings.js` (store and listening), `hub-commands.js` (building
  schema and live commands), `hub-components.js` (making and syncing the cheatsheet and settings panel), `hub-focus.js`,
  `hub-options.js`
- `src/command-system.js` (with `command-search.js`) — the hub as a command system (`hub.commandSystem()`), for
  `@interact/components`' CommandBridge: listing, searching and ranking its commands, running one, hearing changes. The
  palette, context menus and command buttons are `@interact/components'`, driven through it
- Components: `cheatsheet.js` (with `cheatsheet-groups.js`, `cheatsheet-trigger.js`), `settings.js` (with its
  `settings-*.js`), `radial-menu.js` (with `radial-keys.js`, `radial-layout.js`, `radial-slots.js`), built with
  `component-dom.js` and made by `create-component.js`

Key concepts:

- **Commands** — data objects combining triggers (keys/mouse/gamepad), labels, context conditions, and handlers
- **Inputs** — passed to `keybinds()` and the hub (`inputs: [keys(), mouse()]`); an app ships only the ones it uses.
  Each has a UI half (`keysUI()` in `src/keys-ui.js`, ...) that formats and records bindings, which only the components
  need
- **Modals** — an open `<dialog>`, an open popover, or an element with `data-keybinds-modal` and `open` takes the
  keyboard: bindings don't fire inside it (found along the event's composed path, so inside shadow roots too)
- **Schema/Handlers split** — `defineSchema` for binding data, `fromBindings` to attach handlers
- **BindingsStore** — reactive user overrides, kept in localStorage or any `BindingsStorage`
- **Web components** — cheatsheet, settings, radial menu (shadow DOM; each marks itself `data-keybinds="<kind>"`;
  `styles/palette.css` themes them from `--keybinds-*` variables)
- **CommandHub** — commands from many sources, one rebindable store, keys and its components kept in step; as a command
  system, a palette, menus and `data-command` buttons from `@interact/components` too

## Development

```bash
cd docs && bun dev   # Local docs
```

Tests, formatting, linting and type checks run from the repo root (see its `CLAUDE.md`).
