# CLAUDE.md

Behavioral rules for Claude Code in the keybinds package. The repo's `CLAUDE.md` at the root holds the rules for the
whole repo, which govern here too.

## Project Overview

Declarative, contextual keybindings for the web. Zero-dependency JavaScript library.

## Architecture

One module per part, JSDoc types checked via `tsconfig.json`; `src/index.js` re-exports everything.

- `src/core.js` — `keybinds()`, the dispatcher: commands, context, presses, `held`. Knows no particular input
- `src/keys.js`, `src/mouse.js`, `src/gamepad.js`, `src/axes.js` — inputs: each parses and listens for its own bindings;
  `src/*-ui.js` formats and records them
- Syntax beyond modifiers and key names is opt-in, one module each: `releases.js` (`:up`), `holds.js` (`:hold`, `:tap`),
  `sequences.js` (`g i`), `any-modifiers.js`, `keys-symbols.js` (`?`), `keys-aliases.js` (`up`, `plus`). Without one,
  its syntax is an error. `keys-layout.js` shows physical keys as the person's layout types them
- Inputs report presses starting and ending (`d.down`, `d.up`); the core runs what's bound, and phases (releases, holds)
  and sequences hook in there
- `src/search.js`, `src/store.js`, `src/modifiers.js`, `src/hub.js`, `src/components/*.js`

Key concepts:

- **Commands** — data objects combining triggers (keys/mouse/gamepad), labels, context conditions, and handlers
- **Inputs** — passed to `keybinds()` and the hub (`inputs: [keys(), mouse()]`); an app ships only the ones it uses.
  Each has a UI half (`keysUI()` in `src/keys-ui.js`, ...) that formats and records bindings, which only the components
  need
- **Modals** — an element with `data-keybinds-modal` and `open` takes the keyboard: bindings don't fire inside it
- **Schema/Handlers split** — `defineSchema` for binding data, `fromBindings` to attach handlers
- **BindingsStore** — reactive user overrides, kept in localStorage or any `BindingsStorage`
- **Web components** — palette, cheatsheet, settings, context menus, radial menu (shadow DOM; each marks itself
  `data-keybinds="<kind>"`; `styles/palette.css` themes them from `--keybinds-*` variables)
- **CommandHub** — commands from many sources, one rebindable store, keys, components and `data-command` buttons kept in
  step

## Development

```bash
cd docs && bun dev   # Local docs
```

Tests, formatting, linting and type checks run from the repo root (see its `CLAUDE.md`).
