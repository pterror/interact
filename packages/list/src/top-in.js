/**
 * An element's top, or its bottom, in its scroll container's content, followed as it or what is above it changes size.
 */

/**
 * @param {Element} element - The element
 * @param {Element} container - The scroll container it is in
 * @param {'top' | 'bottom'} [edge] - Which of its edges (`top` by default)
 * @returns {Readonly<{ get: () => number, watch: (listener: () => void) => () => void }>} The edge, in pixels from the
 *   top of the container's content; heard when the element or one of the container's children changes size
 */
function topIn(element, container, edge = 'top') {
  const get = () =>
    element.getBoundingClientRect()[edge] -
    container.getBoundingClientRect().top -
    container.clientTop +
    container.scrollTop
  return {
    get,
    watch(listener) {
      if (typeof ResizeObserver === 'undefined') {
        return () => undefined
      }
      let last = get()
      const observer = new ResizeObserver(() => {
        const now = get()
        if (now !== last) {
          last = now
          listener()
        }
      })
      observer.observe(element)
      for (const child of container.children) {
        observer.observe(child)
      }
      return () => {
        observer.disconnect()
      }
    },
  }
}

export { topIn }
