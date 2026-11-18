/**
 * Draws any widget's view into the DOM, generically: each part is an element (a `button` for a button, else a `div`,
 * or the element the app makes for it), given its meaning and listeners by `page`, and drawn again, in place, on each
 * change.
 */
import type { Target } from './compose.js';
import type { Key } from './contract.js';
import type { Host } from './host.js';
import type { PageOptions } from './web.js';
export type Made = Readonly<{
    element: Element;
    slot: Element;
}>;
export type DomOptions = PageOptions & Readonly<{
    container: Element | ShadowRoot;
    exposeParts?: boolean;
    slotText?: boolean;
    item?: (key: Key) => string | globalThis.Node;
    parts?: Readonly<{
        [name: string]: (target: Target) => Made;
    }>;
}>;
/**
 * Draws a widget into an element, and runs it
 * @param {DomOptions} options - Where, the widget and its props, how the host names and draws items and words
 *   announcements, what carries out the app's effects, and any parts the app makes itself
 * @returns {Readonly<{ host: Host, stop: () => void }>} The running widget, and stopping it
 */
declare function renderDom(options: DomOptions): Readonly<{
    host: Host;
    stop: () => void;
}>;
export { renderDom };
