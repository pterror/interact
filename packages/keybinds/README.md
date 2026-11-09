# @pterror/interact-keybinds

Declarative, contextual keybindings for the web. Zero dependencies.

## Install

```bash
npm install @pterror/interact-keybinds
```

## Usage

```js
import { keybinds, keys, registerComponents } from '@pterror/interact-keybinds'

import '@pterror/interact-keybinds/styles/palette.css'

const commands = [
  {
    id: 'save',
    label: 'Save document',
    category: 'File',
    keys: ['$mod+s'],
    execute: () => save(),
  },
]

keybinds(commands, undefined, { inputs: [keys()] })

// Optional: keybinds' own UI components (cheatsheet, settings, radial menu)
registerComponents()
document.querySelector('keybinds-cheatsheet').commands = commands
```

An app's own command palette, menus and buttons can list, search and run a `CommandHub`'s commands through it as a
command system (`hub.commandSystem()`): see the [Components guide](docs/guide/components.md#a-command-system).

`$mod` maps to `Cmd` on Mac, `Ctrl` elsewhere.

## Features

- **Schema-driven** — define bindings as data, separate triggers from handlers
- **Context-aware** — commands activate based on application state
- **User-rebindable** — `BindingsStore` persists overrides to localStorage, or to any storage you give it
- **Discoverable** — built-in `<keybinds-cheatsheet>`, `<keybinds-settings>` and `<keybinds-radial-menu>`; a command
  system for an app's own palette and menus
- **Framework-agnostic** — pure JS core, works anywhere

## Docs

[pterror.github.io/keybinds](https://pterror.github.io/keybinds/)

## License

MIT
