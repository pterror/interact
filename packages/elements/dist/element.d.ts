/**
 * What every generated custom element runs on: a widget described for an element, drawn by the core's DOM renderer
 * into the element's shadow root. Each part's element names itself and the states it shows in its `part` attribute
 * (`::part(option selected)`), a part holding the widget's text holds it in a slot named after the part, and the element
 * carries the states of the parts drawn once as custom states (`:state(expanded)`). Each prop is a property, and an
 * attribute (in kebab case) where an attribute can hold it; the bound value is the `value` (or `open`, ...) property
 * and attribute, and a change of it is a cancelable `change` event (cancelling it refuses the change). The widget's
 * other own effects are events of their type. An element made by a factory (the dialog) takes the element inside it as
 * the widget it is around, and that element's props and value as the inner widget's.
 */
import type { Description } from '@pterror/interact-core';
export type Kind = 'string' | 'number' | 'boolean' | 'other';
export type Info = Readonly<{
    description: Description | null;
    factory: ((inside: Description, ...params: readonly (readonly string[])[]) => Description) | null;
    params: readonly string[];
    kinds: Readonly<{
        [prop: string]: Kind;
    }>;
}>;
/**
 * An element running one of interact's widgets
 */
declare class InteractElement extends HTMLElement {
    #private;
    /** @type {Info} */
    static info: Info;
    /** Labelable, its `<label>`s the widget's visible label, and a field of its form */
    static formAssociated: boolean;
    /**
     * The attributes it hears: its widget's props an attribute can hold, its factory's parameters
     * @returns {string[]} Their names
     */
    static get observedAttributes(): string[];
    /**
     * Its info
     * @returns {Info} What its class was defined with
     */
    get info(): Info;
    /**
     * A prop's value
     * @param {string} name - The prop
     * @returns {unknown} Its value
     */
    read(name: string): unknown;
    /**
     * Sets a prop
     * @param {string} name - The prop
     * @param {unknown} value - Its value
     * @returns {void}
     */
    write(name: string, value: unknown): void;
    /**
     * Its props in its widget's names, and those of the element inside, if it is a factory's
     * @returns {Readonly<{ [prop: string]: unknown }>} The props
     */
    given(): Readonly<{
        [prop: string]: unknown;
    }>;
    /**
     * Gives the widget its props again
     * @returns {void}
     */
    refresh(): void;
    /**
     * @param {string} name - The attribute
     * @returns {void}
     */
    attributeChangedCallback(name: string): void;
    /** @returns {void} */
    connectedCallback(): void;
    /** @returns {void} */
    disconnectedCallback(): void;
}
/**
 * Defines an element class for a widget; registering its tag is the app's (`register`)
 * @param {Info} info - The widget, and how its props are attributes
 * @returns {typeof InteractElement} The class
 */
declare function define(info: Info): typeof InteractElement;
export { define, InteractElement };
