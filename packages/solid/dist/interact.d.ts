/**
 * Draws any interact core widget's view with Solid, generically: `Interact` is a component over a widget and its
 * props (reactive, delivered as `props` inputs). Each part is drawn once, by identity, with `Dynamic` (so a server
 * renders it and the client hydrates it), its attributes the core's (`attributesOf`) and updated in place when that
 * part's own meaning changes; its contents are a keyed list, so a widget's step reruns only what it changed. The
 * listeners and modality are the core's `page`, which finds each part by its id once it is drawn. Ids are Solid's own
 * (`createUniqueId`), so they match between server and client, unless the app names them.
 */
import type { Key, Node as Part, PageOptions } from '@pterror/interact-core';
import type { Component, JSX } from 'solid-js';
export type PartOf = Readonly<{
    name: string;
    item: Key | null;
}>;
export type PartProps = Readonly<{
    [attribute: string]: unknown;
}> & Readonly<{
    children?: JSX.Element;
    part: PartOf;
}>;
export type InteractProps = PageOptions & Readonly<{
    item?: ((key: Key) => JSX.Element) | undefined;
    parts?: Readonly<{
        [name: string]: Component<PartProps> | undefined;
    }> | undefined;
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
