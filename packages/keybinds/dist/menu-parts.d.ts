/**
 * The context menus' markup: a backdrop that closes the menu, and the menu holding its list, with a search field above
 * it in the scored menu.
 */
export type MenuParts = Readonly<{
    backdrop: HTMLDivElement;
    box: HTMLDivElement;
    list: HTMLUListElement;
}>;
/**
 * A menu's parts: the backdrop, the box holding its list, and the list
 * @typedef {Readonly<{ backdrop: HTMLDivElement, box: HTMLDivElement, list: HTMLUListElement }>} MenuParts
 */
/**
 * The search field above the scored menu's list, which takes what's typed as it is: no autocomplete or spellcheck
 * @returns {HTMLInputElement} The field
 */
declare function menuSearch(): HTMLInputElement;
/**
 * Builds a menu's shadow DOM: its styles, a backdrop, and the box holding the list, after anything given to go first
 * @param {ShadowRoot} shadow - The menu's shadow root
 * @param {readonly HTMLElement[]} [above] - What goes in the box above the list
 * @returns {MenuParts} The parts it listens to and places
 */
declare function menuMarkup(shadow: ShadowRoot, above?: readonly HTMLElement[]): MenuParts;
/**
 * Makes clicking or right-clicking the backdrop close the menu
 * @param {HTMLDivElement} backdrop - The backdrop
 * @param {() => void} close - Closes the menu
 * @returns {void}
 */
declare function closeOnBackdrop(backdrop: HTMLDivElement, close: () => void): void;
/**
 * Focuses the search field, or on a touch screen the list: focusing the field there would bring up the on-screen
 * keyboard over the menu
 * @param {HTMLInputElement} search - The search field
 * @param {HTMLUListElement} list - The list
 * @returns {void}
 */
declare function focusOnOpen(search: HTMLInputElement, list: HTMLUListElement): void;
export { closeOnBackdrop, focusOnOpen, menuMarkup, menuSearch };
