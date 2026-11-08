# @pterror/interact-list

Lists people move through, pick from and see: listboxes, grids of cards, groups, nested regions, drag to reorder, and
lists too long to draw, held in memory or by a server. Built from small modules the app wires by hand; nothing registers
anything.

```bash
npm install @pterror/interact-list
```

```js
import { arrayList, arrayStep, flowMount, ids, mark, move, render } from '@pterror/interact-list'
```

Each module is also its own entry point (`@pterror/interact-list/move`, ...). The design, and how the modules fit
together, is in [docs/design.md](https://github.com/pterror/interact/blob/master/docs/design.md).
