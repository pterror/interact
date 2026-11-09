/**
 * Elements inside one `role=group` element per group, in one container. A group's element is made when its first
 * element is put, labelled by the element whose id `labelIdOf` gives, and removed with its last.
 */
export type GroupMountOptions<K, G> = Readonly<{
    container: Element;
    groupOf: (key: K) => G;
    labelIdOf: (group: G) => string;
}>;
/**
 * @template K, G
 * @typedef {Readonly<{ container: Element, groupOf: (key: K) => G, labelIdOf: (group: G) => string }>}
 *   GroupMountOptions
 */
/**
 * A mount into group elements
 * @template K, G
 * @param {GroupMountOptions<K, G>} options - The container, each key's group, and the id of what labels a group
 * @returns {Readonly<{ put: (key: K, element: Element, before: Element | undefined) => void,
 *   remove: (element: Element) => void }>} The mount
 */
declare function groupMount<K, G>({ container, groupOf, labelIdOf }: GroupMountOptions<K, G>): Readonly<{
    put: (key: K, element: Element, before: Element | undefined) => void;
    remove: (element: Element) => void;
}>;
export { groupMount };
