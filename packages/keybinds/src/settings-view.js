/**
 * The settings panel's contents: a group per category, a row per command or axis with its bindings, the prompt where
 * one is being recorded, and the question where a binding is taken.
 */

/**
 * @import { InputUI } from './input.js'
 * @import { RecordingState, Slot } from './settings-record.js'
 * @import { AnyBindingsStore } from './store.js'
 */

import { formatBinding } from './binding-format.js'
import { RELEASE_SUFFIX } from './binding.js'
import { make } from './component-dom.js'
import { listsOf } from './settings-edit.js'
import { addButtons, button, chipOf, conflictOf, recordingBox, toggle } from './settings-parts.js'

const NONE = 0

/**
 * A binding that's taken, waiting on whether to replace the other command's: the binding, the slot it's for, the
 * other command's id and label, and whether it came from switching a binding's form rather than recording
 * @typedef {Readonly<{ binding: string, flip: boolean, id: string, label: string, slot: Slot }>} Conflict
 */

/**
 * What the panel shows from: its store and inputs, which syntax is on, recording as it is, and a taken binding
 * @typedef {Readonly<{ conflict: Conflict | undefined, holds: boolean, inputs: readonly InputUI[], recording:
 *   RecordingState, releases: boolean, sequences: boolean, store: AnyBindingsStore }>} SettingsView
 */

/**
 * What the panel's controls do
 * @typedef {Readonly<{ accept: () => void, cancel: () => void, capture: (suffix: string) => void, finish: () => void,
 *   flip: (slot: Slot, flipped: string) => void, record: (slot: Slot) => void, remove: (slot: Slot) => void,
 *   reset: (id: string) => void, toggleSteps: () => void }>} SettingsActions
 */

/**
 * What the panel shows from, and what its controls do
 * @typedef {Readonly<{ actions: SettingsActions, view: SettingsView }>} Panel
 */

/**
 * A switch in the recording prompt, named `settings__recording-<name>` with the part `recording-<name>`
 * @param {Readonly<{ label: string, name: string, on: boolean }>} made - Its label, name and whether it's on
 * @param {() => void} click - What it does
 * @returns {HTMLButtonElement} The switch
 */
function promptSwitch({ label, name, on }, click) {
  return toggle({ className: `settings__recording-${name}`, label, name: `recording-${name}`, on }, click)
}

/**
 * The switches for a release, or a hold and a tap, instead of a press
 * @param {InputUI} input - The input being recorded
 * @param {Panel} panel - What the panel shows from, and what its controls do
 * @returns {HTMLButtonElement[]} The switches that apply
 */
function endSwitches(input, { actions, view }) {
  const { suffix } = view.recording
  /**
   * A switch for one suffix
   * @param {string} label - Its label
   * @param {string} name - Its name
   * @param {string} which - The suffix
   * @returns {HTMLButtonElement} The switch
   */
  function captures(label, name, which) {
    return promptSwitch({ label, name, on: suffix === which }, () => {
      actions.capture(which)
    })
  }
  if (input.release === undefined) {
    return []
  }
  return [
    ...(view.releases ? [captures('Release', 'release', RELEASE_SUFFIX)] : []),
    ...(view.holds ? [captures('Hold', 'hold', ':hold'), captures('Tap', 'tap', ':tap')] : []),
  ]
}

/**
 * The switches for what to record: a release, hold or tap instead of a press, or several steps, and Done once there
 * are steps
 * @param {InputUI} input - The input being recorded
 * @param {Panel} panel - What the panel shows from, and what its controls do
 * @returns {HTMLButtonElement[]} The switches that apply
 */
function promptSwitches(input, panel) {
  const { actions, view } = panel
  const { sequence, steps } = view.recording
  return [
    ...endSwitches(input, panel),
    ...(view.sequences && input.axis !== true
      ? [promptSwitch({ label: 'Steps', name: 'sequence', on: sequence }, actions.toggleSteps)]
      : []),
    ...(steps.length > NONE ? [promptSwitch({ label: 'Done', name: 'done', on: false }, actions.finish)] : []),
  ]
}

/**
 * What's shown while a binding is recorded: what to do, or the steps so far, and the switches
 * @param {InputUI} input - The input being recorded
 * @param {Panel} panel - What the panel shows from, and what its controls do
 * @returns {HTMLSpanElement} The prompt
 */
function promptOf(input, panel) {
  const { steps, suffix } = panel.view.recording
  const text =
    steps.length > NONE
      ? `${formatBinding(input, steps.join(' ')).join(' ')} then...`
      : (input.prompt?.(suffix === RELEASE_SUFFIX) ?? 'Waiting...')
  const prompt = recordingBox()
  prompt.append(
    make('span', { className: 'settings__recording-overlay', part: 'recording-overlay', text }),
    ...promptSwitches(input, panel),
  )
  return prompt
}

/**
 * The question about a taken binding, if there is one
 * @param {Panel} panel - What the panel shows from, and what its controls do
 * @returns {HTMLSpanElement[]} The question, or nothing
 */
function questionOf({ actions, view }) {
  return view.conflict === undefined ? [] : [conflictOf(view.conflict.label, actions)]
}

/**
 * Whether two slots are the same binding
 * @param {Slot | undefined} first - One slot
 * @param {Slot} second - Another
 * @returns {boolean} Whether they are
 */
function sameSlot(first, second) {
  return first?.id === second.id && first.input === second.input && first.index === second.index
}

/**
 * A binding's chip, with what its controls do
 * @param {Slot} slot - Which binding
 * @param {string} binding - The binding
 * @param {Panel} panel - What the panel shows from, and what its controls do
 * @returns {HTMLSpanElement} The chip
 */
function chipFor(slot, binding, { actions, view }) {
  return chipOf(
    slot.input,
    { binding, releases: view.releases },
    {
      flip: (flipped) => {
        actions.flip(slot, flipped)
      },
      record: () => {
        actions.record(slot)
      },
      remove: () => {
        actions.remove(slot)
      },
    },
  )
}

/**
 * A binding as shown in its row: its chip, or the prompt while it's recorded again, or only the question while a
 * switch to it waits on one
 * @param {Slot} slot - Which binding
 * @param {string} binding - The binding
 * @param {Panel} panel - What the panel shows from, and what its controls do
 * @returns {HTMLSpanElement} What's shown
 */
function bindingCell(slot, binding, panel) {
  const { view } = panel
  if (!sameSlot(view.recording.slot, slot)) {
    return chipFor(slot, binding, panel)
  }
  const cell = view.conflict?.flip === true ? recordingBox() : promptOf(slot.input, panel)
  cell.append(...questionOf(panel))
  return cell
}

/**
 * The end of a row: the prompt and question while a new binding is recorded for it, or the buttons that add one while
 * nothing is being recorded
 * @param {string} id - The row's command or axis
 * @param {readonly InputUI[]} inputs - The inputs shown on the row
 * @param {Panel} panel - What the panel shows from, and what its controls do
 * @returns {HTMLSpanElement[]} What goes there
 */
function rowEnd(id, inputs, panel) {
  const { slot } = panel.view.recording
  if (slot === undefined) {
    return [
      addButtons(inputs, (input) => {
        panel.actions.record({ id, index: undefined, input })
      }),
    ]
  }
  return slot.id === id && slot.index === undefined ? [promptOf(slot.input, panel), ...questionOf(panel)] : []
}

/**
 * A row: the command's or axis's label, its bindings through the inputs that fit it (an axis's sources, or a
 * command's triggers), and its reset button
 * @param {Readonly<{ id: string, label: string }>} row - The command or axis
 * @param {Panel} panel - What the panel shows from, and what its controls do
 * @returns {HTMLLIElement} The row
 */
function rowOf({ id, label }, panel) {
  const { store } = panel.view
  const axis = store.defaults(id)?.axes !== undefined
  const inputs = panel.view.inputs.filter((input) => (input.axis === true) === axis)
  const lists = listsOf(store, id, inputs)
  const bindings = make('span', { className: 'settings__item-bindings', part: 'item-bindings' })
  bindings.append(
    ...inputs.flatMap((input) =>
      (lists[input.field] ?? []).map((binding, index) => bindingCell({ id, index, input }, binding, panel)),
    ),
    ...rowEnd(id, inputs, panel),
  )
  const item = make('li', { className: 'settings__item', part: 'item' })
  item.append(
    make('span', { className: 'settings__item-label', part: 'item-label', text: label }),
    bindings,
    button({ className: 'settings__item-reset', part: 'item-reset', text: 'Reset' }, () => {
      panel.actions.reset(id)
    }),
  )
  return item
}

/**
 * A category's group of rows
 * @param {string} category - The category
 * @param {readonly HTMLLIElement[]} rows - Its rows
 * @returns {HTMLDivElement} The group
 */
function groupOf(category, rows) {
  const list = make('ul', { className: 'settings__list', part: 'list' })
  list.append(...rows)
  const group = make('div', { className: 'settings__group', part: 'group' })
  group.append(make('div', { className: 'settings__group-title', part: 'group-title', text: category }), list)
  return group
}

/**
 * The category a row goes under: its own, or "Other"
 * @param {Readonly<{ category?: string | undefined }>} binding - The row's bindings
 * @returns {string} The category
 */
function categoryOf({ category }) {
  return category === undefined || category === '' ? 'Other' : category
}

/**
 * A group for each category, in the order the store first has them, of the rows that aren't hidden
 * @param {Panel} panel - What the panel shows from, and what its controls do
 * @returns {HTMLDivElement[]} The groups
 */
function groupsOf(panel) {
  const rows = panel.view.store.entries().filter(({ binding }) => binding.hidden !== true)
  const categories = [...new Set(rows.map(({ binding }) => categoryOf(binding)))]
  return categories.map((category) =>
    groupOf(
      category,
      rows
        .filter(({ binding }) => categoryOf(binding) === category)
        .map(({ binding, id }) => rowOf({ id, label: binding.label }, panel)),
    ),
  )
}

export { groupsOf }
