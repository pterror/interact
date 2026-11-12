/**
 * Text as the source of truth, drawn from its syntax tree: an editor over it and a reader of it, drawn by one Look,
 * and what an app adds to them, as small modules the app wires by hand. Each is also its own module
 * (`@pterror/interact-editor/reader`, ...).
 */
export { lookChanged, lookDecorations } from './decorations.js';
export { keyboardInset } from './keyboard-inset.js';
export { ruleOf } from './look.js';
export { overlays } from './overlays.js';
export { reader } from './reader.js';
export { selectionBar } from './selection-bar.js';
export { suggestions } from './suggestions.js';
export { textEditor } from './text-editor.js';
export { toolbar } from './toolbar.js';
export { viewUpdates } from './view-updates.js';
export { walk } from './walk.js';
