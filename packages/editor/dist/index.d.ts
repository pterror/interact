/**
 * Text as the source of truth, drawn from its syntax tree: an editor over it and a reader of it, drawn by one Look,
 * and what an app adds to them, as small modules the app wires by hand. Each is also its own module
 * (`@pterror/interact-editor/reader`, ...).
 */
export { lookDecorations } from './decorations.js';
export { ruleOf } from './look.js';
export { overlays } from './overlays.js';
export { reader } from './reader.js';
export { textEditor } from './text-editor.js';
export { walk } from './walk.js';
