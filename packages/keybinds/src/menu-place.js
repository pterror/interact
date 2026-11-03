/**
 * Where a context menu shows: at a point on screen, kept inside the viewport.
 */

const EDGE = 0

/**
 * A point on screen, in viewport pixels
 * @typedef {Readonly<{ x: number, y: number }>} Point
 */

/**
 * Puts a box at a point, then moves it back inside the viewport once it has been laid out
 * @param {HTMLElement} box - The box
 * @param {Point} point - Where its corner goes
 * @returns {void}
 */
function placeAt(box, { x, y }) {
  box.style.position = 'fixed'
  box.style.left = `${x}px`
  box.style.top = `${y}px`
  requestAnimationFrame(() => {
    const rect = box.getBoundingClientRect()
    if (rect.right > globalThis.innerWidth) {
      box.style.left = `${Math.max(EDGE, globalThis.innerWidth - rect.width)}px`
    }
    if (rect.bottom > globalThis.innerHeight) {
      box.style.top = `${Math.max(EDGE, globalThis.innerHeight - rect.height)}px`
    }
  })
}

/**
 * Where a box of some height starts down the screen from a point: below it when there's room, above it when there's
 * room there, and otherwise as low as it fits
 * @param {number} y - The point
 * @param {number} height - The box's height
 * @returns {number} Its top
 */
function topFor(y, height) {
  const bottom = globalThis.innerHeight
  if (y + height <= bottom) {
    return y
  }
  if (y - height >= EDGE) {
    return y - height
  }
  return bottom - height
}

/**
 * Puts a box at a point and keeps it inside the viewport as it changes size (more items shown, a search narrowing
 * them): without room below the point it opens upward from it, and without room either way it fits where it can
 * @param {HTMLElement} box - The box
 * @param {Point} point - Where its corner goes
 * @returns {() => void} A function that stops following its size
 */
function keepOnScreen(box, { x, y }) {
  box.style.position = 'fixed'
  /**
   * Moves the box to fit
   * @returns {void}
   */
  function fit() {
    box.style.left = `${Math.max(EDGE, Math.min(x, globalThis.innerWidth - box.offsetWidth))}px`
    box.style.top = `${Math.max(EDGE, topFor(y, box.offsetHeight))}px`
  }
  fit()
  if ('ResizeObserver' in globalThis) {
    const observer = new ResizeObserver(fit)
    observer.observe(box)
    return () => {
      observer.disconnect()
    }
  }
  requestAnimationFrame(fit)
  return () => undefined
}

/** A box kept inside the viewport at a point, until it's moved again or stopped */
class OnScreen {
  /** @type {(() => void) | undefined} */
  #stop

  /**
   * Puts the box at a point, and keeps it on screen there
   * @param {HTMLElement} box - The box
   * @param {Point} point - Where its corner goes
   * @returns {void}
   */
  place(box, point) {
    this.stop()
    this.#stop = keepOnScreen(box, point)
  }

  /**
   * Stops following the box's size
   * @returns {void}
   */
  stop() {
    this.#stop?.()
    this.#stop = undefined
  }
}

export { OnScreen, placeAt }
