/**
 * An element's inner width, followed as it changes.
 */

/**
 * @param {Element} element - The element
 * @returns {Readonly<{ get: () => number, watch: (listener: () => void) => () => void }>} Its width in pixels
 */
function widthOf(element) {
  return {
    get: () => element.clientWidth,
    watch(listener) {
      if (typeof ResizeObserver === 'undefined') {
        return () => undefined
      }
      let last = element.clientWidth
      const observer = new ResizeObserver(() => {
        if (element.clientWidth !== last) {
          last = element.clientWidth
          listener()
        }
      })
      observer.observe(element)
      return () => {
        observer.disconnect()
      }
    },
  }
}

export { widthOf }
