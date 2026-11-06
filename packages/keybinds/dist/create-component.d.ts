/**
 * Making a component from its class (KeybindCheatsheet, KeybindSettings, ...).
 *
 * A custom element name stays bound to the first class defined for it, so a second copy of the library on the same
 * page (a script loaded again after a deploy, two bundles) can't use the other copy's elements. Each copy gets its own
 * name: `keybinds-<kind>` when that's free or already this copy's, otherwise `keybinds-<kind>-2`, `-3`, ... Styles
 * select components by their `data-keybinds` kind, so the name doesn't matter to them.
 */
export type ComponentClass = CustomElementConstructor & Readonly<{
    kind: string;
}>;
/**
 * Makes a component from its class, registering the class the first time
 * @template {HTMLElement} E
 * @param {(new () => E) & ComponentClass} component - The class
 * @returns {E} A new element of that class
 * @throws {TypeError} If the name it's registered under makes something else
 */
declare function createComponent<E extends HTMLElement>(component: (new () => E) & ComponentClass): E;
export { createComponent };
