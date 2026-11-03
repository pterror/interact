/**
 * Showing physical keys ("slash", "digit1", "bracketleft") as the character they type on the person's own keyboard
 * layout, rather than a US one. Browsers that can tell (Chromium) say so through navigator.keyboard.getLayoutMap();
 * elsewhere keys show as on a US layout.
 * @example
 * const input = keysUI(followLayout()) // follows the layout, and switches with it
 * const fixed = keysUI(layout(await loadLayout())) // shows one layout and nothing more
 */
import type { KeySyntax } from './keys.js';
/**
 * The person's keyboard layout, from the browser
 * @returns {Promise<ReadonlyMap<string, string> | undefined>} What each physical key types, or undefined where the
 *   browser can't tell, or won't here (an iframe without permission, say)
 */
declare function loadLayout(): Promise<ReadonlyMap<string, string> | undefined>;
/**
 * For keysUI(layout(map)): shows physical keys as one layout types them
 * @param {ReadonlyMap<string, string>} [map] - The layout, from loadLayout(); none shows keys as on a US
 *   layout
 * @returns {KeySyntax} The layout, as a piece of key syntax
 */
declare function layout(map?: ReadonlyMap<string, string>): KeySyntax;
/**
 * For keysUI(followLayout()): shows physical keys as the person's layout types them, following them switching
 * layouts. Components showing bindings update when it changes
 * @param {EventTarget} [view] - The window to follow (default: the global one)
 * @returns {KeySyntax} The layout, as a piece of key syntax that can change
 */
declare function followLayout(view?: EventTarget): KeySyntax;
export { followLayout, layout, loadLayout };
