---
list: minor
---

list: `drag` lets go of a press whose release it missed: the pressed element captures the pointer at the press, a
release anywhere in the page ends the press, and a cancel, a lost capture or a move with no button down lets it go,
cancelling a drag under way. A later move no longer starts a drag from a press already released.
