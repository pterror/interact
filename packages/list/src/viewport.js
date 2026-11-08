/**
 * A scroll container: the range of its content in view, in pixels from its top, and scrolling it.
 */

/**
 * The content in view, from `start` to `end` pixels
 * @typedef {Readonly<{ start: number, end: number }>} Visible
 */

/**
 * @typedef {Readonly<{
 *   get: () => Visible,
 *   watch: (listener: () => void) => () => void,
 *   scrollBy: (pixels: number) => void,
 *   stop: () => void,
 * }>} Viewport
 */

/**
 * Follows what a scroll container shows
 * @param {Element} element - The scroll container
 * @returns {Viewport} What is in view, scrolling it, and stopping
 */
function viewport(element) {
  /** @type {Set<() => void>} */
  const listeners = new Set()
  const changed = () => {
    for (const listener of listeners) {
      listener()
    }
  }
  element.addEventListener('scroll', changed, { passive: true })
  const resizes = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(changed)
  resizes?.observe(element)
  return {
    get: () => ({ end: element.scrollTop + element.clientHeight, start: element.scrollTop }),
    scrollBy(pixels) {
      element.scrollTop += pixels
    },
    stop() {
      element.removeEventListener('scroll', changed)
      resizes?.disconnect()
    },
    watch(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

export { viewport }
