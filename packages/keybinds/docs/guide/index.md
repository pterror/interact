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
  import { keybinds, keys, registerComponents } from '@pterror/interact-keybinds'

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

  // Register and connect the cheatsheet
  registerComponents()
  document.querySelector('keybinds-cheatsheet').commands = commands
</script>
```

That's it. You get:

- `$mod+S` / `$mod+O` keybinds working
- Hold `Control` for a second shows cheatsheet

keybinds' own web components, via `registerComponents()`:

- `<keybinds-cheatsheet>` — hold-to-show keybinding reference
- `<keybinds-settings>` — rebindable keyboard shortcuts panel
- `<keybinds-radial-menu>` — up to eight commands around a point

Your own command palette, menus and buttons can list, search and run a `CommandHub`'s commands: see
[Components](/guide/components#a-command-system).

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
