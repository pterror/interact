/**
 * Elements that take the keyboard while they're open, so bindings don't fire inside them: an open `<dialog>`, an open
 * popover (a menu, a palette, a combobox's list, whoever made it), or any element with `data-keybinds-modal` and
 * `open`, which a page's own overlays can carry. They're found along an event's composed path, inside shadow roots
 * too.
 */
/**
 * Marks a component with its kind, so styles work whatever tag name it was registered under, and whether it takes
 * the keyboard while open
 * @param {HTMLElement} element - The component
 * @param {string} kind - Its kind ("cheatsheet")
 * @param {boolean} [modal] - Whether it takes the keyboard while open (default false)
 * @returns {void}
 */
declare function markKind(element: HTMLElement, kind: string, modal?: boolean): void;
/**
 * Whether an event happened inside an element whose own keyboard handling takes over while it's open
 * @param {Event} event - The event
 * @returns {boolean} Whether it did
 */
declare function overlayOpen(event: Event): boolean;
/**
 * Whether such an element is open in the page, or holds focus, for inputs whose events have no target (gamepads)
 * @returns {boolean} Whether one is
 */
declare function anyOverlayOpen(): boolean;
export { anyOverlayOpen, markKind, overlayOpen };
