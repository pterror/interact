/**
 * What every generated Solid component runs on: a widget described for a component, drawn by `Interact`. The bound
 * value follows the convention Solid's libraries share (`value`, `defaultValue`, `onChange`; for a value of another
 * name, `open`, `defaultOpen`, `onOpenChange`), each of the widget's own effects is an `on` prop, and ids come from
 * `createUniqueId`.
 */
import type { Description, Key, Naming, OutsideGiven, Props, Source, Words, Sourced } from '@pterror/interact-core';
import type { Component as SolidComponent } from 'solid-js';
import type { Adapter, PartProps, SolidElement } from './adapter.js';
export type Change = Readonly<{
    refuse: () => void;
}>;
export type HostProps<Parts extends string> = Readonly<{
    item?: (key: Key) => SolidElement;
    itemName?: (key: Key) => string;
    name?: string;
    parts?: Readonly<{ [P in Parts]?: SolidComponent<PartProps>; }>;
    sources?: Readonly<{
        [name: string]: Source;
    }>;
    words?: Words;
    naming?: Naming;
    translate?: (input: Readonly<{
        [field: string]: unknown;
    }>) => Readonly<{
        [field: string]: unknown;
    }> | null;
    outside?: Readonly<{
        [name: string]: OutsideGiven;
    }>;
}>;
export type Bound<V extends string, T> = {
    readonly [K in V]?: T;
} & {
    readonly [K in `default${Capitalize<V>}`]?: T;
} & {
    readonly [K in V extends 'value' ? 'onChange' : `on${Capitalize<V>}Change`]?: (value: T, change: Change) => void;
};
export type Own<P, V extends string, T, E, I, S extends string = never> = Sourced<Omit<P, V | keyof I>, S> & ([V] extends [never] ? unknown : Bound<V, T>) & {
    readonly [K in E extends Readonly<{
        type: infer N extends string;
    }> ? N : never as `on${Capitalize<K>}`]?: (effect: Extract<E, Readonly<{
        type: K;
    }>>) => void;
} & I;
export type Component<O, Parts extends string> = SolidComponent<O & HostProps<Parts>> & Readonly<{
    description: Description;
    types?: Readonly<{
        own: O;
        parts: Parts;
    }>;
}>;
export type AnyComponent = Readonly<{
    description: Description;
    types?: Readonly<{
        own: unknown;
        parts: string;
    }>;
}>;
export type OwnOf<C extends AnyComponent> = NonNullable<C['types']>['own'];
export type PartsInside<C extends AnyComponent, Inside extends string> = Exclude<NonNullable<C['types']>['parts'], 'root'> | Inside;
export type Given = HostProps<string> & Props;
export type Make = <O, Parts extends string>(description: Description) => Component<O, Parts>;
/**
 * Makes a component from a widget's description
 * @typedef {<O, Parts extends string>(description: Description) => Component<O, Parts>} Make
 */
/**
 * `component` for a version of Solid
 * @param {Adapter} solid - The version's adapter
 * @returns {Make} Making a component from a widget's description
 */
declare function componentWith(solid: Adapter): Make;
export { componentWith };
