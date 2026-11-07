/**
 * @import { Prepared } from './prepare.js'
 * @import { Entry, Handler, Key, Repeat, TemplateResult, Value } from './template.js'
 * @import { Child } from './values.js'
 */

import { CLOSE, CLOSE_MARKUP, ELEMENT, OPEN, OPEN_MARKUP, isMarker, matchingClose } from './markers.js'
import { prepare } from './prepare.js'
import { attributeText, childOf, handlerOf, spreadOf } from './values.js'

/**
 * Where a template can be rendered: an element, a shadow root or a fragment.
 * @typedef {Element | DocumentFragment} Container
 */

/**
 * A child hole's markers: the `OPEN` before its content and the `CLOSE` after.
 * @typedef {Readonly<{ open: Comment, close: Comment }>} Range
 */

/**
 * Some siblings: the first, and the one to stop before (undefined for the rest of their parent).
 * @typedef {Readonly<{ first: Node | null, end: Node | undefined }>} Span
 */

/**
 * What a template's markers point at, in document order.
 * @typedef {Readonly<{ elements: readonly Element[], children: readonly Range[] }>} Found
 */

/**
 * What one marker points at.
 * @typedef {Readonly<{ kind: 'element', element: Element }> | Readonly<{ kind: 'child', range: Range }>} Marked
 */

/**
 * Something rendered where a hole is, that takes the hole's next value.
 * @typedef {Readonly<{ set: (value: Value) => void }>} Part
 */

/**
 * One rendered item of a `repeat`: its key, its markers, and its template.
 * @typedef {Readonly<{ key: Key, range: Range, instance: TemplateInstance }>} Item
 */

/** @type {WeakMap<Prepared, HTMLTemplateElement>} */
const templates = new WeakMap()

/** @type {WeakMap<Container, ChildPart>} */
const roots = new WeakMap()

/**
 * The nodes from a range's `OPEN` to its `CLOSE`, both included.
 * @param {Range} range - The range
 * @returns {ChildNode[]} The nodes, in order
 */
function nodesOf(range) {
  /** @type {ChildNode[]} */
  const nodes = []
  /** @type {ChildNode | null} */
  let node = range.open
  while (node) {
    nodes.push(node)
    if (node === range.close) {
      return nodes
    }
    node = node.nextSibling
  }
  throw new Error('A range ends outside its parent')
}

/**
 * Removes what is between a range's markers, keeping the markers.
 * @param {Range} range - The range
 * @returns {void}
 */
function clearRange(range) {
  while (range.open.nextSibling && range.open.nextSibling !== range.close) {
    range.open.nextSibling.remove()
  }
}

/**
 * Removes a range, markers and all.
 * @param {Range} range - The range
 * @returns {void}
 */
function removeRange(range) {
  for (const node of nodesOf(range)) {
    node.remove()
  }
}

/**
 * Moves a range, markers and all, to just after a node.
 * @param {ChildNode} cursor - The node it goes after
 * @param {Range} range - The range
 * @returns {void}
 */
function moveAfter(cursor, range) {
  cursor.after(...nodesOf(range))
}

/**
 * What the markers among some siblings point at, and inside them, skipping the content of child holes.
 * @param {Span} span - The siblings
 * @yields {Marked} Each, in document order
 * @returns {Generator<Marked, void, undefined>} Each, in document order
 */
function* marked(span) {
  for (let node = span.first; node && node !== span.end; node = node.nextSibling) {
    if (isMarker(node, OPEN)) {
      const close = matchingClose(node)
      yield { kind: 'child', range: { close, open: node } }
      node = close
    } else if (isMarker(node, ELEMENT)) {
      if (!(node.nextSibling instanceof Element)) {
        throw new TypeError('An element marker is not followed by its element: the markup does not match the template')
      }
      yield { element: node.nextSibling, kind: 'element' }
    } else if (node instanceof Element) {
      yield* marked({ end: undefined, first: node.firstChild })
    }
  }
}

/**
 * The bound elements and child holes of one rendered template, found by its markers.
 * @param {Span} span - The template's nodes
 * @returns {Found} What its markers point at
 */
function collect(span) {
  const all = [...marked(span)]
  return {
    children: all.flatMap((each) => (each.kind === 'child' ? [each.range] : [])),
    elements: all.flatMap((each) => (each.kind === 'element' ? [each.element] : [])),
  }
}

/**
 * An attribute hole on an element.
 */
class AttributePart {
  /** @readonly */
  #element
  /** @readonly */
  #name
  /** @type {string | undefined} */
  #text

  /**
   * Starts from what the element has, so adopting server markup changes nothing that is already right.
   * @param {Element} element - The element
   * @param {string} name - The attribute
   */
  constructor(element, name) {
    this.#element = element
    this.#name = name
    this.#text = element.getAttribute(name) ?? undefined
  }

  /**
   * Sets or removes the attribute, when its text changes.
   * @param {Value} value - The hole's value
   * @returns {void}
   */
  set(value) {
    const text = attributeText(value, this.#name)
    if (text === this.#text) {
      return
    }
    this.#text = text
    if (text === undefined) {
      this.#element.removeAttribute(this.#name)
    } else {
      this.#element.setAttribute(this.#name, text)
    }
  }
}

/**
 * A hole standing alone in a tag: attributes by name, set as they change and taken off once no longer given. It never
 * touches an attribute it didn't set.
 */
class SpreadPart {
  /** @readonly */
  #element
  /** @type {ReadonlyMap<string, string>} */
  #texts = new Map()

  /** @param {Element} element - The element */
  constructor(element) {
    this.#element = element
  }

  /**
   * Sets the attributes given that differ from the element's, and takes off those given before and not now.
   * @param {Value} value - The hole's value
   * @returns {void}
   */
  set(value) {
    const texts = spreadOf(value)
    for (const name of this.#texts.keys()) {
      if (!texts.has(name)) {
        this.#element.removeAttribute(name)
      }
    }
    for (const [name, text] of texts) {
      if (this.#element.getAttribute(name) !== text) {
        this.#element.setAttribute(name, text)
      }
    }
    this.#texts = texts
  }
}

/**
 * A property hole on an element.
 */
class PropertyPart {
  /** @readonly */
  #element
  /** @readonly */
  #name
  #set = false
  /** @type {Value} */
  #value

  /**
   * @param {Element} element - The element
   * @param {string} name - The property, in its own case
   */
  constructor(element, name) {
    this.#element = element
    this.#name = name
  }

  /**
   * Sets the property, when the value differs from the last one set.
   * @param {Value} value - The hole's value
   * @returns {void}
   */
  set(value) {
    if (this.#set && Object.is(value, this.#value)) {
      return
    }
    this.#set = true
    this.#value = value
    Reflect.set(this.#element, this.#name, value)
  }
}

/**
 * An event hole on an element. It listens once, and calls whichever handler it holds now.
 */
class EventPart {
  /** @readonly */
  #name
  /** @type {Handler | undefined} */
  #handler

  /**
   * @param {Element} element - The element
   * @param {string} name - The event
   */
  constructor(element, name) {
    this.#name = name
    element.addEventListener(name, (event) => {
      this.#handler?.(event)
    })
  }

  /**
   * Holds a new handler, or none.
   * @param {Value} value - The hole's value
   * @returns {void}
   */
  set(value) {
    this.#handler = handlerOf(value, this.#name)
  }
}

/**
 * One rendered template: its parts, which take its next values.
 */
class TemplateInstance {
  /** @readonly */
  #parts

  /**
   * @param {TemplateStringsArray} strings - The template's static strings, which say whether a result is this template
   * @param {readonly Part[]} parts - One per hole
   */
  constructor(strings, parts) {
    /** @readonly */
    this.strings = strings
    this.#parts = parts
  }

  /**
   * Gives each part its value.
   * @param {readonly Value[]} values - One per hole
   * @returns {void}
   */
  update(values) {
    for (const [index, part] of this.#parts.entries()) {
      part.set(values[index])
    }
  }
}

/**
 * A child hole: whatever is between its markers is its content, and only it changes that content.
 */
class ChildPart {
  /** @readonly */
  #range
  #adopting
  /** @type {Child['kind']} */
  #kind = 'nothing'
  /** @type {Text | undefined} */
  #text
  /** @type {TemplateInstance | undefined} */
  #instance
  /** @type {Item[]} */
  #items = []

  /**
   * @param {Range} range - The hole's markers
   * @param {boolean} adopting - Whether what is between them is server markup to adopt on the first `set`
   */
  constructor(range, adopting) {
    this.#range = range
    this.#adopting = adopting
  }

  /**
   * Shows a value: text, a template, items by key, or nothing.
   * @param {Value} value - The hole's value
   * @returns {void}
   */
  set(value) {
    const child = childOf(value)
    if (this.#adopting) {
      this.#adopting = false
      this.#adopt(child)
    } else {
      this.#show(child)
    }
  }

  /**
   * Shows content, changing as little as it can.
   * @param {Child} child - The content
   * @returns {void}
   */
  #show(child) {
    if (child.kind === 'text') {
      this.#showText(child.text)
    } else if (child.kind === 'template') {
      this.#showTemplate(child)
    } else if (child.kind === 'repeat') {
      this.#showRepeat(child)
    } else {
      this.#clear()
    }
  }

  /**
   * Takes over server markup for content, keeping its nodes: a template's or a repeat's, or the server's text node when
   * the content is text and the server rendered one; anything else is rendered afresh.
   * @param {Child} child - The content, as the server should have rendered it
   * @returns {void}
   */
  #adopt(child) {
    const first = this.#range.open.nextSibling
    if (child.kind === 'template') {
      this.#instance = adoptInstance(child, this.#range)
      this.#kind = 'template'
    } else if (child.kind === 'repeat') {
      this.#items = adoptItems(child.entries, this.#range)
      this.#kind = 'repeat'
    } else if (child.kind === 'text' && first instanceof Text && first.nextSibling === this.#range.close) {
      this.#text = first
      this.#kind = 'text'
      this.#showText(child.text)
    } else {
      clearRange(this.#range)
      this.#show(child)
    }
  }

  /**
   * Removes the content.
   * @returns {void}
   */
  #clear() {
    clearRange(this.#range)
    this.#kind = 'nothing'
    this.#text = undefined
    this.#instance = undefined
    this.#items = []
  }

  /**
   * Shows text, in the text node already there if there is one.
   * @param {string} text - The text
   * @returns {void}
   */
  #showText(text) {
    if (this.#kind === 'text' && this.#text) {
      if (this.#text.data !== text) {
        this.#text.data = text
      }
      return
    }
    this.#clear()
    this.#text = this.#range.close.ownerDocument.createTextNode(text)
    this.#range.close.before(this.#text)
    this.#kind = 'text'
  }

  /**
   * Shows a template: updates the one there if it is the same template, else renders it afresh.
   * @param {TemplateResult} result - The template and its values
   * @returns {void}
   */
  #showTemplate(result) {
    if (this.#kind === 'template' && this.#instance?.strings === result.strings) {
      this.#instance.update(result.values)
      return
    }
    this.#clear()
    const { instance, nodes } = createInstance(result, this.#range.close.ownerDocument)
    this.#range.close.before(nodes)
    this.#instance = instance
    this.#kind = 'template'
  }

  /**
   * Shows items by key.
   * @param {Repeat} repeat - The items
   * @returns {void}
   */
  #showRepeat(repeat) {
    if (this.#kind !== 'repeat') {
      this.#clear()
    }
    this.#items = reconcile(this.#items, repeat.entries, this.#range)
    this.#kind = 'repeat'
  }
}

/**
 * The parts for every hole of a template, found by the markers among its nodes.
 * @param {Prepared} prepared - The template
 * @param {Span} span - Its nodes
 * @param {boolean} adopting - Whether they are server markup, which child holes adopt
 * @returns {Part[]} One part per hole
 */
function partsOf(prepared, span, adopting) {
  const found = collect(span)
  if (found.elements.length !== prepared.elements || found.children.length !== prepared.children) {
    throw new Error(
      `The markup has ${found.elements.length} bound elements and ${found.children.length} child holes where the ` +
        `template has ${prepared.elements} and ${prepared.children}: it was rendered from a different template`,
    )
  }
  return prepared.holes.map((hole) => {
    if (hole.kind === 'child') {
      const range = found.children[hole.child]
      if (!range) {
        throw new Error('A child hole has no markers')
      }
      return new ChildPart(range, adopting)
    }
    const element = found.elements[hole.element]
    if (!element) {
      throw new Error('A bound element has no marker')
    }
    if (hole.kind === 'attribute') {
      return new AttributePart(element, hole.name)
    }
    if (hole.kind === 'spread') {
      return new SpreadPart(element)
    }
    return hole.kind === 'property' ? new PropertyPart(element, hole.name) : new EventPart(element, hole.name)
  })
}

/**
 * Renders a template afresh, cloning the `<template>` made once for it: its markup with empty child holes, and no hole
 * attributes.
 * @param {TemplateResult} result - The template and its values
 * @param {Document} document - The document to render in
 * @returns {Readonly<{ instance: TemplateInstance, nodes: DocumentFragment }>} The instance, and its nodes to insert
 */
function createInstance(result, document) {
  const prepared = prepare(result.strings)
  let template = templates.get(prepared)
  if (!template) {
    template = document.createElement('template')
    template.innerHTML = prepared.pieces
      .map((piece, index) =>
        prepared.holes[index]?.kind === 'child' ? `${piece}${OPEN_MARKUP}${CLOSE_MARKUP}` : piece,
      )
      .join('')
    templates.set(prepared, template)
  }
  const nodes = document.importNode(template.content, true)
  const instance = new TemplateInstance(
    result.strings,
    partsOf(prepared, { end: undefined, first: nodes.firstChild }, false),
  )
  instance.update(result.values)
  return { instance, nodes }
}

/**
 * Adopts server markup for a template: its nodes stay, and its parts take over from them.
 * @param {TemplateResult} result - The template and its values
 * @param {Range} range - The markers around the markup
 * @returns {TemplateInstance} The instance
 */
function adoptInstance(result, range) {
  const span = { end: range.close, first: range.open.nextSibling }
  const instance = new TemplateInstance(result.strings, partsOf(prepare(result.strings), span, true))
  instance.update(result.values)
  return instance
}

/**
 * Fails if two entries share a key.
 * @param {readonly Entry[]} entries - The entries
 * @returns {void}
 */
function checkKeys(entries) {
  const keys = new Set(entries.map(({ key }) => key))
  if (keys.size !== entries.length) {
    throw new Error('Two items of a repeat have the same key')
  }
}

/**
 * Renders entries where items were, keeping each item whose key stays and moving it where it now belongs. An item
 * whose key stays but renders another template is rendered afresh.
 * @param {readonly Item[]} items - What is rendered now, in order
 * @param {readonly Entry[]} entries - What to render
 * @param {Range} range - The child hole they go in
 * @returns {Item[]} What is rendered then, in order
 */
function reconcile(items, entries, range) {
  checkKeys(entries)
  const keys = new Set(entries.map(({ key }) => key))
  // The items whose keys went are removed first, so items that stay in order are not moved
  /** @type {Map<Key, Item>} */
  const kept = new Map()
  for (const item of items) {
    if (keys.has(item.key)) {
      kept.set(item.key, item)
    } else {
      removeRange(item.range)
    }
  }
  const document = range.open.ownerDocument
  /** @type {ChildNode} */
  let cursor = range.open
  return entries.map((entry) => {
    let item = kept.get(entry.key)
    if (item !== undefined && item.instance.strings !== entry.result.strings) {
      removeRange(item.range)
      item = undefined
    }
    if (item === undefined) {
      const fresh = { close: document.createComment(CLOSE), open: document.createComment(OPEN) }
      const { instance, nodes } = createInstance(entry.result, document)
      document.createDocumentFragment().append(fresh.open, nodes, fresh.close)
      item = { instance, key: entry.key, range: fresh }
    } else {
      item.instance.update(entry.result.values)
    }
    if (cursor.nextSibling !== item.range.open) {
      moveAfter(cursor, item.range)
    }
    cursor = item.range.close
    return item
  })
}

/**
 * The item ranges of server markup for a `repeat`, in order.
 * @param {Range} range - The child hole
 * @returns {Range[]} One per item rendered on the server
 */
function serverItems(range) {
  /** @type {Range[]} */
  const found = []
  for (let node = range.open.nextSibling; node && node !== range.close; node = node.nextSibling) {
    if (!isMarker(node, OPEN)) {
      throw new Error('Server markup for a repeat has something between its items: it was rendered differently')
    }
    const close = matchingClose(node)
    found.push({ close, open: node })
    node = close
  }
  return found
}

/**
 * Adopts server markup for a `repeat`: the server's items are paired with the entries in order, then whatever differs
 * is reconciled as on any update.
 * @param {readonly Entry[]} entries - What to render
 * @param {Range} range - The child hole the server rendered them in
 * @returns {Item[]} What is rendered then, in order
 */
function adoptItems(entries, range) {
  checkKeys(entries)
  /** @type {Item[]} */
  const items = []
  for (const [index, server] of serverItems(range).entries()) {
    const entry = entries[index]
    if (entry) {
      items.push({ instance: adoptInstance(entry.result, server), key: entry.key, range: server })
    } else {
      removeRange(server)
    }
  }
  return reconcile(items, entries, range)
}

/**
 * Renders a template into a container, after anything already in it. Rendering into the same container again updates
 * what is there.
 * @param {TemplateResult} result - The template and its values
 * @param {Container} container - Where it goes
 * @returns {void}
 */
function render(result, container) {
  let root = roots.get(container)
  if (!root) {
    const document = container.ownerDocument
    const range = { close: document.createComment(CLOSE), open: document.createComment(OPEN) }
    container.append(range.open, range.close)
    root = new ChildPart(range, false)
    roots.set(container, root)
  }
  root.set(result)
}

/**
 * Adopts server markup in a container (from `renderToString`) for a template: its nodes stay, and later `render`
 * calls update them. Throws if the markup isn't there, or was rendered from a different template.
 * @param {TemplateResult} result - The template and its values, as the server rendered them
 * @param {Container} container - Where the server markup is
 * @returns {void}
 */
function hydrate(result, container) {
  const open = [...container.childNodes].find((node) => isMarker(node, OPEN))
  if (!(open instanceof Comment)) {
    throw new TypeError('There is no server markup to hydrate here')
  }
  const root = new ChildPart({ close: matchingClose(open), open }, true)
  roots.set(container, root)
  root.set(result)
}

/**
 * Whether a container holds server markup that `hydrate` can adopt.
 * @param {Container} container - The container
 * @returns {boolean} Whether it does
 */
function hasServerMarkup(container) {
  return !roots.has(container) && [...container.childNodes].some((node) => isMarker(node, OPEN))
}

export {
  AttributePart,
  ChildPart,
  EventPart,
  PropertyPart,
  SpreadPart,
  adoptInstance,
  clearRange,
  collect,
  createInstance,
  hasServerMarkup,
  hydrate,
  moveAfter,
  reconcile,
  removeRange,
  render,
}
