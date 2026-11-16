/**
 * Draws any interact core widget's view with Solid, generically: `Interact` is a component over a widget and its
 * props (reactive, delivered as `props` inputs). Each part is drawn once, by identity, as an element a server renders
 * and the client hydrates, its attributes the core's (`attributesOf`) and updated in place when that part's own
 * meaning changes; its contents are a keyed list, so a widget's step reruns only what it changed. The listeners and
 * modality are the core's `page`, which finds each part by its id once each change is drawn. Ids are Solid's own
 * (`createUniqueId`), so they match between server and client, unless the app names them.
 */
import type { Key, Node as Part, PageOptions } from '@pterror/interact-core';
import type { Component } from 'solid-js';
import type { Adapter, PartOf as Of, PartProps as Given, SolidElement } from './adapter.js';
export type PartOf = Of;
export type PartProps = Given;
export type InteractProps = PageOptions & Readonly<{
    item?: ((key: Key) => SolidElement) | undefined;
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
        source: string;
    }> | null)[];
}>;
/**
 * `Interact` for a version of Solid
 * @param {Adapter} solid - The version's adapter
 * @returns {(props: InteractProps) => SolidElement} A component drawing and running a widget
 */
declare function interactWith(solid: Adapter): (props: InteractProps) => SolidElement;
export { interactWith };
