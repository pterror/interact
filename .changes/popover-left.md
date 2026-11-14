---
list: minor
---

list: `popover` takes `side: 'left'`, beside the anchor on its left, ending where the anchor starts and level with its
top. Below or beside its anchor, a popover is kept inside the window: one that would come within 8 px of an edge it
grows towards is flipped to the anchor's other side across, then along, then both, the first that fits. Against an HTML
element in a browser with CSS Anchor Positioning, the element is shown with its anchor as `source` and the browser
places and flips it (`position-anchor: auto`, `position-try-fallbacks`); otherwise `popover` does, again on scroll,
resize and a change of the element's size. A centred popover is unchanged.
