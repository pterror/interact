---
editor: minor
---

editor: `topLayerTooltips()` draws every CodeMirror tooltip in an editor (suggestions, hover tooltips, any added through
`showTooltip`) in one `manual` popover whose source is the editor, in the top layer; `textEditor` composes it in, so its
tooltips are never clipped or covered by what is around the editor.
