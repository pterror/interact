/**
 * Keeps what is on screen in place, by key, whatever moves it: rows above it measured, or items added or removed
 * above it. It holds one drawn item at its distance from the top of the view (the item the app prefers, the active
 * one, while it is in view; else the first item from the top of the view), and after any change to the layout or the
 * ranks scrolls so that item is there again. It picks again when the view scrolls by other means, or when the preferred
 * item has come into view (revealed, say) and isn't the one held. It scrolls once
 * the change has been heard by everything else, so what sizes the scroll range already includes it. It hands the key it
 * holds on (`hold`), for the app to keep drawn, so the key has a rank after an edit however far it moved.
 */

/**
 * @template K
 * @typedef {Readonly<{
 *   visible: Readonly<{ get: () => Readonly<{ start: number, end: number }>,
 *     watch: (listener: () => void) => () => void }>,
 *   scrollBy: (pixels: number) => void,
 *   layout: Readonly<{ place: (rank: number) => Readonly<{ y: number }>, watch: (listener: () => void) => () => void }>,
 *   drawn: Readonly<{ keys: () => readonly K[], rank: (key: K) => number | undefined,
 *     watchRanks: (listener: () => void) => () => void }>,
 *   prefer: () => K | undefined,
 *   hold: (key: K | undefined) => void,
 * }>} KeepInPlaceOptions
 */

/**
 * Holds what is on screen in place
 * @template K
 * @param {KeepInPlaceOptions<K>} options - What is in view, scrolling, the layout, the keys drawn and their ranks, and
 *   the key to hold while it is in view, and where the key held goes
 * @returns {() => void} Stops
 */
function keepInPlace({ drawn, hold, layout, prefer, scrollBy, visible }) {
  /** @type {{ key: K, offset: number } | undefined} */
  let held = undefined
  /** @type {number | undefined} */
  let expected = undefined
  let pending = false

  /**
   * Where a drawn key is
   * @param {K} key - The key
   * @returns {number | undefined} Its top, in pixels, if it is drawn
   */
  const topOf = (key) => {
    const rank = drawn.rank(key)
    return rank === undefined ? undefined : layout.place(rank).y
  }

  const choose = () => {
    const { end, start } = visible.get()
    const preferred = prefer()
    const preferredTop = preferred === undefined ? undefined : topOf(preferred)
    if (preferred !== undefined && preferredTop !== undefined && preferredTop >= start && preferredTop < end) {
      held = { key: preferred, offset: preferredTop - start }
      return
    }
    /** @type {{ key: K, top: number } | undefined} */
    let best = undefined
    for (const key of drawn.keys()) {
      const top = topOf(key)
      if (top !== undefined && top >= start && (best === undefined || top < best.top)) {
        best = { key, top }
      }
    }
    held = best === undefined ? undefined : { key: best.key, offset: best.top - start }
  }

  const pick = () => {
    choose()
    hold(held?.key)
  }

  const restore = () => {
    pending = false
    const preferred = prefer()
    const preferredTop = preferred === undefined ? undefined : topOf(preferred)
    const { end, start: now } = visible.get()
    if (
      preferred !== undefined &&
      preferred !== held?.key &&
      preferredTop !== undefined &&
      preferredTop >= now &&
      preferredTop < end
    ) {
      pick()
      return
    }
    const top = held === undefined ? undefined : topOf(held.key)
    if (held === undefined || top === undefined) {
      pick()
      return
    }
    const target = top - held.offset
    const { start } = visible.get()
    if (target !== start) {
      expected = target
      scrollBy(target - start)
    }
  }

  const changed = () => {
    if (!pending) {
      pending = true
      queueMicrotask(restore)
    }
  }

  const scrolled = () => {
    const { start } = visible.get()
    if (expected !== undefined && Math.abs(start - expected) < 1) {
      expected = undefined
      return
    }
    expected = undefined
    if (!pending) {
      pick()
    }
  }

  pick()
  const stops = [visible.watch(scrolled), layout.watch(changed), drawn.watchRanks(changed)]
  return () => {
    for (const stop of stops) {
      stop()
    }
  }
}

export { keepInPlace }
