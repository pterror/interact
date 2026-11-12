/**
 * Suggestions while typing, one mechanism over `@codemirror/autocomplete` for every source an app has (macros after
 * `{{`, slash commands, mentions). A source reads the text around the cursor and answers, now or later, with the range
 * its options replace, or none. An answer to a question the editor has since moved past is dropped.
 */

import { autocompletion } from '@codemirror/autocomplete'

/**
 * @typedef {import('@codemirror/view').EditorView} EditorView
 */

/**
 * One suggestion: what it shows, and what choosing it does to the text between `from` and `to`
 * @typedef {Readonly<{
 *   label: string,
 *   detail?: string,
 *   apply: (view: EditorView, from: number, to: number) => void,
 *   info?: () => import('./later.js').Later<HTMLElement>,
 * }>} Option
 */

/**
 * A source of suggestions: the source text is read with `read(from, to)`
 * @typedef {(
 *   read: (from: number, to: number) => string,
 *   pos: number,
 *   explicit: boolean,
 * ) => import('./later.js').Later<Readonly<{ from: number, to: number, options: readonly Option[] }> | undefined>} Suggest
 */

/**
 * A suggestion as CodeMirror shows it
 * @param {Option} option - The suggestion
 * @returns {import('@codemirror/autocomplete').Completion} The completion
 */
function completionOf(option) {
  const { info } = option
  return {
    apply: (view, _completion, from, to) => {
      option.apply(view, from, to)
    },
    label: option.label,
    ...(option.detail === undefined ? {} : { detail: option.detail }),
    ...(info === undefined ? {} : { info: async () => info() }),
  }
}

/**
 * Suggestions from sources
 * @param {readonly Suggest[]} sources - The sources, asked in order; every answer is shown
 * @returns {import('@codemirror/state').Extension} The extension that shows them
 */
function suggestions(sources) {
  return autocompletion({
    override: sources.map((suggest) => async (context) => {
      const answer = await suggest((from, to) => context.state.sliceDoc(from, to), context.pos, context.explicit)
      if (answer === undefined || context.aborted) {
        // oxlint-disable-next-line unicorn/no-null -- a completion source answers null for no completions
        return null
      }
      return { from: answer.from, options: answer.options.map((option) => completionOf(option)), to: answer.to }
    }),
  })
}

export { suggestions }
