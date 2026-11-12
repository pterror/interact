/**
 * A grammar as CodeMirror's language for an editor: what `syntaxTree` reads, and what the Look and the commands read
 * the text's structure from
 */

import { Language, defineLanguageFacet } from '@codemirror/language'

/**
 * The language of a grammar
 * @param {import('@lezer/common').Parser} grammar - The grammar
 * @returns {import('@codemirror/state').Extension} The extension that parses the text with it
 */
function grammarLanguage(grammar) {
  return new Language(defineLanguageFacet(), grammar, [], 'text').extension
}

export { grammarLanguage }
