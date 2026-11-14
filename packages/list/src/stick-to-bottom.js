/**
 * A view kept at the bottom of a list counted from the bottom (a chat) while it is there: once the view is scrolled to
 * the list's bottom, a change to the layout, the ranks or the view (a new message at rank 0, a message measured, the
 * list growing under the view) scrolls it back there, after whatever else moved the view for that change
 * (`keepInPlace`, which holds what was on screen). Whether the view is at the bottom is decided when the scroller
 * scrolls, so a person scrolling up leaves it where they put it until they scroll back down.
 */

/**
 * @typedef {Readonly<{ start: number, end: number }>} Visible
 */

/**
 * @typedef {Readonly<{
 *   element: Element,
 *   visible: Readonly<{ get: () => Visible, watch: (listener: () => void) => () => void }>,
 *   scrollBy: (pixels: number) => void,
 *   layout: Readonly<{ watch: (listener: () => void) => () => void }>,
 *   drawn: Readonly<{ watchRanks: (listener: () => void) => () => void }>,
 * }>} StickToBottomOptions
 */

/** How far from the bottom, in pixels, the view still counts as at it: a scroll position may be a fraction off */
const NEAR = 1

/**
 * Keeps the view at the list's bottom while it is there
 * @param {StickToBottomOptions} options - The scroller; the view counted up from the list's bottom (`viewFrom` with
 *   `edge: 'bottom'`) and scrolling it, a positive amount up; hearing the layout change; and hearing the ranks change
 * @returns {() => void} Stops
 */
function stickToBottom({ drawn, element, layout, scrollBy, visible }) {
  let atBottom = visible.get().start <= NEAR
  let stopped = false

  const stick = () => {
    const { start } = visible.get()
    if (!stopped && atBottom && start !== 0) {
      scrollBy(-start)
    }
  }

  // Two microtasks: past those that everything hearing the change queued as it heard it
  const changed = () => {
    if (atBottom) {
      queueMicrotask(() => {
        queueMicrotask(stick)
      })
    }
  }

  /**
   * Heard in the document's capture phase, before the scroller's own listeners (`viewport`'s): what they report is
   * stuck to the bottom only if this scroll left the view there, and microtasks run between listeners
   * @param {Event} event - A scroll
   */
  const scrolled = (event) => {
    if (event.target === element) {
      atBottom = visible.get().start <= NEAR
    }
  }

  const page = element.ownerDocument
  page.addEventListener('scroll', scrolled, { capture: true, passive: true })
  const stops = [visible.watch(changed), layout.watch(changed), drawn.watchRanks(changed)]
  return () => {
    stopped = true
    page.removeEventListener('scroll', scrolled, { capture: true })
    for (const stop of stops) {
      stop()
    }
  }
}

export { stickToBottom }
