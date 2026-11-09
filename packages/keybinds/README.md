# @pterror/interact-keybinds

Keybindings for the web, built from small modules the app wires by hand: the keyboard, the mouse and gamepads as
presses; an engine that runs what they are bound to (presses, releases, holds, sequences); axes read when the app asks;
showing, recording and keeping people's rebindings; and an unstyled cheatsheet, radial menu and settings panel made of
those modules and `@pterror/interact-list`. No stylesheet, no custom elements; importing a module does nothing.

```bash
npm install @pterror/interact-keybinds
```

```js
import { keybinds } from '@pterror/interact-keybinds'

const stop = keybinds([
  { keys: ['$mod+s'], run: () => save() },
  { keys: ['Escape'], run: () => close(), when: () => isOpen() },
])
```

`$mod` is Meta on a Mac and Ctrl elsewhere. `keybinds()` is a ready-made composition; an app that wants something else
wires the modules itself (`presses`, `keyListen`, `bindingTable`, ...). Each module is also its own entry point
(`@pterror/interact-keybinds/key-listen`, ...).

The ready-made UI (`cheatsheet()`, `radialMenu()`, `settings()`) builds into an element the app gives it, in the light
DOM, and shows its state only as `aria-*` and `data-*` attributes; the app styles it. Each is a few lines wiring
exported pieces, so an app replaces one piece and keeps the rest.

## Docs

[pterror.github.io/keybinds](https://pterror.github.io/keybinds/); the design is in
[docs/design.md](https://github.com/pterror/interact/blob/master/docs/design.md).

## License

ISC
