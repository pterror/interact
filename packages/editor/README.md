# @pterror/interact-editor

Text as the source of truth, drawn from its syntax tree. An editor over it and a reader of it draw by one Look, a table
from syntax nodes to elements, classes, marks and pieces, and differ only in the marks and in how pieces look. The
grammar is passed in: the editor knows no markdown (`@pterror/interact-markdown` has a grammar and its Look).

```bash
npm install @pterror/interact-editor @codemirror/state @codemirror/view @codemirror/language @lezer/common
```

| Module                         | Does                                                                                           |
| ------------------------------ | ---------------------------------------------------------------------------------------------- |
| `textEditor(options)`          | a CodeMirror editor over a text held elsewhere; each edit goes out with an id as it is made    |
| `reader(options)`              | the text drawn for reading into an element, redrawn from the first part a new text changes     |
| `overlays(list)`               | ranges drawn over the editor's text without changing it (search matches, lore marks)           |
| `lookDecorations(look)`        | the editor's drawing of a Look, for an editor made some other way                              |
| `ruleOf(look, node, read, on)` | the rule a node is drawn by                                                                    |
| `walk(node, from, to, visit)`  | the nodes touching a range, including trees mounted over parts of a node (HTML in a paragraph) |

The text held elsewhere says which of the editor's edits it includes. The editor shows it with the edits it doesn't
include yet laid over it, so an echo of an earlier edit, or someone else's edit, never undoes what was typed since.

`docs/design.md` in the repository, "Editor", is the design.
