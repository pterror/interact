---
editor: minor
markdown: minor
---

editor: `textEditor` is the view and its text port only; the grammar (`grammarLanguage`), the Look (`lookDecorations`)
and the text class are composed in. Key hints are their own piece, `keyHints`, over the buttons `toolbar` and
`selectionBar` give.

markdown: `markdownGrammar` gives way to `htmlInMarkdown`, composed into a grammar with lezer's own pieces; the look is
`markdownLook`, `gfmLook` and `htmlLook`, composed to match.
