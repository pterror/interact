/**
 * The grammar and look the markdown tests read: CommonMark, GFM and HTML inside, composed as an app composes them
 */

import { GFM, parser } from '@lezer/markdown'

import { htmlInMarkdown } from './html-in-markdown.js'
import { gfmLook, htmlLook, markdownLook } from './look.js'

const testGrammar = parser.configure([GFM, htmlInMarkdown])

/**
 * Every look composed
 * @param {import('./look.js').Html} html - The policy
 * @returns {import('@pterror/interact-editor/look').Look} The look
 */
function testLook(html) {
  return { ...markdownLook(html), ...gfmLook(html), ...htmlLook(html) }
}

export { testGrammar, testLook }
