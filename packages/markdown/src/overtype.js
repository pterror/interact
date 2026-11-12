/**
 * Overtype (from cyoa's `language.ts`): typing the character that is already next, where it closes something (the
 * `**` after bold words, a link's `]`), steps over it instead of writing it a second time. A phone's keyboard often
 * sends a keystroke as the word being typed replaced by that word and one more character; that is the same keystroke.
 * It is an extension an app adds or leaves out.
 */

import { syntaxTree } from '@codemirror/language'
import { EditorView } from '@codemirror/view'

/**
 * Whether a position is inside a closing mark: a mark ending its node, after the node's start
 * @param {import('@codemirror/state').EditorState} state - The state
 * @param {number} at - The position
 * @returns {boolean} Whether it is
 */
function inClosingMark(state, at) {
  const mark = syntaxTree(state).resolveInner(at, 1)
  const parent = mark.parent
  return (
    mark.name.endsWith('Mark') &&
    mark.from <= at &&
    at < mark.to &&
    parent !== null &&
    mark.to === parent.to &&
    mark.from > parent.from
  )
}

/**
 * Steps over a closing mark typed where it already is
 * @returns {import('@codemirror/state').Extension} The extension
 */
function overtype() {
  return EditorView.inputHandler.of((view, from, to, text) => {
    const replaced = view.state.sliceDoc(from, to)
    if (!text.startsWith(replaced) || text.length !== replaced.length + 1) {
      return false
    }
    if (view.state.sliceDoc(to, to + 1) !== text.slice(-1) || !inClosingMark(view.state, to)) {
      return false
    }
    view.dispatch({ scrollIntoView: true, selection: { anchor: to + 1 } })
    return true
  })
}

export { overtype }
