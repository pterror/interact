# keybinds

Declarative, contextual keybindings for the web. Zero dependencies.

## Install

Not yet published on npm. Install from source:

```bash
git clone https://github.com/pterror/keybinds.git
cd keybinds
npm link
# Then in your project:
npm link keybinds
```

## Usage

```js
import { keybinds, keys, registerComponents } from 'keybinds'

import 'keybinds/styles/palette.css'

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

A command palette, context menus and command buttons come from `@interact/components`, driven by a `CommandHub` as a
command system (`hub.commandSystem()`): see the [Components guide](docs/guide/components.md).

`$mod` maps to `Cmd` on Mac, `Ctrl` elsewhere.

## Features

- **Schema-driven** — define bindings as data, separate triggers from handlers
- **Context-aware** — commands activate based on application state
- **User-rebindable** — `BindingsStore` persists overrides to localStorage, or to any storage you give it
- **Discoverable** — built-in `<keybinds-cheatsheet>` and `<keybinds-settings>`; a palette and menus through
  `@interact/components`
- **Framework-agnostic** — pure JS core, works anywhere

## Docs

[pterror.github.io/keybinds](https://pterror.github.io/keybinds/)

## License

MIT
