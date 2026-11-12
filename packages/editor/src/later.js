/**
 * A value that may come now or later
 * @template T
 * @typedef {T | PromiseLike<T>} Later
 */

/**
 * Whether a value is still to come
 * @template T
 * @param {Later<T>} value - The value
 * @returns {value is PromiseLike<T>} Whether it is a promise
 */
function isPromise(value) {
  return typeof value === 'object' && value !== null && 'then' in value && typeof value.then === 'function'
}

/**
 * Hands a value on when it comes: at once when it is already here, so nothing waits a turn for it. A promise that
 * fails hands nothing on, leaving what was drawn from the last answer.
 * @template T
 * @param {Later<T>} value - The value
 * @param {(value: T) => void} use - What takes it
 * @returns {void}
 */
function settle(value, use) {
  if (isPromise(value)) {
    void Promise.resolve(value)
      .then(use)
      .catch(() => undefined)
    return
  }
  use(value)
}

export { settle }
