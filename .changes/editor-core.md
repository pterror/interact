---
editor: minor
---

editor: the first modules. `textEditor`, a CodeMirror editor over a text held elsewhere, handing each edit on with an id
and laying the edits the text doesn't include yet over what it hears. `reader`, the text drawn for reading by the same
Look, keeping the parts before the first change. `overlays`, ranges drawn over the text without changing it.
`lookDecorations`, `ruleOf` and `walk`, the drawing both use.
