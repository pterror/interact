/**
 * Draws any interact core widget's view with Solid, generically: `Interact` is a component over a widget and its
 * props (reactive, delivered as `props` inputs). Each part is drawn once, by identity, and updated in place: a part's
 * attributes and listeners rerun only when that part's own meaning changed, and its contents are a keyed list, so a
 * widget's step reruns only what it changed. The meaning, listeners and modality are the core's `page`, as in its DOM
 * renderer. Ids are Solid's own (`createUniqueId`), so they match between server and client, unless the app names
 * them.
 */
import type { Key, Node as Part, PageOptions } from '@pterror/interact-core';
import type { Accessor, JSX } from 'solid-js';
export type Made = Readonly<{
    element: Element;
    slot: Element;
}>;
export type InteractProps = PageOptions & Readonly<{
    item?: (key: Key) => JSX.Element;
    parts?: Readonly<{
        [name: string]: (node: Accessor<Part>) => Made;
    }>;
}>;
export type Flat = Readonly<{
    node: Part;
    content: readonly string[];
    values: readonly (Readonly<{
        text: string;
    }> | Readonly<{
        item: Key;
    }> | null)[];
}>;
/**
 * A widget, drawn and run by Solid
 * @param {InteractProps} props - The widget, its props, and how the app takes part
 * @returns {JSX.Element} Its root part, and the live region it announces in
 */
declare function Interact(props: InteractProps): JSX.Element;
export { Interact };
