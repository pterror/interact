/**
 * How much of the bottom of the window an on-screen keyboard covers, from the visual viewport, so a toolbar can sit
 * above it. Zero where there is no visual viewport.
 */

/**
 * What it reads: the window's height, and its visual viewport
 * @typedef {Readonly<{
 *   innerHeight: number,
 *   visualViewport: (EventTarget & Readonly<{ height: number, offsetTop: number }>) | null,
 * }>} Viewed
 */

/**
 * Follows the keyboard's inset
 * @param {Readonly<{ window?: Viewed }>} [options] - The window (default the global one)
 * @returns {Readonly<{ get: () => number, watch: (listener: () => void) => () => void, stop: () => void }>} The inset in
 *   CSS pixels, told when it changes, and stopping
 */
function keyboardInset({ window = globalThis } = {}) {
  const viewport = window.visualViewport
  const measure = () =>
    viewport === null ? 0 : Math.max(0, Math.round(window.innerHeight - viewport.height - viewport.offsetTop))
  let inset = measure()
  /** @type {Set<() => void>} */
  const listeners = new Set()
  const onChange = () => {
    const now = measure()
    if (now === inset) {
      return
    }
    inset = now
    for (const listener of listeners) {
      listener()
    }
  }
  viewport?.addEventListener('resize', onChange)
  viewport?.addEventListener('scroll', onChange)
  return {
    get: () => inset,
    stop() {
      viewport?.removeEventListener('resize', onChange)
      viewport?.removeEventListener('scroll', onChange)
      listeners.clear()
    },
    watch(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

export { keyboardInset }
