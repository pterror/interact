/**
 * A modal dialog around a content widget: the WAI-ARIA modal dialog
 * (https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/). `open` is always the app's, by the contract's rule:
 * Escape (one the content didn't take, heard as it bubbles from the content) and the close button close it at
 * once, pending, and emit `change` with `false`; the props confirm it, or `refused` opens it again. Opening
 * focuses the part the app names. Keeping focus inside while open, and giving it back on close, is what
 * `aria-modal` asks of the host.
 */
declare const DialogElement: typeof import("../element.js").InteractElement;
export { DialogElement };
