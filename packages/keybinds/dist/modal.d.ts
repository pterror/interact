/**
 * Elements that take the keyboard while they're open: an element with `data-keybinds-modal` and `open` keeps
 * bindings from firing inside it. The palette, settings panel and menus mark themselves; a page's own dialogs can too.
 */
/**
 * Marks a component with its kind, so styles work whatever tag name it was registered under, and whether it takes
 * the keyboard while open
 * @param {HTMLElement} element - The component
 * @param {string} kind - Its kind ("command-palette")
 * @param {boolean} [modal] - Whether it takes the keyboard while open (default false)
 * @returns {void}
 */
declare function markKind(element: HTMLElement, kind: string, modal?: boolean): void;
/**
 * Whether an event's target is inside an element whose own keyboard handling takes over while it's open
 * @param {EventTarget | null} target - Where the event happened
 * @returns {boolean} Whether it is
 */
declare function overlayOpen(target: EventTarget | null): boolean;
/**
 * Whether any such element is open, for inputs whose events have no target (gamepads)
 * @returns {boolean} Whether one is
 */
declare function anyOverlayOpen(): boolean;
export { anyOverlayOpen, markKind, overlayOpen };
