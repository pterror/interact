/**
 * What every generated React component runs on: a widget described for a component, run by the core's page and drawn
 * by React. Each part is a React element with the core's attributes (`attributesOf`), so a server renders what the
 * client hydrates; after each commit the page listens on every part, found by its id. The bound value follows React's
 * convention (`value`, `defaultValue`, `onChange`; for a value of another name, `open`, `defaultOpen`, `onOpenChange`),
 * each of the widget's own effects is an `on` prop, and ids come from `useId`.
 */
import type { Description, Key, Naming, OutsideGiven, Props, Source, Words } from '@pterror/interact-core';
import type { FunctionComponent, ReactNode } from 'react';
export type Change = Readonly<{
    refuse: () => void;
}>;
export type PartOf = Readonly<{
    name: string;
    item: Key | null;
}>;
export type PartProps = Readonly<{
    [attribute: string]: unknown;
}> & Readonly<{
    children?: ReactNode;
    part: PartOf;
}>;
export type HostProps<Parts extends string> = Readonly<{
    item?: (key: Key) => ReactNode;
    name?: (key: Key) => string;
    parts?: Readonly<{ [P in Parts]?: FunctionComponent<PartProps>; }>;
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
export type Own<P, V extends string, T, E, I> = Omit<P, V | keyof I> & ([V] extends [never] ? unknown : Bound<V, T>) & {
    readonly [K in E extends Readonly<{
        type: infer N extends string;
    }> ? N : never as `on${Capitalize<K>}`]?: (effect: Extract<E, Readonly<{
        type: K;
    }>>) => void;
} & I;
export type Component<O, Parts extends string> = FunctionComponent<O & HostProps<Parts>> & Readonly<{
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
export type Drawing = Readonly<{
    naming: Naming;
    item: ((key: Key) => ReactNode) | undefined;
    sources: Readonly<{
        [name: string]: Source;
    }> | undefined;
    parts: Readonly<{
        [name: string]: FunctionComponent<PartProps> | undefined;
    }>;
}>;
/**
 * Makes a component from a widget's description
 * @template O
 * @template {string} Parts
 * @param {Description} description - The widget, and how the component takes its props
 * @param {string} displayName - The component's name, for React's tools
 * @returns {Component<O, Parts>} The component
 */
declare function component<O, Parts extends string>(description: Description, displayName: string): Component<O, Parts>;
export { component };
