/**
 * Building a component's shadow DOM: elements made with their class, part and text, so each is held as the element it
 * is rather than looked up again, and the styles every overlay shares.
 */
export type Made = Readonly<{
    className: string;
    part?: string;
    text?: string;
}>;
/**
 * What an element is made with
 * @typedef {Readonly<{ className: string, part?: string, text?: string }>} Made
 */
/**
 * How every overlay shows: hidden until it's open
 */
declare const OVERLAY_STYLE = "@layer keybinds.structure {\n  :host { display: none; }\n  :host(:where([open])) { display: block; }\n  :where(*) { box-sizing: border-box; }\n}";
/**
 * An HTML element with its class, and its part name and text if given
 * @template {keyof HTMLElementTagNameMap} K
 * @param {K} tag - Which element
 * @param {Made} made - Its class, part name (for ::part()) and text
 * @returns {HTMLElementTagNameMap[K]} The element
 */
declare function make<K extends keyof HTMLElementTagNameMap>(tag: K, { className, part, text }: Made): HTMLElementTagNameMap[K];
/**
 * A `<style>` element holding a stylesheet
 * @param {string} css - The stylesheet
 * @returns {HTMLStyleElement} The element
 */
declare function styleOf(css: string): HTMLStyleElement;
/**
 * A space-separated list of names, those whose condition holds
 * @param {Readonly<Record<string, boolean>>} names - Each name, and whether it's in the list
 * @returns {string} The names that are
 */
declare function namesOf(names: Readonly<Record<string, boolean>>): string;
export { OVERLAY_STYLE, make, namesOf, styleOf };
