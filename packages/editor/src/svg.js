/**
 * Elements drawn inside an `<svg>` are SVG elements, as an HTML parser makes them: in the SVG namespace, with the
 * mixed-case element and attribute names SVG uses, which an HTML grammar hands over lowercased. The adjustments are
 * the HTML standard's (13.2.6.5, "adjust SVG attributes" and the SVG tag name table).
 */

const SVG = 'http://www.w3.org/2000/svg'
const XLINK = 'http://www.w3.org/1999/xlink'
const XML = 'http://www.w3.org/XML/1998/namespace'

const NAMES = new Map(
  [
    'altGlyph',
    'altGlyphDef',
    'altGlyphItem',
    'animateColor',
    'animateMotion',
    'animateTransform',
    'clipPath',
    'feBlend',
    'feColorMatrix',
    'feComponentTransfer',
    'feComposite',
    'feConvolveMatrix',
    'feDiffuseLighting',
    'feDisplacementMap',
    'feDistantLight',
    'feDropShadow',
    'feFlood',
    'feFuncA',
    'feFuncB',
    'feFuncG',
    'feFuncR',
    'feGaussianBlur',
    'feImage',
    'feMerge',
    'feMergeNode',
    'feMorphology',
    'feOffset',
    'fePointLight',
    'feSpecularLighting',
    'feSpotLight',
    'feTile',
    'feTurbulence',
    'foreignObject',
    'glyphRef',
    'linearGradient',
    'radialGradient',
    'textPath',
  ].map((name) => [name.toLowerCase(), name]),
)

const ATTRIBUTES = new Map(
  [
    'attributeName',
    'attributeType',
    'baseFrequency',
    'baseProfile',
    'calcMode',
    'clipPathUnits',
    'diffuseConstant',
    'edgeMode',
    'filterUnits',
    'glyphRef',
    'gradientTransform',
    'gradientUnits',
    'kernelMatrix',
    'kernelUnitLength',
    'keyPoints',
    'keySplines',
    'keyTimes',
    'lengthAdjust',
    'limitingConeAngle',
    'markerHeight',
    'markerUnits',
    'markerWidth',
    'maskContentUnits',
    'maskUnits',
    'numOctaves',
    'pathLength',
    'patternContentUnits',
    'patternTransform',
    'patternUnits',
    'pointsAtX',
    'pointsAtY',
    'pointsAtZ',
    'preserveAlpha',
    'preserveAspectRatio',
    'primitiveUnits',
    'refX',
    'refY',
    'repeatCount',
    'repeatDur',
    'requiredExtensions',
    'requiredFeatures',
    'specularConstant',
    'specularExponent',
    'spreadMethod',
    'startOffset',
    'stdDeviation',
    'stitchTiles',
    'surfaceScale',
    'systemLanguage',
    'tableValues',
    'targetX',
    'targetY',
    'textLength',
    'viewBox',
    'viewTarget',
    'xChannelSelector',
    'yChannelSelector',
    'zoomAndPan',
  ].map((name) => [name.toLowerCase(), name]),
)

/**
 * @param {Node | DocumentFragment} node - A node
 * @returns {node is Element} Whether it is an element
 */
function isElement(node) {
  return node.nodeType === 1
}

/**
 * Whether an element's children are SVG elements
 * @param {Node | DocumentFragment} parent - Where they go
 * @returns {boolean} Whether it is an SVG element other than a `<foreignObject>`
 */
function inSvg(parent) {
  return isElement(parent) && parent.namespaceURI === SVG && parent.localName !== 'foreignObject'
}

/**
 * Sets an attribute by the name an HTML grammar gives it
 * @param {Element} element - The element
 * @param {string} name - The attribute's name
 * @param {string} value - Its value
 * @returns {void}
 */
function setAttribute(element, name, value) {
  if (element.namespaceURI !== SVG) {
    element.setAttribute(name, value)
    return
  }
  if (name.startsWith('xlink:')) {
    element.setAttributeNS(XLINK, name, value)
  } else if (name.startsWith('xml:')) {
    element.setAttributeNS(XML, name, value)
  } else {
    element.setAttribute(ATTRIBUTES.get(name) ?? name, value)
  }
}

/**
 * An element made for where it goes: an SVG element inside an `<svg>`, and the `<svg>` itself
 * @param {Document} document - The document
 * @param {string} name - The element's name
 * @param {Node | DocumentFragment} parent - Where it goes
 * @returns {Element} The element
 */
function createElementIn(document, name, parent) {
  return name !== 'svg' && !inSvg(parent)
    ? document.createElement(name)
    : document.createElementNS(SVG, NAMES.get(name) ?? name)
}

/**
 * An element drawn on its own made over for where it goes, its children with it
 * @param {Element} made - The element
 * @param {Node | DocumentFragment} parent - Where it goes
 * @returns {Element} The element, or one made over in the SVG namespace
 */
function adoptedInto(made, parent) {
  if ((made.localName !== 'svg' && !inSvg(parent)) || made.namespaceURI === SVG) {
    return made
  }
  const adopted = createElementIn(made.ownerDocument, made.localName, parent)
  for (const attribute of made.attributes) {
    setAttribute(adopted, attribute.name, attribute.value)
  }
  for (let child = made.firstChild; child !== null; child = made.firstChild) {
    adopted.append(isElement(child) ? adoptedInto(child, adopted) : child)
  }
  return adopted
}

export { adoptedInto, createElementIn, setAttribute }
