/**
 * What every generated Vue component runs on: a widget described for a component, run by the core's page and drawn by
 * Vue's render functions. Each part is a vnode with the core's attributes (`attributesOf`), so a server renders what
 * the client hydrates; after each update the page listens on every part, found by its id. The bound value follows
 * `v-model` (`modelValue` and `update:modelValue`, or `v-model:open` for a value of another name, with `defaultValue`
 * or `defaultOpen` where the component's own value starts), each of the widget's own effects is an emitted event, an
 * item is drawn by the default slot and a part the app replaces by the slot named after it. Ids come from `useId`
 * (Vue 3.5), or a count kept per app, which a server and its client keep alike.
 */
import type { Description, Key, Naming, OutsideGiven, Props, Source, Words } from '@pterror/interact-core';
import type { Component as VueComponent, VNodeChild } from 'vue';
export type Change = Readonly<{
    refuse: () => void;
}>;
export type PartSlot = Readonly<{
    attrs: Readonly<{
        [attribute: string]: string;
    }>;
    part: Readonly<{
        name: string;
        item: Key | null;
    }>;
    content: VueComponent;
}>;
export type HostProps = Readonly<{
    name?: ((key: Key) => string) | undefined;
    sources?: Readonly<{
        [name: string]: Source;
    }> | undefined;
    words?: Words | undefined;
    naming?: Naming | undefined;
    translate?: ((input: Readonly<{
        [field: string]: unknown;
    }>) => Readonly<{
        [field: string]: unknown;
    }> | null) | undefined;
    outside?: Readonly<{
        [name: string]: OutsideGiven;
    }> | undefined;
}>;
export type ModelName<V extends string> = V extends 'value' ? 'modelValue' : V;
export type Bound<V extends string, T> = {
    readonly [K in ModelName<V>]?: T;
} & {
    readonly [K in `default${Capitalize<V>}`]?: T;
} & {
    readonly [K in `onUpdate:${ModelName<V>}`]?: (value: T, change: Change) => void;
};
export type Own<P, V extends string, T, E, I> = Omit<P, V | keyof I> & ([V] extends [never] ? unknown : Bound<V, T>) & {
    readonly [K in E extends Readonly<{
        type: infer N extends string;
    }> ? N : never as `on${Capitalize<K>}`]?: (effect: Extract<E, Readonly<{
        type: K;
    }>>) => void;
} & I;
export type Slots<Parts extends string> = {
    default?: (props: Readonly<{
        item: Key;
    }>) => VNodeChild;
} & {
    [P in Parts]?: (props: PartSlot) => VNodeChild;
};
export type Emits<V extends string, T, E> = ([V] extends [never] ? unknown : {
    [K in `update:${ModelName<V>}`]: (value: T, change: Change) => void;
}) & {
    [K in E extends Readonly<{
        type: infer N extends string;
    }> ? N : never]: (effect: Extract<E, Readonly<{
        type: K;
    }>>) => void;
};
export type AnyComponent = Readonly<{
    description: Description;
    types: Readonly<{
        own: unknown;
        parts: string;
    }> | undefined;
}>;
export type OwnOf<C extends AnyComponent> = NonNullable<C['types']>['own'];
export type PartsInside<C extends AnyComponent, Inside extends string> = Exclude<NonNullable<C['types']>['parts'], 'root'> | Inside;
export type Given = HostProps & Props;
export type SlotLike = Readonly<{
    draw(props: Readonly<{
        [field: string]: unknown;
    }>): VNodeChild;
}>['draw'];
export type Context = Readonly<{
    slots: Readonly<{
        [name: string]: SlotLike | undefined;
    }>;
}> & Readonly<{
    emit(event: string, ...args: readonly unknown[]): void;
}>;
/**
 * Sets up a component over a widget's description: what its setup does
 * @param {Description} description - The widget, and how the component takes its props
 * @param {Given} props - The component's props
 * @param {Context} context - Its slots and emit
 * @returns {() => VNodeChild} Its render function
 */
declare function run(description: Description, props: Given, context: Context): () => VNodeChild;
/**
 * The options of a component over a widget's description: its name, the props it declares and the events it emits
 * @param {Description} description - The widget, and how the component takes its props
 * @param {string} name - The component's name, for Vue's tools
 * @returns {Readonly<{ name: string, props: string[], emits: string[] }>} The options
 */
declare function optionsOf(description: Description, name: string): Readonly<{
    name: string;
    props: string[];
    emits: string[];
}>;
/**
 * The types a component carries for a component made around it to read: none at run time
 * @returns {undefined} Nothing
 */
declare function typesOf(): undefined;
export { optionsOf, run, typesOf };
