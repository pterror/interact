/**
 * What a part means, in the DOM's words, and DOM events as the contract's inputs: shared by the DOM and Solid
 * renderers. ARIA states become `aria-*` attributes as they are (a reference becomes the referenced part's id), `data`
 * becomes `data-*`, and `tabindex` and `hidden` are HTML's. Events pass through by name and value: an event goes to
 * the innermost part listening for it, and a pointer event to the part under the pointer, the pressed element
 * capturing the pointer so its release is never missed. `aria-modal` is carried out here: while a modal part is shown,
 * everything outside it is inert, the document doesn't scroll, and focus goes back where it was when it closes. A
 * popup is a manual popover, in the top layer while it is shown (the widget closes it, never the browser), placed
 * against its anchor by CSS anchor positioning: below it, starting where it starts, flipped to the other side across,
 * along or both when it doesn't fit, the popup's margin the gap on the side it grows towards. A press outside the popup
 * shown last (on the page around it, inert or not) is heard by it, if it listens for it.
 */
import type { Node, Target } from './compose.js';
import type { Key } from './contract.js';
import type { Host, HostOptions, Source } from './host.js';
import type { Words } from './words.js';
export type Naming = Readonly<{
    outside?: Readonly<{
        [name: string]: string;
    }>;
}> & (Readonly<{
    idOf: (target: Target) => string;
}> | Readonly<{
    id: string;
    keyId: (key: Key) => string;
}>);
/** @import { Node, Out, Target } from './compose.js' */
/** @import { Key } from './contract.js' */
/** @import { Host, HostOptions, Source } from './host.js' */
/** @import { Words } from './words.js' */
/**
 * How a host names things in the DOM: the prefix of every id, a key as text for ids, and optionally the ids of the
 * elements outside the widget it refers to, by the names it gives them
 * The app can supply the complete resolver, or use the prefix-and-key convenience form. Part attributes, ARIA
 * references and DOM lookups all use this same naming. Neither form determines a part's internal identity.
 * @typedef {Readonly<{ outside?: Readonly<{ [name: string]: string }> }> & (
 *   Readonly<{ idOf: (target: Target) => string }>
 *   | Readonly<{ id: string, keyId: (key: Key) => string }>
 * )} Naming
 */
/**
 * A part's id in the document
 * @param {Target} target - The part
 * @param {Naming} naming - The host's naming
 * @returns {string} The id
 */
declare function idOf(target: Target, naming: Naming): string;
/**
 * The attributes a part has in the DOM, `null` for one it doesn't have. Pure, so a server renders them as the client
 * does
 * @param {Node} node - The part
 * @param {Naming} naming - The host's naming
 * @param {string | null} implicitRole - The role the element has without one (a `button`'s), left out
 * @returns {ReadonlyMap<string, string | null>} Each attribute and its value
 */
declare function attributesOf(node: Node, naming: Naming, implicitRole: string | null): ReadonlyMap<string, string | null>;
/**
 * The element a part is drawn as, when the app gives none: a `button` for a button (its activation, Enter and Space
 * clicking it, is HTML's), else a `div`
 * @param {string | null} role - The part's role
 * @returns {Readonly<{ tag: string, implicitRole: string | null }>} The tag, and the role it has without one
 */
declare function elementFor(role: string | null): Readonly<{
    tag: string;
    implicitRole: string | null;
}>;
/**
 * The part's name as the app names it to replace or style it: its own name (`trigger`, `option`), and for a child's
 * root, the child's name (`list`); the outermost root is `root`
 * @param {Target} target - The part
 * @returns {string} The name
 */
declare function partName(target: Target): string;
/**
 * An item's text in the collection it is from, as a host draws and names it when the app draws it no other way: the
 * source's text for it, or the key as text
 * @param {Readonly<{ item: Key, source: string }>} content - The item, and its collection
 * @param {Readonly<{ [name: string]: Source }> | undefined} sources - The collections the host holds
 * @returns {string} Its text
 */
declare function itemText(content: Readonly<{
    item: Key;
    source: string;
}>, sources: Readonly<{
    [name: string]: Source;
}> | undefined): string;
/**
 * The ARIA attributes that are states (https://www.w3.org/TR/wai-aria-1.2/#state_prop_def), by the names views give
 * them
 */
declare const ARIA_STATES: string[];
/**
 * The states a part shows now: each ARIA state it has as `true`, and each of its `data` fields set, by name
 * @param {Node} node - The part
 * @returns {string[]} Their names
 */
declare function statesOf(node: Node): string[];
export type PageOptions = HostOptions & Readonly<{
    naming?: Naming;
    words?: Words;
    name?: (key: Key) => string;
    outside?: (name: string) => Element | null;
}>;
export type Page = Readonly<{
    host: Host;
    naming: Naming;
    bind: (key: string, element: Element, node: Node) => void;
    listen: (key: string, element: Element, node: Node) => void;
    drawn: (tree: Node, within: Element) => void;
    unbind: (key: string) => void;
    stop: () => void;
}>;
/**
 * A widget running in a page: `bind` gives an element a part's meaning and listeners (again on each change);
 * `listen` gives it only the listeners, and the modality, for a renderer that draws the attributes itself (from
 * `attributesOf`, as a server does); `drawn` listens on every part of a tree such a renderer has drawn, each found by
 * its id in the document or shadow root `within` is in (none while `within` is in neither), lets go of the parts it
 * drew before and no longer does, and then focuses or reveals what the widget asked to since: a renderer calling it
 * draws a change after the host tells it, so those made with a change wait for it to be drawn; `unbind` lets go of a part no longer drawn. Making a page
 * touches no DOM; once stopped, it listens on nothing more
 * @typedef {Readonly<{
 *   host: Host,
 *   naming: Naming,
 *   bind: (key: string, element: Element, node: Node) => void,
 *   listen: (key: string, element: Element, node: Node) => void,
 *   drawn: (tree: Node, within: Element) => void,
 *   unbind: (key: string) => void,
 *   stop: () => void,
 * }>} Page
 */
/**
 * Runs a widget in a page
 * @param {PageOptions} options - The widget and how the app takes part
 * @param {() => Element | null} live - The live region announcements are said in, which the renderer draws (none
 *   until it has)
 * @returns {Page} The running widget, for a renderer to draw
 */
declare function page(options: PageOptions, live: () => Element | null): Page;
export { identity } from './target.js';
export { ARIA_STATES, attributesOf, elementFor, idOf, itemText, page, partName, statesOf };
