---
core: minor
solid: minor
react: minor
vue: minor
svelte: minor
elements: minor
---

core: select takes disabled, closes without committing when disabled, and ignores user input until enabled. Naming
accepts a complete structured-target-to-id function without a prefix or key encoder. Every DOM attribute, ARIA reference
and lookup uses it. Internal part identity is independent of DOM naming and distinguishes opaque string and number keys
and composed paths. Framework renderers use that identity for their keyed parts.

core ships declarations, including the generated widgets' declarations. Declaration builds process dependencies before
their consumers and can use a package's tsconfig.build.json.
