---
solid: minor
---

solid: a component for each of `@pterror/interact-core`'s widgets, generated from it (`Select`, `List`, `Menu`,
`ReorderList`, and `dialog(content, initialFocus)` making a dialog around another), with `value`, `defaultValue` and
`onChange` (or `open`, `defaultOpen`, `onOpenChange`), an `on` prop per event, and `component(description)` making one.
`Interact` renders on a server and hydrates (each part drawn with `Dynamic`), names the parts the app replaces by their
own names (`option`), and takes each as a component given the part's attributes and contents. Supports solid-js 1.8.
