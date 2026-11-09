# Getting Started

keybinds is a declarative, contextual keybinding system for web applications.

## Installation

```bash
npm install @pterror/interact-keybinds
```

## Minimal Setup

```html
<keybinds-cheatsheet auto-trigger></keybinds-cheatsheet>

<script type="module">
  import { KeybindCheatsheet, keybinds, keys } from '@pterror/interact-keybinds'

  import '@pterror/interact-keybinds/styles/palette.css'

  const commands = [
    {
      id: 'save',
      label: 'Save document',
      category: 'File',
      keys: ['$mod+s'],
      execute: () => console.log('save'),
    },
    {
      id: 'open',
      label: 'Open file',
      category: 'File',
      keys: ['$mod+o'],
      execute: () => console.log('open'),
    },
  ]

  // Register keybinds
  keybinds(commands, undefined, { inputs: [keys()] })

  // Define and connect the cheatsheet
  customElements.define('keybinds-cheatsheet', KeybindCheatsheet)
  document.querySelector('keybinds-cheatsheet').commands = commands
</script>
```

That's it. You get:

- `$mod+S` / `$mod+O` keybinds working
- Hold `Control` for a second shows cheatsheet

keybinds' own web components, which you define under names of your choosing (`customElements.define`):

- `KeybindCheatsheet` — hold-to-show keybinding reference
- `KeybindSettings` — rebindable keyboard shortcuts panel
- `RadialMenu` — up to eight commands around a point

## Going Further

Add context for conditional commands:

```js
keybinds(
  commands,
  () => ({
    hasSelection: selection.length > 0,
  }),
  { inputs: [keys()] },
)
```

```js
{
  id: 'delete',
  label: 'Delete selected',
  keys: ['Backspace'],
  when: ctx => ctx.hasSelection,  // Only active when something is selected
  execute: () => deleteSelected()
}
```

## Key Concepts

- **[Commands](/guide/commands)** - Actions with bindings, labels, and conditions
- **[Context](/guide/context)** - Application state that controls command activation
- **[Components](/guide/components)** - Web components for discoverability
- **[Styling](/guide/styling)** - Customizing component appearance
