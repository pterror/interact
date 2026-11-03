/**
 * @import { Command, Context } from './command.js'
 * @import { Matcher } from './search.js'
 */

import { describe, expect, test } from 'bun:test'

import { simpleMatcher } from './matchers.js'
import { groupByCategory, inMenu, searchCommands } from './search.js'

const CUSTOM = 10
const FIRST = 0

/**
 * A command that does nothing
 * @param {Omit<Command, 'execute'>} fields - Everything but what it does
 * @returns {Command} The command
 */
function commandWith(fields) {
  return { ...fields, execute: () => undefined }
}

/**
 * A `when` reading whether the context is ready
 * @param {Context} context - The app's state
 * @returns {boolean} Whether `ready` is true
 */
function whenReady(context) {
  return context['ready'] === true
}

/**
 * The ids of the commands in some results, in order
 * @param {readonly Readonly<{ command: Command }>[]} [results] - The results, none if missing
 * @returns {string[]} Their ids
 */
function ids(results = []) {
  return results.map(({ command }) => command.id)
}

/**
 * The labels of the commands in some results, in order
 * @param {readonly Readonly<{ command: Command }>[]} [results] - The results, none if missing
 * @returns {string[]} Their labels
 */
function labels(results = []) {
  return results.map(({ command }) => command.label)
}

/**
 * A matcher that matches only text with "Save" in it, whatever was typed
 * @type {Matcher}
 */
function savesOnly(_query, text) {
  return text.includes('Save') ? { positions: [FIRST], score: CUSTOM } : undefined
}

const FILES = [
  commandWith({ category: 'File', id: 'save', keys: ['$mod+s'], label: 'Save document' }),
  commandWith({ category: 'File', id: 'open', keys: ['$mod+o'], label: 'Open file' }),
  commandWith({ category: 'Edit', id: 'delete', keys: ['Backspace'], label: 'Delete', when: () => false }),
]

describe('searchCommands', () => {
  test('finds commands by label, id and category', () => {
    expect(searchCommands(FILES, 'Save')[FIRST]?.command.id).toBe('save')
    expect(ids(searchCommands(FILES, 'open'))).toContain('open')
    expect(ids(searchCommands(FILES, 'File'))).toEqual(['open', 'save'])
  })

  test('leaves out hidden commands, and keeps unbound ones', () => {
    const more = [
      ...FILES,
      commandWith({ hidden: true, id: 'hidden', keys: ['h'], label: 'Hidden cmd' }),
      commandWith({ id: 'unbound', label: 'Unbound cmd' }),
    ]
    expect(searchCommands(more, 'Hidden')).toEqual([])
    expect(ids(searchCommands(more, 'Unbound'))).toEqual(['unbound'])
  })

  test('takes the last command registered under an id', () => {
    const twice = [commandWith({ id: 'save', label: 'Save v1' }), commandWith({ id: 'save', label: 'Save v2' })]
    expect(labels(searchCommands(twice, 'Save'))).toEqual(['Save v2'])
  })

  test('lists commands that apply before ones that do not', () => {
    expect(searchCommands(FILES, 'e').map(({ active }) => active)).toEqual([true, true, false])
  })

  test('matches fuzzily, with positions, unless given a matcher', () => {
    expect(ids(searchCommands(FILES, 'anything', { matcher: savesOnly }))).toEqual(['save'])
    expect(searchCommands(FILES, 'svd')[FIRST]?.positions).toBeDefined()
  })

  test('finds a description by the words as typed, not letters scattered through it', () => {
    const more = [
      commandWith({ description: 'What can be done with the link or words at the cursor', id: 'more', label: 'More…' }),
    ]
    expect(searchCommands(more, 'door')).toEqual([])
    expect(ids(searchCommands(more, 'the cursor'))).toEqual(['more'])
  })
})

describe('ranking matches', () => {
  test('the query typed whole counts for more than its letters scattered', () => {
    const found = searchCommands(
      [commandWith({ id: 'dl', label: 'Download this story' }), commandWith({ id: 'door', label: 'The red door' })],
      'door',
    )
    expect(ids(found)).toEqual(['door', 'dl'])
  })

  test('rank comes before relevance, and after whether it applies', () => {
    const found = searchCommands(
      [
        commandWith({ id: 'new', label: 'New page “cave”', rank: -1 }),
        commandWith({ id: 'off', label: 'Cave', when: () => false }),
        commandWith({ id: 'page', label: 'The caves below' }),
      ],
      'cave',
    )
    expect(ids(found)).toEqual(['page', 'new', 'off'])
  })
})

describe('searchCommands with a matcher', () => {
  test('matches with the matcher given, and nothing it rejects', () => {
    expect(ids(searchCommands(FILES, 'Save', { matcher: simpleMatcher }))).toEqual(['save'])
    expect(searchCommands(FILES, 'svd', { matcher: simpleMatcher })).toEqual([])
  })
})

describe('groupByCategory', () => {
  const GROUPED = [...FILES, commandWith({ id: 'misc', keys: ['m'], label: 'Misc' })]

  test('groups by category, "Other" for none', () => {
    const groups = groupByCategory(GROUPED)
    expect(Object.keys(groups).toSorted()).toEqual(['Edit', 'File', 'Other'])
    expect(ids(groups['Other'])).toEqual(['misc'])
  })

  test('leaves out hidden and unbound commands, and takes the last under an id', () => {
    const more = [
      ...GROUPED,
      commandWith({ hidden: true, id: 'h', keys: ['h'], label: 'H' }),
      commandWith({ id: 'u', label: 'U' }),
      commandWith({ category: 'File', id: 'save', keys: ['$mod+s'], label: 'Save v2' }),
    ]
    const groups = groupByCategory(more)
    expect(ids(Object.values(groups).flat())).not.toContain('h')
    expect(ids(Object.values(groups).flat())).not.toContain('u')
    expect(labels(groups['File'])).toEqual(['Save v2', 'Open file'])
  })

  test('says whether each command applies', () => {
    const groups = groupByCategory([commandWith({ id: 'a', keys: ['a'], label: 'A', when: whenReady })], {
      ready: false,
    })
    expect(groups['Other']?.[FIRST]?.active).toBe(false)
  })
})

describe('inMenu', () => {
  test('finds commands tagged with the menu, by one tag or among several, and every command with no tag', () => {
    const tagged = [
      commandWith({ id: 'a', label: 'A', menu: ['node', 'edge'] }),
      commandWith({ id: 'b', label: 'B', menu: 'edge' }),
      commandWith({ id: 'c', label: 'C', menu: 'node' }),
    ]
    expect([
      tagged.filter((command) => inMenu(command, 'node')).map(({ id }) => id),
      tagged.filter((command) => inMenu(command, 'nonexistent')),
      tagged.filter((command) => inMenu(command, undefined)).map(({ id }) => id),
    ]).toEqual([['a', 'c'], [], ['a', 'b', 'c']])
  })
})
