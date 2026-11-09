# @pterror/interact-solid

SolidJS and interact's abstractions, both ways. One bridge per abstraction, none per module: any signal or memo is a
Value, Watched, Drawn or Set; any Watched or Test is an accessor; any component is what `render` draws.

```bash
npm install @pterror/interact-solid solid-js
```

| Bridge                   | From                                        | To                                  |
| ------------------------ | ------------------------------------------- | ----------------------------------- |
| `toValue(accessor)`      | a signal, memo or derived function          | Value, read untracked               |
| `toWatched(accessor)`    | the same                                    | Watched, told only of a new value   |
| `toDrawn(accessor)`      | the same, of keys                           | Drawn                               |
| `toSet(setter)`          | a signal's setter                           | Set (a function is stored, not run) |
| `fromWatched(watched)`   | Watched (a held key, a `cell`, ...)         | an accessor                         |
| `fromTest(test)`         | Test                                        | an accessor per key                 |
| `fromKeyed(read, watch)` | any answer per key, with its changed keys   | an accessor per key                 |
| `componentItems(Item)`   | a component of `{ key }` giving one element | `create` and `drop`, for `render`   |

The accessors per key follow only the keys some computation reads, and rerun only the computations reading a key whose
answer changed, so a list drawn by windowing costs what is on screen. `componentItems` runs each item in its own root,
owned by where it is called: items see that context, and are disposed when render drops them or when that owner goes.

```tsx
import { activeDescendant, arrayList, flowMount, mark, render } from '@pterror/interact-list'
import { componentItems, fromTest, fromWatched } from '@pterror/interact-solid'
import { onCleanup } from 'solid-js'

function Entries() {
  const list = arrayList(['a', 'b', 'c'])
  const active = list.hold('a', 'next')
  const isActive = fromTest(active)
  const shownActive = fromWatched(active)
  const box = (<div role="listbox" tabindex="0" />) as HTMLDivElement
  const items = componentItems<string>((props) => (
    <div role="option" id={`entry-${props.key}`} classList={{ current: isActive(props.key) }}>
      {props.key}
    </div>
  ))
  const rendered = render({
    ...items,
    drawn: list,
    mount: flowMount(box),
    facets: [
      mark({ test: active, attribute: 'aria-selected', on: 'true', off: 'false' }),
      activeDescendant({ element: box, active, idOf: (key) => `entry-${key}` }),
    ],
  })
  onCleanup(rendered.stop)
  return (
    <>
      {box}
      <p>Active: {shownActive()}</p>
    </>
  )
}
```

An item's component runs when render makes its element; its effects (`onMount` included) run after the element is in
place when a Solid update is under way, and before it otherwise. Read layout in a facet (`measure`, `place`). Leave the
attributes and styles a facet sets to the facet.

Needs `@pterror/interact-list` 0.2.0 or later, for render's `drop`.
