/** @import { AttributeValue, Handler, Repeat, TemplateResult, Value } from './template.js' */

/**
 * What a child hole holds: nothing, text, one template, or items by key.
 * @typedef {Readonly<{ kind: 'nothing' }> | Readonly<{ kind: 'text', text: string }> | TemplateResult | Repeat} Child
 */

/** @type {Child} */
const NOTHING = { kind: 'nothing' }

/**
 * A value, named for an error.
 * @param {Value} value - Any hole value
 * @returns {string} What it is
 */
function describe(value) {
  if (typeof value === 'object' && value !== null) {
    return `a ${value.kind}`
  }
  return typeof value
}

/**
 * What an attribute hole's value makes the attribute: absent for `false`, `null` and `undefined`, empty for `true`.
 * @param {Value} value - The hole's value
 * @param {string} name - The attribute, for the error
 * @returns {string | undefined} The attribute's text, or undefined to leave it out
 */
function attributeText(value, name) {
  if (value === undefined || value === null || value === false) {
    return undefined
  }
  if (value === true) {
    return ''
  }
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value)
  }
  throw new TypeError(`Attribute "${name}" takes a string, number or boolean, not ${describe(value)}`)
}

/**
 * What a child hole's value is.
 * @param {Value} value - The hole's value
 * @returns {Child} Its kind and content
 */
function childOf(value) {
  if (value === undefined || value === null || value === false || value === '') {
    return NOTHING
  }
  if (typeof value === 'string' || typeof value === 'number') {
    return { kind: 'text', text: String(value) }
  }
  if (typeof value === 'object' && value.kind !== 'attributes') {
    return value
  }
  throw new TypeError(`Child content is text, a number, a template or a repeat, not ${describe(value)}`)
}

/**
 * An event hole's handler.
 * @param {Value} value - The hole's value
 * @param {string} name - The event, for the error
 * @returns {Handler | undefined} The handler, or undefined for none
 */
function handlerOf(value, name) {
  if (value === undefined || value === null) {
    return undefined
  }
  if (typeof value === 'function') {
    return value
  }
  throw new TypeError(`Event "${name}" takes a function, not ${describe(value)}`)
}

/**
 * A hole standing alone in a tag: its attributes' text by name, leaving out those it leaves out.
 * @param {Value} value - The hole's value
 * @returns {ReadonlyMap<string, string>} The attributes
 */
function spreadOf(value) {
  if (typeof value !== 'object' || value?.kind !== 'attributes') {
    throw new TypeError(`A hole standing alone in a tag takes attributes(...), not ${describe(value)}`)
  }
  /** @type {Map<string, string>} */
  const texts = new Map()
  for (const [name, each] of Object.entries(value.values)) {
    /** @type {AttributeValue} */
    const given = each
    const text = attributeText(given, name)
    if (text !== undefined) {
      texts.set(name, text)
    }
  }
  return texts
}

export { NOTHING, attributeText, childOf, handlerOf, spreadOf }
