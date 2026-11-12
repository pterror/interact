/**
 * A value that may come now or later
 * @template T
 * @typedef {T | PromiseLike<T>} Later
 */
export type Later<T> = T | PromiseLike<T>;
/**
 * Hands a value on when it comes: at once when it is already here, so nothing waits a turn for it. A promise that
 * fails hands nothing on, leaving what was drawn from the last answer.
 * @template T
 * @param {Later<T>} value - The value
 * @param {(value: T) => void} use - What takes it
 * @returns {void}
 */
declare function settle<T>(value: Later<T>, use: (value: T) => void): void;
export { settle };
