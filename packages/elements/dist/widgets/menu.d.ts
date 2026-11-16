/**
 * A menu button: the WAI-ARIA menu button with a menu (https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/),
 * focus moved to each item in turn. Items are few and the app's, so they come in the props with their text,
 * which typeahead reads. Choosing an item emits `activate`; disabled items are moved to but not chosen.
 */
declare const MenuElement: typeof import("../element.js").InteractElement;
export { MenuElement };
