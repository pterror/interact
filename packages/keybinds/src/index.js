/**
 * Declarative, contextual keybindings: everything, from one place. Each part is also its own module (keybinds/core,
 * keybinds/keys, keybinds/palette, ...) for pages that load them without a bundler.
 */

/** @typedef {import('./command.js').Command} Command */
/** @typedef {import('./command.js').AxisDef} AxisDef */
/** @typedef {import('./command.js').AxisValue} AxisValue */
/** @typedef {import('./command.js').BindingSchema} BindingSchema */
/** @typedef {import('./command.js').Schema} Schema */
/** @typedef {import('./command.js').BindingOverrides} BindingOverrides */
/** @typedef {import('./command.js').Context} Context */
/** @typedef {import('./input.js').Input} Input */
/** @typedef {import('./input.js').InputUI} InputUI */
/** @typedef {import('./input.js').Dispatch} Dispatch */
/** @typedef {import('./input.js').Press} Press */
/** @typedef {import('./binding-mods.js').Modifiers} Modifiers */
/** @typedef {import('./core.js').KeybindsOptions} KeybindsOptions */
/** @typedef {import('./search.js').Matcher} Matcher */
/** @typedef {import('./search.js').ScoredCommand} ScoredCommand */
/** @typedef {import('./bindings-storage.js').BindingsStorage} BindingsStorage */
/** @typedef {import('./store.js').AnyBindingsStore} AnyBindingsStore */

export { anyModifiers } from './any-modifiers.js'
export { axes } from './axes.js'
export { axesUI, formatAxisParts } from './axes-ui.js'
export { bindingLookup, findConflict, parseBinding, splitBinding } from './binding.js'
export { bindingParts, formatBinding } from './binding-format.js'
export { executeCommand, isActive } from './command.js'
export { createComponent } from './create-component.js'
export { keybinds, validateCommands } from './core.js'
export { gamepad } from './gamepad.js'
export { formatGamepadParts, gamepadUI } from './gamepad-ui.js'
export { holds } from './holds.js'
export { CommandHub } from './hub.js'
export { keys, parseKey } from './keys.js'
export { aliases } from './keys-aliases.js'
export { followLayout, layout, loadLayout } from './keys-layout.js'
export { symbols } from './keys-symbols.js'
export { eventToBindingString, formatKeyParts, keysUI } from './keys-ui.js'
export { onModifierHold, onModifierTaps } from './modifiers.js'
export { mouse, mouseMatches } from './mouse.js'
export { eventToMouseBindingString, formatMouseParts } from './mouse-ui.js'
export { releases } from './releases.js'
export { fuzzyMatcher, simpleMatcher } from './matchers.js'
export { defaultScorer } from './scorer.js'
export { filterByMenu, groupByCategory, searchCommands } from './search.js'
export { sequences } from './sequences.js'
export { BindingsChangeEvent } from './bindings-change.js'
export { localStorageBindings } from './bindings-storage.js'
export { defineSchema, withOverride } from './schema.js'
export { BindingsStore, entriesOf, fromBindings, listBindings } from './store.js'
export { BasicContextMenu } from './basic-context-menu.js'
export { KeybindCheatsheet } from './cheatsheet.js'
export { ContextMenu } from './context-menu.js'
export { CommandPalette } from './palette.js'
export { RadialMenu } from './radial-menu.js'
export { KeybindSettings } from './settings.js'
export { registerComponents } from './register.js'
