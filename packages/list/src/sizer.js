/**
 * Sizes the element that holds every item, so the scroll range covers them all, drawn or not.
 */

/**
 * @template T
 * @typedef {Readonly<{ get: () => T, watch: (listener: () => void) => () => void }>} Watched
 */

/**
 * @typedef {Readonly<{
 *   element: Element,
 *   layout: Readonly<{ extent: (count: number) => Readonly<{ height: number }>,
 *     watch: (listener: () => void) => () => void }>,
 *   count: Watched<number>,
 * }>} SizerOptions
 */

/**
 * Keeps an element as tall as the layout says every item is
 * @param {SizerOptions} options - The element, the layout and the count
 * @returns {() => void} Stops
 */
function sizer({ count, element, layout }) {
  const size = () => {
    if (element instanceof HTMLElement) {
      element.style.position = 'relative'
      element.style.height = `${String(layout.extent(count.get()).height)}px`
    }
  }
  size()
  const stops = [layout.watch(size), count.watch(size)]
  return () => {
    for (const stop of stops) {
      stop()
    }
  }
}

export { sizer }
