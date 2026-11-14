/**
 * An editor's tooltips in the top layer: every tooltip it shows (suggestions, hover tooltips, any an app adds through
 * `showTooltip`) is drawn inside one `manual` popover, open while the editor shows any, whose source is the editor.
 * The popover is an empty box at the window's top left corner, so CodeMirror places each tooltip against the window
 * as it would without it, `fixed` or `absolute`. It is inside the editor's element, so tooltips still inherit from the
 * editor and match the selectors they did. `textEditor` composes it in.
 */
/**
 * Draws an editor's tooltips in a popover
 * @param {Document} [document] - The editor's document, if not the global one
 * @returns {import('@codemirror/state').Extension} The extension
 */
declare function topLayerTooltips(document?: Document): import('@codemirror/state').Extension;
export { topLayerTooltips };
