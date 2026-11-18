/**
 * What every framework's generated components share: a widget described for a component, the widget's props that a
 * component's props give, and where an effect that reaches the app goes. A component passes some of the widget's props
 * through as they are, binds one value (the prop a `change` effect from the widget itself is about), turns the
 * widget's other own effects into events, and may take another component's props inside one of the widget's props (a
 * dialog's `content`). Which framework names each of these is the framework's: this works on the widget's names.
 */
import { arraySource } from './host.js';
import type { AnyGenerated, Out } from './compose.js';
import type { Data, Key } from './contract.js';
import type { Source } from './host.js';
import type { Naming, PageOptions } from './web.js';
import type { Words } from './words.js';
export type Bound = Readonly<{
    prop: string;
    wrapped: boolean;
    empty: Data;
    kind: 'string' | 'number' | 'boolean' | 'other';
}>;
export type Description = Readonly<{
    widget: AnyGenerated;
    props: readonly string[];
    sources: readonly string[];
    value: Bound | null;
    events: readonly string[];
    inside: Readonly<{
        [prop: string]: Description;
    }>;
}>;
export type Given = Readonly<{
    [prop: string]: unknown;
}>;
export type Routed = Readonly<{
    inside: readonly string[];
    change: Readonly<{
        value: unknown;
        id: number;
    }>;
}> | Readonly<{
    inside: readonly string[];
    event: string;
    effect: Readonly<{
        [field: string]: unknown;
    }>;
}>;
export type Props = Readonly<{
    [prop: string]: unknown;
}>;
export type Names = Readonly<{
    value: (prop: string) => string;
    initial: (prop: string) => string;
}>;
export type Held = Readonly<{
    value: unknown;
    inside: Readonly<{
        [prop: string]: Held;
    }>;
}>;
export type OutsideGiven = string | Element | Readonly<{
    current: Element | null;
}> | Readonly<{
    value: Element | null;
}> | (() => Element | null) | null | undefined;
/** @import { AnyGenerated, Out } from './compose.js' */
/** @import { Data, Key, Path } from './contract.js' */
/** @import { Source } from './host.js' */
/** @import { Naming, PageOptions } from './web.js' */
/** @import { Words } from './words.js' */
/**
 * The value a component binds: the widget's prop, whether the widget takes it as `{ value }` (with `null` for none
 * given: the select's `value`) or as it is (the dialog's `open`), the value before any is given or chosen, and what it
 * holds as an attribute can give it (a key as text)
 * @typedef {Readonly<{ prop: string, wrapped: boolean, empty: Data, kind: 'string' | 'number' | 'boolean' | 'other' }>} Bound
 */
/**
 * A widget as a component runs it (its generated in-place code): its props passed through, its bound value, the types of its own effects that are
 * the app's, the widget props that take another component's props (by that component's description), and the props
 * that name a collection, which the component can be given the items of instead (`items` for `source`)
 * @typedef {Readonly<{
 *   widget: AnyGenerated,
 *   props: readonly string[],
 *   sources: readonly string[],
 *   value: Bound | null,
 *   events: readonly string[],
 *   inside: Readonly<{ [prop: string]: Description }>,
 * }>} Description
 */
/**
 * A component's props in the widget's names: each prop passed through, the bound value as it shows now (the app's,
 * or the component's own), and the props of each component inside
 * @typedef {Readonly<{ [prop: string]: unknown }>} Given
 */
/**
 * Where an effect that reached the app goes: the component it is for (the props it is inside, from the outermost),
 * and either the bound value it changes (with the change's id) or the event it is
 * @typedef {Readonly<{ inside: readonly string[], change: Readonly<{ value: unknown, id: number }> }>
 *   | Readonly<{ inside: readonly string[], event: string, effect: Readonly<{ [field: string]: unknown }> }>} Routed
 */
/**
 * A framework's props as a record
 * @typedef {Readonly<{ [prop: string]: unknown }>} Props
 */
/**
 * The names a framework gives a bound value's props: the value's, and the one holding where the component's own value
 * starts (React's `value` and `defaultValue`; Vue's `modelValue` and `defaultValue`)
 * @typedef {Readonly<{ value: (prop: string) => string, initial: (prop: string) => string }>} Names
 */
/**
 * The values a component holds for bound values the app doesn't give: its own, and those of the components inside
 * @typedef {Readonly<{ value: unknown, inside: Readonly<{ [prop: string]: Held }> }>} Held
 */
/**
 * An element outside a component that its widget refers to, as an app gives it: its id (which a server draws), the
 * element, or what holds it (a React ref's `current`, a Vue ref's `value`, a function giving it)
 * @typedef {string | Element | Readonly<{ current: Element | null }> | Readonly<{ value: Element | null }>
 *   | (() => Element | null) | null | undefined} OutsideGiven
 */
/**
 * The ids of the elements outside a component given by id, by name, for its naming
 * @param {Readonly<{ [name: string]: OutsideGiven }> | undefined} given - The elements outside, by name
 * @returns {Readonly<{ [name: string]: string }> | undefined} Their ids, or none if none is given by id
 */
declare function outsideIds(given: Readonly<{
    [name: string]: OutsideGiven;
}> | undefined): Readonly<{
    [name: string]: string;
}> | undefined;
/**
 * An element outside a component given as an element, or by what holds it, as it is now
 * @param {Readonly<{ [name: string]: unknown }> | undefined} given - The elements outside, by name
 * @param {string} name - Which
 * @returns {Element | null} The element, or `null` for one given by id or not at all
 */
declare function outsideElement(given: Readonly<{
    [name: string]: unknown;
}> | undefined, name: string): Element | null;
export type HostGiven = Readonly<{
    itemName?: ((key: Key) => string) | undefined;
    naming?: Naming | undefined;
    sources?: Readonly<{
        [name: string]: Source;
    }> | undefined;
    translate?: ((input: Readonly<{
        [field: string]: unknown;
    }>) => Readonly<{
        [field: string]: unknown;
    }> | null) | undefined;
    words?: Words | undefined;
    outside?: Readonly<{
        [name: string]: OutsideGiven;
    }> | undefined;
}>;
/**
 * What a component takes beside its widget's props, in every framework: how an item is named in announcements (by
 * default its text, for items given), how ids are made, the sources the widget asks about, the words announcements
 * use, key rebinding, and the elements outside it the widget refers to, by the names it gives them
 * @typedef {Readonly<{
 *   itemName?: ((key: Key) => string) | undefined,
 *   naming?: Naming | undefined,
 *   sources?: Readonly<{ [name: string]: Source }> | undefined,
 *   translate?: ((input: Readonly<{ [field: string]: unknown }>) => Readonly<{ [field: string]: unknown }> | null) | undefined,
 *   words?: Words | undefined,
 *   outside?: Readonly<{ [name: string]: OutsideGiven }> | undefined,
 * }>} HostGiven
 */
/**
 * The page's options from a component's host props: its naming (the app's, or the framework's) with the ids of the
 * elements outside given by id, the elements outside given otherwise as they are when the page looks, the app's
 * sources and those made from items given, and the rest as given
 * @param {HostGiven} props - The component's props
 * @param {Naming} framework - The naming the framework makes, from its ids
 * @param {() => HostGiven} latest - The component's props as they are now
 * @param {Readonly<{ [name: string]: Source }>} made - The sources made from items given
 * @returns {Omit<PageOptions, 'widget' | 'props' | 'effect'> & Readonly<{ naming: Naming }>} The options
 */
declare function hostOptions(props: HostGiven, framework: Naming, latest: () => HostGiven, made?: Readonly<{
    [name: string]: Source;
}>): Omit<PageOptions, 'widget' | 'props' | 'effect'> & Readonly<{
    naming: Naming;
}>;
export type Item = Key | Readonly<{
    key: Key;
    text: string;
}>;
export type Sourced<P, S extends string> = Omit<P, S> & {
    readonly [K in S & keyof P]?: P[K];
} & {
    readonly [K in S as K extends 'source' ? 'items' : `${K}Items`]?: readonly Item[];
};
/**
 * An item given to a component in place of a source: its key, its key and text, or text that is its key
 * @typedef {Key | Readonly<{ key: Key, text: string }>} Item
 */
/**
 * A component's props `P` with each prop in `S` naming a collection made optional, and a prop taking the collection's
 * items in its place (`items` for `source`)
 * @template P
 * @template {string} S
 * @typedef {Omit<P, S> & { readonly [K in S & keyof P]?: P[K] } & {
 *   readonly [K in S as K extends 'source' ? 'items' : `${K}Items`]?: readonly Item[]
 * }} Sourced
 */
/**
 * The prop a component takes the items of a collection by, for the widget prop naming it
 * @param {string} prop - The widget's prop (`source`)
 * @returns {string} The component's prop (`items`)
 */
declare function itemsProp(prop: string): string;
/**
 * The sources a component makes from the items it is given in place of a collection's name, one per prop for its life:
 * `read` gives its props with each such prop naming the source made for it, and those sources; the items given since
 * are put in each source by `apply`, which tells what asked about it, so a framework calls it once it has drawn
 * @returns {Readonly<{
 *   read: (description: Description, props: Props) => Readonly<{ props: Props, sources: Readonly<{ [name: string]: ReturnType<typeof arraySource> }> }>,
 *   apply: () => void,
 * }>} The sources
 */
declare function itemSources(): Readonly<{
    read: (description: Description, props: Props) => Readonly<{
        props: Props;
        sources: Readonly<{
            [name: string]: ReturnType<typeof arraySource>;
        }>;
    }>;
    apply: () => void;
}>;
/**
 * What a component's form field holds: its bound value as text, when it is a key (`null` for none chosen)
 * @param {Description} description - The component's widget
 * @param {Given} given - Its props, in the widget's names
 * @returns {string | null} The value, or `null` for a widget whose value is no key, or none
 */
declare function formValue(description: Description, given: Given): string | null;
/**
 * Whether a component takes part in a form: its bound value is a key
 * @param {Description} description - The component's widget
 * @returns {boolean} Whether it does
 */
declare function inForm(description: Description): boolean;
/**
 * The props given to a component, from the outermost one's
 * @param {Props} props - The outermost component's props
 * @param {readonly string[]} inside - The component, by the props it is inside
 * @returns {Props} Its props
 */
declare function propsAt(props: Props, inside: readonly string[]): Props;
/**
 * The values a component holds at first: each bound value where the props start it, or its empty value
 * @param {Description} description - The component's widget
 * @param {Props} props - Its props
 * @param {Names} names - The framework's names
 * @returns {Held} What it holds
 */
declare function heldFrom(description: Description, props: Props, names: Names): Held;
/**
 * Whether a component's bound value is its own: the app gives none
 * @param {Description} description - The component's widget
 * @param {Props} props - Its props
 * @param {Names} names - The framework's names
 * @returns {boolean} Whether it is
 */
declare function ownValue(description: Description, props: Props, names: Names): boolean;
/**
 * A component's props in the widget's names: its bound value the app's, or its own
 * @param {Description} description - The component's widget
 * @param {Props} props - Its props
 * @param {Held} held - What it holds
 * @param {Names} names - The framework's names
 * @returns {Given} Its props, in the widget's names
 */
declare function givenFrom(description: Description, props: Props, held: Held, names: Names): Given;
/**
 * What is held, with one component's value changed
 * @param {Held} held - What is held
 * @param {readonly string[]} inside - The component, by the props it is inside
 * @param {unknown} value - The value
 * @returns {Held} What is held after
 */
declare function holding(held: Held, inside: readonly string[], value: unknown): Held;
/**
 * The value held for a component
 * @param {Held} held - What is held
 * @param {readonly string[]} inside - The component, by the props it is inside
 * @returns {unknown} Its value
 */
declare function heldAt(held: Held, inside: readonly string[]): unknown;
/**
 * The widget's props, from a component's props in the widget's names
 * @param {Description} description - The component's widget
 * @param {Given} given - Its props
 * @returns {Readonly<{ [prop: string]: unknown }>} The widget's props
 */
declare function widgetProps(description: Description, given: Given): Readonly<{
    [prop: string]: unknown;
}>;
/**
 * Where an effect that reached the app goes, or `null` for one no component takes: a `change` from a widget with a
 * bound value changes it; any other effect of a type the widget names as its own is an event
 * @param {Description} description - The outermost component's widget
 * @param {Out} out - The effect, with where it came from
 * @returns {Routed | null} Where it goes
 */
declare function route(description: Description, out: Out): Routed | null;
/**
 * The description of the component a route goes to
 * @param {Description} description - The outermost component's widget
 * @param {readonly string[]} inside - The props it is inside
 * @returns {Description} Its widget
 */
declare function describedAt(description: Description, inside: readonly string[]): Description;
export { describedAt, formValue, givenFrom, heldAt, heldFrom, holding, hostOptions, inForm, itemSources, itemsProp, outsideElement, outsideIds, ownValue, propsAt, route, widgetProps, };
