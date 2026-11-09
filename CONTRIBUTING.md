# Contributing

## Checks and tests

Work in the dev shell (`nix develop`, or direnv), which has bun, node and the browsers the tests use.

```bash
bun run check   # format, lint, types, and that every package's dist/*.d.ts is what its source builds
bun run test    # unit and browser tests
bun run build:types   # rebuilds dist/*.d.ts after a change to a typed package's JSDoc
```

## Recording a change

A version changes only in a release, so a package's `version` says what is on npm (or, for a package never released,
what its first release will be). A change to what a package ships is recorded in a file in `.changes/`, in the commit
that makes it, naming each package it changes (by its directory) and how far its version moves:

```md
---
list: minor
---

list: render takes `drop(key, element)`, called once for each element `create` made when render is done with it.
```

`major` breaks something that worked, `minor` adds something, `patch` changes neither (a fix, docs that ship). The text
goes into the release commit's message.

A dependency on another package in the repo is written `workspace:^`, so development uses the package in the repo; its
release publishes `^<the released version>` in its place.

## Releasing

```bash
nix develop -c bun run release --dry-run   # what a release would do, changing nothing
nix develop -c bun run release
```

The release finds each package that changed since its last release tag (`list@0.1.0`); a package with no tag has never
been released, and its first release carries the version in its manifest. Each changed package moves once, by the
highest level its `.changes/` files record; a package that changed without one stops the release, as does a version
changed by hand. A package depending on one that is released moves at least a patch. The release then writes the
versions, deletes the `.changes/` files it used, makes one commit (`release: list@0.2.0, ...`) with an annotated tag per
package, asks for npm's one-time password once and publishes each package.

If a publish fails (an expired password, the network), run it again: it publishes every tagged version npm doesn't have,
without moving any version. Push when it is done: `git push --follow-tags`.
