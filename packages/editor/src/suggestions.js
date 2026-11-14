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
 * One suggestion: what it shows, and what choosing it does to the text between `from` and `to`. Options with the same
 * `section` are shown together under it, in the order the sections first come; `icon` is drawn before the label
 * @typedef {Readonly<{
 *   label: string,
 *   detail?: string,
 *   apply: (view: EditorView, from: number, to: number) => void,
 *   info?: () => import('./later.js').Later<HTMLElement>,
 *   section?: string,
 *   icon?: () => Element,
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
 * What CodeMirror's completion doesn't carry: the option's icon, and its place in its answer
 * @type {WeakMap<import('@codemirror/autocomplete').Completion, Readonly<{ icon: (() => Element) | undefined, index: number }>>}
 */
const shown = new WeakMap()

/**
 * A suggestion as CodeMirror shows it
 * @param {Option} option - The suggestion
 * @param {number} index - Its place in its answer
 * @param {ReadonlyMap<string, number>} ranks - Each section's place among the answer's
 * @returns {import('@codemirror/autocomplete').Completion} The completion
 */
function completionOf(option, index, ranks) {
  const { icon, info, section } = option
  /** @type {import('@codemirror/autocomplete').Completion} */
  const completion = {
    apply: (view, _completion, from, to) => {
      option.apply(view, from, to)
    },
    label: option.label,
    ...(option.detail === undefined ? {} : { detail: option.detail }),
    ...(info === undefined ? {} : { info: async () => info() }),
    ...(section === undefined ? {} : { section: { name: section, rank: ranks.get(section) ?? 0 } }),
  }
  shown.set(completion, { icon, index })
  return completion
}

/**
 * Each section's place, in the order sections first come among the options
 * @param {readonly Option[]} options - The options
 * @returns {Map<string, number>} The places
 */
function ranksOf(options) {
  /** @type {Map<string, number>} */
  const ranks = new Map()
  for (const { section } of options) {
    if (section !== undefined && !ranks.has(section)) {
      ranks.set(section, ranks.size)
    }
  }
  return ranks
}

/**
 * Suggestions from sources. CodeMirror ranks the options by how well their labels match what's typed
 * @param {readonly Suggest[]} sources - The sources, asked in order; every answer is shown
 * @returns {import('@codemirror/state').Extension} The extension that shows them
 */
function suggestions(sources) {
  return autocompletion({
    addToOptions: [
      {
        // Where CodeMirror draws its own icon
        position: 20,
        render: (completion) => {
          const icon = shown.get(completion)?.icon
          // oxlint-disable-next-line unicorn/no-null -- an option's part answers null for nothing drawn
          return icon === undefined ? null : icon()
        },
      },
    ],
    // Options matching what's typed equally well keep their answer's order
    compareCompletions: (a, b) => (shown.get(a)?.index ?? 0) - (shown.get(b)?.index ?? 0),
    override: sources.map((suggest) => async (context) => {
      const answer = await suggest((from, to) => context.state.sliceDoc(from, to), context.pos, context.explicit)
      if (answer === undefined || context.aborted) {
        // oxlint-disable-next-line unicorn/no-null -- a completion source answers null for no completions
        return null
      }
      const ranks = ranksOf(answer.options)
      return {
        from: answer.from,
        options: answer.options.map((option, index) => completionOf(option, index, ranks)),
        to: answer.to,
      }
    }),
  })
}

export { suggestions }
