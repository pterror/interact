/**
 * A Solid component as what render draws for each key: `create` runs it for a key, in a root of its own, and `drop`
 * disposes that root once render is done with the element. The roots are owned by the Solid owner `componentItems`
 * is called in: they see its context, and are disposed with it, if render hasn't dropped them by then. So call it
 * where render is called, and stop render there too (`onCleanup(rendered.stop)`).
 *
 * The component runs when render makes the element, which render then puts in place. Its effects (`onMount`
 * included) run at the end of the Solid update under way, which is after the element is in place; outside one, at the
 * end of making the element, before it is in place. Layout is read by facets (`measure`, `place`), which render
 * applies once the element is in place.
 */
import type { Component } from 'solid-js';
/**
 * A component's items, for render
 * @template K
 * @param {Component<Readonly<{ key: K }>>} component - Draws one key, as one element
 * @returns {Readonly<{ create: (key: K) => Element, drop: (key: K, element: Element) => void }>} Making a key's
 *   element, and disposing it
 */
declare function componentItems<K>(component: Component<Readonly<{
    key: K;
}>>): Readonly<{
    create: (key: K) => Element;
    drop: (key: K, element: Element) => void;
}>;
export { componentItems };
