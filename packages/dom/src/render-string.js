/**
 * @import { Hole } from './prepare.js'
 * @import { TemplateResult, Value } from './template.js'
 */

import { escapeAttribute, escapeText } from './escape.js'
import { CLOSE_MARKUP, OPEN_MARKUP } from './markers.js'
import { prepare } from './prepare.js'
import { attributeText, childOf } from './values.js'

/**
 * A child hole's content as markup, without the hole's own markers.
 * @param {Value} value - The hole's value
 * @returns {string} The markup
 */
function childToString(value) {
  const child = childOf(value)
  switch (child.kind) {
    case 'nothing': {
      return ''
    }
    case 'text': {
      return escapeText(child.text)
    }
    case 'template': {
      return instanceToString(child)
    }
    case 'repeat': {
      return child.entries.map(({ result }) => `${OPEN_MARKUP}${instanceToString(result)}${CLOSE_MARKUP}`).join('')
    }
    default: {
      throw new TypeError('Unknown child content')
    }
  }
}

/**
 * One hole as markup.
 * @param {Hole} hole - What the hole is
 * @param {Value} value - Its value
 * @returns {string} The markup that goes where the hole is
 */
function holeToString(hole, value) {
  if (hole.kind === 'child') {
    return `${OPEN_MARKUP}${childToString(value)}${CLOSE_MARKUP}`
  }
  if (hole.kind !== 'attribute') {
    return ''
  }
  const text = attributeText(value, hole.name)
  return text === undefined ? '' : ` ${hole.name}="${escapeAttribute(text)}"`
}

/**
 * A template's markup, with its holes filled and marked so hydration can find them.
 * @param {TemplateResult} result - The template and its values
 * @returns {string} The markup
 */
function instanceToString(result) {
  const { holes, pieces } = prepare(result.strings)
  const markup = [pieces[0] ?? '']
  for (const [index, hole] of holes.entries()) {
    markup.push(holeToString(hole, result.values[index]), pieces[index + 1] ?? '')
  }
  return markup.join('')
}

/**
 * A template as markup, for server rendering. `hydrate` adopts it in the browser instead of rendering again.
 * @param {TemplateResult} result - The template and its values
 * @returns {string} The markup, marked as one child hole
 */
function renderToString(result) {
  return `${OPEN_MARKUP}${instanceToString(result)}${CLOSE_MARKUP}`
}

export { renderToString }
