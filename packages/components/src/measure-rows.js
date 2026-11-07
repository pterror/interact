/**
 * Measuring rows in the page: the pitch they are laid out at, in their own CSS pixels, which scroll positions are in;
 * and on screen, which the browsers' limit on a scrollable area is in.
 */

/**
 * How much an element is zoomed by CSS `zoom` on it and its ancestors, across shadow roots: `currentCSSZoom` where
 * the browser has it (Chrome, Firefox), else the product of each one's computed `zoom` (WebKit 27.2 has no
 * `currentCSSZoom`).
 * @param {Element} element - The element
 * @returns {number} The zoom
 */
function zoomOf(element) {
  if ('currentCSSZoom' in element && typeof element.currentCSSZoom === 'number') {
    return element.currentCSSZoom
  }
  let zoom = 1
  /** @type {Element | undefined} */
  let at = element
  while (at) {
    zoom *= Number(getComputedStyle(at).zoom) || 1
    const root = at.getRootNode()
    at = at.parentElement ?? (root instanceof ShadowRoot ? root.host : undefined)
  }
  return zoom
}

/**
 * A length in pixels as `getComputedStyle` gives it.
 * @param {string} value - The length, like "27.2969px"
 * @returns {number} The pixels, or NaN if it isn't in pixels
 */
function pixels(value) {
  return value.endsWith('px') ? Number(value.slice(0, -'px'.length)) : Number.NaN
}

/**
 * The pitch rows are laid out at, from one row's height in its own CSS pixels, and how far apart they are on screen,
 * zoom included.
 * @param {Element} row - A row
 * @returns {Readonly<{ pitch: number, screen: number }> | undefined} The pitches, unless the row has no height yet
 */
function measureRow(row) {
  const pitch = pixels(getComputedStyle(row).height)
  return pitch > 0 ? { pitch, screen: pitch * zoomOf(row) } : undefined
}

export { measureRow, pixels, zoomOf }
