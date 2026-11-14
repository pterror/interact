---
list: minor
---

list: lists counted from the bottom, as a chat is: `place`, `topIn` and `viewFrom` take an edge (`edge: 'bottom'` for
`place` and `viewFrom`, `topIn(element, container, 'bottom')`), placing from the container's bottom, measuring an
element's bottom in its scroll container's content, and counting the view up from a list's bottom, which `visibleRanks`,
`windowing` and `keepInPlace` take as they take `viewport`. `stickToBottom` keeps such a view at the list's bottom while
it is there, after `keepInPlace` has moved it for a change.
