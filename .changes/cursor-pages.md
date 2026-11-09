---
list: minor
---

list: `cursorPages`, a list read a page at a time after a cursor (search results, with no ranks or total): KeysAt,
Locate, a count that grows as pages are read, whether the end has been read, and a Step through the held keys. It holds
one run of consecutive pages read in one question, keeps every page's cursor and size, and reads a dropped page again by
its cursor.
