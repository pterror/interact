/**
 * One value, set and heard.
 */
/**
 * Holds a value. `has` is whether it is a given value; listeners hear the values it left and arrived at, those that
 * aren't undefined
 * @template T
 * @param {T} initial - Its value
 * @returns {Readonly<{
 *   get: () => T,
 *   set: (value: T) => void,
 *   has: (value: T) => boolean,
 *   watch: (listener: (values: readonly NonNullable<T>[]) => void) => () => void,
 * }>} The cell
 */
declare function cell<T>(initial: T): Readonly<{
    get: () => T;
    set: (value: T) => void;
    has: (value: T) => boolean;
    watch: (listener: (values: readonly NonNullable<T>[]) => void) => () => void;
}>;
export { cell };
