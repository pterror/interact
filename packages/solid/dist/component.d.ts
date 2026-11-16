/**
 * What every generated Solid component runs on: a widget described for a component, drawn by `Interact`. The bound
 * value follows the convention Solid's libraries share (`value`, `defaultValue`, `onChange`; for a value of another
 * name, `open`, `defaultOpen`, `onOpenChange`), each of the widget's own effects is an `on` prop, and ids come from
 * `createUniqueId`.
 */
import type { Description, Key, Naming, Props, Source, Words } from '@pterror/interact-core';
import type { Component as SolidComponent, JSX } from 'solid-js';
import type { PartProps } from './interact.js';
export type Change = Readonly<{
    refuse: () => void;
}>;
export type HostProps<Parts extends string> = Readonly<{
    item?: (key: Key) => JSX.Element;
    name?: (key: Key) => string;
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
}>;
export type Bound<V extends string, T> = {
    readonly [K in V]?: T;
} & {
    readonly [K in `default${Capitalize<V>}`]?: T;
} & {
    readonly [K in V extends 'value' ? 'onChange' : `on${Capitalize<V>}Change`]?: (value: T, change: Change) => void;
};
export type Own<P, V extends string, T, E, I> = Omit<P, V | keyof I> & ([V] extends [never] ? unknown : Bound<V, T>) & {
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
/**
 * Makes a component from a widget's description
 * @template O
 * @template {string} Parts
 * @param {Description} description - The widget, and how the component takes its props
 * @returns {Component<O, Parts>} The component
 */
declare function component<O, Parts extends string>(description: Description): Component<O, Parts>;
export { component };
