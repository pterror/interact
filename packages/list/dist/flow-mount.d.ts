/**
 * Elements in one container, in order, in the page's flow. An element already in place isn't moved.
 */
/**
 * A mount into one container, which holds only what is put there
 * @param {Element} container - The container
 * @returns {Readonly<{ put: (key: unknown, element: Element, before: Element | undefined) => void,
 *   remove: (element: Element) => void }>} The mount
 */
declare function flowMount(container: Element): Readonly<{
    put: (key: unknown, element: Element, before: Element | undefined) => void;
    remove: (element: Element) => void;
}>;
export { flowMount };
