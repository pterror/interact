/**
 * The person's keyboard layout: what each physical key types, by `event.code`, from the browser where it can tell
 * (navigator.keyboard.getLayoutMap(), in Chromium); unknown elsewhere. Browsers say nothing when someone switches
 * layouts, so while watched it looks again when the window gets focus back, and when a key types something other than
 * the layout says.
 */
export type Layout = ReadonlyMap<string, string> | undefined;
/**
 * The layout, followed
 * @param {EventTarget} [view] - The window to follow (default the global one)
 * @returns {Readonly<{ get: () => Layout, watch: (listener: () => void) => () => void }>} The layout as last loaded,
 *   and hearing it change
 */
declare function layout(view?: EventTarget): Readonly<{
    get: () => Layout;
    watch: (listener: () => void) => () => void;
}>;
export { layout };
