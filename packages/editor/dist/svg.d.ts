/**
 * Elements drawn inside an `<svg>` are SVG elements, as an HTML parser makes them: in the SVG namespace, with the
 * mixed-case element and attribute names SVG uses, which an HTML grammar hands over lowercased. The adjustments are
 * the HTML standard's (13.2.6.5, "adjust SVG attributes" and the SVG tag name table).
 */
/**
 * Sets an attribute by the name an HTML grammar gives it
 * @param {Element} element - The element
 * @param {string} name - The attribute's name
 * @param {string} value - Its value
 * @returns {void}
 */
declare function setAttribute(element: Element, name: string, value: string): void;
/**
 * An element made for where it goes: an SVG element inside an `<svg>`, and the `<svg>` itself
 * @param {Document} document - The document
 * @param {string} name - The element's name
 * @param {Node | DocumentFragment} parent - Where it goes
 * @returns {Element} The element
 */
declare function createElementIn(document: Document, name: string, parent: Node | DocumentFragment): Element;
/**
 * An element drawn on its own made over for where it goes, its children with it
 * @param {Element} made - The element
 * @param {Node | DocumentFragment} parent - Where it goes
 * @returns {Element} The element, or one made over in the SVG namespace
 */
declare function adoptedInto(made: Element, parent: Node | DocumentFragment): Element;
export { adoptedInto, createElementIn, setAttribute };
