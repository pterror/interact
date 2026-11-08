/**
 * Keeps what is in view still when rows above it change height, by scrolling the same amount. What is held still is
 * an anchor the app gives (the active item's top) while it is in view, and the top of the view otherwise. It aims at
 * where the view was plus the change, not at the change from wherever the view is: the browser may already have moved
 * the view when the content got shorter.
 */

/**
 * @typedef {Readonly<{
 *   shifts: Readonly<{ watchShifts: (listener: (top: number, by: number) => void) => () => void }>,
 *   visible: Readonly<{ get: () => Readonly<{ start: number, end: number }>, watch: (listener: () => void) => () => void }>,
 *   scrollBy: (pixels: number) => void,
 *   anchor: () => number | undefined,
 * }>} KeepInPlaceOptions
 */

/**
 * Scrolls by each change of height above what is held still
 * @param {KeepInPlaceOptions} options - The layout's shifts, what is in view, scrolling, and the pixel to hold while
 *   it is in view
 * @returns {() => void} Stops
 */
function keepInPlace({ anchor, scrollBy, shifts, visible }) {
  let last = visible.get().start
  const stopVisible = visible.watch(() => {
    last = visible.get().start
  })
  const stopShifts = shifts.watchShifts((top, by) => {
    const { end, start } = visible.get()
    const held = anchor()
    const at = held !== undefined && held >= last && held < last + (end - start) ? held : last
    if (top < at) {
      const target = last + by
      scrollBy(target - start)
      last = target
    }
  })
  return () => {
    stopVisible()
    stopShifts()
  }
}

export { keepInPlace }
