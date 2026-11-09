/**
 * The overlay rule: an open element that takes the keyboard (an open `<dialog>`, an open popover, or any element with
 * `data-keybinds-modal` and `open`) keeps events inside it from listeners outside it. It is found along the event's
 * composed path, inside shadow roots too. A listener on such an element, or inside it, is its own keyboard handling,
 * and hears them: a menu level's keys, bound on the level.
 */
/**
 * Whether events are kept from a listener by an overlay they happened in
 * @param {EventTarget} listener - Where the listener listens
 * @returns {(event: Event) => boolean} Whether an open overlay lies between an event's target and the listener
 */
declare function outsideOverlay(listener: EventTarget): (event: Event) => boolean;
/**
 * The overlay rule for input that has no event target of its own (gamepads, axes), judged by where focus is
 * @param {EventTarget} listener - Where the listener listens
 * @returns {() => boolean} Whether an open overlay lies between the focused element and the listener
 */
declare function focusInOverlay(listener: EventTarget): () => boolean;
export { focusInOverlay, outsideOverlay };
