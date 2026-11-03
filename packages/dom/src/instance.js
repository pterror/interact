/**
 * @import { Range, Span } from './collect.js'
 * @import { Hole, Prepared } from './prepare.js'
 * @import { TemplateResult, Value } from './template.js'
 */

import { AttributePart } from './attribute-part.js'
import { collect } from './collect.js'
import { EventPart } from './event-part.js'
import { CLOSE_MARKUP, OPEN_MARKUP } from './markers.js'
import { prepare } from './prepare.js'
import { PropertyPart } from './property-part.js'

/**
 * Something rendered where a hole is, that takes the hole's next value.
 * @typedef {Readonly<{ set: (value: Value) => void }>} Part
 */

/**
 * Makes the part for a child hole, between its markers. `adopting`: its content is server markup to adopt.
 * @typedef {(range: Range, adopting: boolean) => Part} ChildParts
 */

/** @type {WeakMap<Prepared, HTMLTemplateElement>} */
const templates = new WeakMap()

/**
 * A prepared template's markup for the DOM: empty child holes, and no hole attributes.
 * @param {Prepared} prepared - The template
 * @returns {string} The markup
 */
function domMarkup(prepared) {
  return prepared.pieces
    .map((piece, index) => {
      const hole = prepared.holes[index]
      return hole?.kind === 'child' ? `${piece}${OPEN_MARKUP}${CLOSE_MARKUP}` : piece
    })
    .join('')
}

/**
 * The `<template>` a prepared template's instances are cloned from, made once.
 * @param {Prepared} prepared - The template
 * @param {Document} document - The document to make it in
 * @returns {HTMLTemplateElement} The template element
 */
function templateFor(prepared, document) {
  const known = templates.get(prepared)
  if (known) {
    return known
  }
  const template = document.createElement('template')
  template.innerHTML = domMarkup(prepared)
  templates.set(prepared, template)
  return template
}

/**
 * The part for one element hole.
 * @param {Exclude<Hole, { kind: 'child' }>} hole - The hole
 * @param {Element} element - The element it is on
 * @returns {Part} The part
 */
function elementPart(hole, element) {
  if (hole.kind === 'attribute') {
    return new AttributePart(element, hole.name)
  }
  return hole.kind === 'property' ? new PropertyPart(element, hole.name) : new EventPart(element, hole.name)
}

/**
 * How to make the parts of a template: what makes child parts, and whether the content is server markup.
 * @typedef {Readonly<{ childParts: ChildParts, adopting: boolean }>} Making
 */

/**
 * The parts for every hole of a template, found by the markers among its nodes.
 * @param {Prepared} prepared - The template
 * @param {Span} span - Its nodes
 * @param {Making} making - How to make them
 * @returns {Part[]} One part per hole
 */
function partsOf(prepared, span, making) {
  const { adopting, childParts } = making
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
      return childParts(range, adopting)
    }
    const element = found.elements[hole.element]
    if (!element) {
      throw new Error('A bound element has no marker')
    }
    return elementPart(hole, element)
  })
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
 * Renders a template afresh.
 * @param {TemplateResult} result - The template and its values
 * @param {Document} document - The document to render in
 * @param {ChildParts} childParts - Makes child parts
 * @returns {Readonly<{ instance: TemplateInstance, nodes: DocumentFragment }>} The instance, and its nodes to insert
 */
function createInstance(result, document, childParts) {
  const prepared = prepare(result.strings)
  const nodes = document.importNode(templateFor(prepared, document).content, true)
  const parts = partsOf(prepared, { end: undefined, first: nodes.firstChild }, { adopting: false, childParts })
  const instance = new TemplateInstance(result.strings, parts)
  instance.update(result.values)
  return { instance, nodes }
}

/**
 * Adopts server markup for a template: its nodes stay, and its parts take over from them.
 * @param {TemplateResult} result - The template and its values
 * @param {Range} range - The markers around the markup
 * @param {ChildParts} childParts - Makes child parts
 * @returns {TemplateInstance} The instance
 */
function adoptInstance(result, range, childParts) {
  const prepared = prepare(result.strings)
  const span = { end: range.close, first: range.open.nextSibling }
  const instance = new TemplateInstance(result.strings, partsOf(prepared, span, { adopting: true, childParts }))
  instance.update(result.values)
  return instance
}

export { TemplateInstance, adoptInstance, createInstance }
