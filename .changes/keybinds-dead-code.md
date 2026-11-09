---
keybinds: minor
---

keybinds: removed, as nothing used them once the palette and menus left: `CommandHub`, `searchCommands`, `fuzzyMatcher`,
`simpleMatcher`, `defaultScorer`, `groupByCategory`, `inMenu`, `createComponent`, `registerComponents`,
`executeCommand`, `validateCommands`, and the `menu` and `rank` command fields. Define the components with
`customElements.define`; `keybinds()` checks bindings as it starts. Breaking, so a minor version while below 1.0. Fixed:
`mouseUI` is exported; the settings panel's Invert switch has its own class (`settings__binding-invert`) and is styled
like the Release switch; the docs name `formatKeyParts` and `formatBinding`, and `releases` as a `Phase`; the README
gives the license as ISC.
