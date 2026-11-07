/**
 * What an event hole takes: a function called with the event.
 * @typedef {(event: Event) => void} Handler
 */

/**
 * What identifies an item among those `repeat` renders.
 * @typedef {string | number} Key
 */

/**
 * A template's static strings with the values for its holes.
 * @typedef {Readonly<{ kind: 'template', strings: TemplateStringsArray, values: readonly Value[] }>} TemplateResult
 */

/**
 * One item `repeat` renders: its key, and what it renders as.
 * @typedef {Readonly<{ key: Key, result: TemplateResult }>} Entry
 */

/**
 * Items rendered by key, so an item that stays keeps its nodes when others come, go or move.
 * @typedef {Readonly<{ kind: 'repeat', entries: readonly Entry[] }>} Repeat
 */

/**
 * What one attribute takes: a string or number as its text, `true` as empty, and `false`, `null` or `undefined` to
 * leave it out.
 * @typedef {string | number | boolean | null | undefined} AttributeValue
 */

/**
 * Attributes by name, for a hole that stands alone in a tag; the attributes it set before and doesn't now are taken
 * off.
 * @typedef {Readonly<{ kind: 'attributes', values: Readonly<Record<string, AttributeValue>> }>} Spread
 */

/**
 * What a hole takes. Attribute holes take an `AttributeValue`. A hole standing alone in a tag takes `attributes(...)`.
 * Event holes take a handler, or nothing. Child holes take text, numbers, a template, a `repeat`, or nothing.
 * @typedef {AttributeValue | Handler | TemplateResult | Repeat | Spread} Value
 */

/**
 * A template with holes. Each hole is a whole attribute value (`name=${value}`), attributes by name standing alone in
 * a tag (`<p ${attributes(values)}>`), a property (`.name=${value}`), an event (`@name=${handler}`), or child content
 * (`<p>${value}</p>`). Anything else is an error when the template is first used.
 * @param {TemplateStringsArray} strings - The static strings
 * @param {readonly Value[]} values - What goes in the holes
 * @returns {TemplateResult} The template with its values
 */
function html(strings, ...values) {
  return { kind: 'template', strings, values }
}

/**
 * Renders items by key: an item whose key stays keeps its nodes, moved where it now belongs.
 * @template T
 * @param {readonly T[]} items - What to render, in order
 * @param {(item: T) => Key} keyOf - Each item's key, unique among them
 * @param {(item: T, index: number) => TemplateResult} template - What each renders as
 * @returns {Repeat} The child value
 */
function repeat(items, keyOf, template) {
  return { entries: items.map((item, index) => ({ key: keyOf(item), result: template(item, index) })), kind: 'repeat' }
}

/**
 * Attributes by name, for a hole standing alone in a tag: what a template doesn't name, given by whoever renders it.
 * @param {Readonly<Record<string, AttributeValue>>} values - The attributes
 * @returns {Spread} The hole's value
 */
function attributes(values) {
  return { kind: 'attributes', values }
}

export { attributes, html, repeat }
