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
 * What a hole takes. Attribute holes take strings, numbers and booleans, and leave the attribute out for `false`,
 * `null` and `undefined`. Event holes take a handler, or nothing. Child holes take text, numbers, a template, a
 * `repeat`, or nothing.
 * @typedef {string | number | boolean | null | undefined | Handler | TemplateResult | Repeat} Value
 */

/**
 * A template with holes. Each hole is a whole attribute value (`name=${value}`), a property (`.name=${value}`), an
 * event (`@name=${handler}`), or child content (`<p>${value}</p>`). Anything else is an error when the template is
 * first used.
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

export { html, repeat }
