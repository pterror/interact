/**
 * An attribute that says whether a test holds for an element's key: one value while it does, another (or none) while
 * it doesn't.
 */
export type Test<K> = Readonly<{
    has: (key: K) => boolean;
    watch: (listener: (keys?: readonly K[]) => void) => () => void;
}>;
export type MarkOptions<K> = Readonly<{
    test: Test<K>;
    attribute: string;
    on: string;
    off?: string;
}>;
/**
 * Whether something holds for a key, and hearing the keys it changed for (none: any)
 * @template K
 * @typedef {Readonly<{ has: (key: K) => boolean, watch: (listener: (keys?: readonly K[]) => void) => () => void }>}
 *   Test
 */
/**
 * @template K
 * @typedef {Readonly<{ test: Test<K>, attribute: string, on: string, off?: string }>} MarkOptions
 */
/**
 * Marks elements whose key a test holds for
 * @template K
 * @param {MarkOptions<K>} options - The test, the attribute, its value while the test holds, and while it doesn't
 *   (left out: the attribute is removed)
 * @returns {Readonly<{ apply: (key: K, element: Element) => void,
 *   watch: (listener: (keys?: readonly K[]) => void) => () => void }>} The facet
 */
declare function mark<K>({ attribute, off, on, test }: MarkOptions<K>): Readonly<{
    apply: (key: K, element: Element) => void;
    watch: (listener: (keys?: readonly K[]) => void) => () => void;
}>;
export { mark };
