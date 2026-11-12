/**
 * Overlays drawn in an editor: each overlay's ranges over the visible part of the text, as mark decorations, asked for
 * again when the text, the visible part or the overlay changes. An answer's positions are in the text as it was when
 * it was asked for, and are moved through the edits made since. Only the answer to the latest question is drawn.
 */
export type Overlay = import('./reader.js').Overlay;
export type Range = import('./reader.js').Range;
/**
 * Draws overlays in an editor
 * @param {readonly Overlay[]} list - The overlays
 * @returns {import('@codemirror/state').Extension} The extension that draws them
 */
declare function overlays(list: readonly Overlay[]): import('@codemirror/state').Extension;
export { overlays };
