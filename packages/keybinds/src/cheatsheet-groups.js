/**
 * What the cheatsheet shows: each category's commands, with every binding through the inputs it shows, and those that
 * don't apply now marked.
 */

/**
 * @import { Command, Context } from './command.js'
 * @import { InputUI } from './input.js'
 * @import { ActiveCommand } from './search.js'
 */

import { bindingParts } from './binding-format.js'
import { make, namesOf } from './component-dom.js'
import { groupByCategory } from './search.js'

/**
 * A binding's keys, as `<kbd>`s in a span of their own
 * @param {readonly string[]} keys - The binding's display parts
 * @returns {HTMLSpanElement} The binding
 */
function bindingOf(keys) {
  const binding = make('span', { className: 'cheatsheet__item-binding', part: 'item-binding' })
  binding.append(...keys.map((key) => make('kbd', { className: 'cheatsheet__item-key', part: 'item-key', text: key })))
  return binding
}

/**
 * One command's row: its label and its bindings
 * @param {ActiveCommand} entry - The command, and whether it applies
 * @param {readonly InputUI[]} inputs - How bindings are shown
 * @returns {HTMLLIElement} The row
 */
function itemOf({ active, command }, inputs) {
  const item = make('li', {
    className: namesOf({ cheatsheet__item: true, 'cheatsheet__item--disabled': !active }),
    part: namesOf({ item: true, 'item-disabled': !active }),
  })
  const bindings = make('span', { className: 'cheatsheet__item-keys', part: 'item-keys' })
  for (const keys of bindingParts(command, inputs)) {
    bindings.append(bindingOf(keys))
  }
  item.append(make('span', { className: 'cheatsheet__item-label', part: 'item-label', text: command.label }), bindings)
  return item
}

/**
 * One category's group: its title and its commands' rows
 * @param {string} category - The category
 * @param {readonly ActiveCommand[]} entries - Its commands, and whether each applies
 * @param {readonly InputUI[]} inputs - How bindings are shown
 * @returns {HTMLDivElement} The group
 */
function groupOf(category, entries, inputs) {
  const group = make('div', { className: 'cheatsheet__group', part: 'group' })
  const list = make('ul', { className: 'cheatsheet__list', part: 'list' })
  list.append(...entries.map((entry) => itemOf(entry, inputs)))
  group.append(make('div', { className: 'cheatsheet__group-title', part: 'group-title', text: category }), list)
  return group
}

/**
 * Every category's group
 * @param {readonly Command[]} commands - The commands
 * @param {Context} context - What `when` conditions see
 * @param {readonly InputUI[]} inputs - Which bindings are shown, and how
 * @returns {HTMLDivElement[]} The groups
 */
function cheatsheetGroups(commands, context, inputs) {
  const fields = inputs.filter((input) => input.axis !== true).map(({ field }) => field)
  /** @type {HTMLDivElement[]} */
  const groups = []
  for (const [category, entries] of Object.entries(groupByCategory(commands, context, fields))) {
    groups.push(groupOf(category, entries, inputs))
  }
  return groups
}

export { cheatsheetGroups }
