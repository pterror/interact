# @pterror/interact-keybinds

Declarative, contextual keybindings for the web. Zero dependencies.

## Install

```bash
npm install @pterror/interact-keybinds
```

## Usage

```js
import { KeybindCheatsheet, keybinds, keys } from '@pterror/interact-keybinds'

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

// Optional: keybinds' own UI components (cheatsheet, settings, radial menu), defined under names of your choosing
customElements.define('keybinds-cheatsheet', KeybindCheatsheet)
document.querySelector('keybinds-cheatsheet').commands = commands
```

`$mod` maps to `Cmd` on Mac, `Ctrl` elsewhere.

## Features

- **Schema-driven** — define bindings as data, separate triggers from handlers
- **Context-aware** — commands activate based on application state
- **User-rebindable** — `BindingsStore` persists overrides to localStorage, or to any storage you give it
- **Discoverable** — a cheatsheet, a settings panel for rebinding and a radial menu, as custom elements
- **Framework-agnostic** — pure JS core, works anywhere

## Docs

[pterror.github.io/keybinds](https://pterror.github.io/keybinds/)

## License

ISC
