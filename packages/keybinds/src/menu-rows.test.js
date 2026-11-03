/** @import { Command } from './command.js' */

import { describe, expect, test } from 'bun:test'

import { menuRows, rankedRows } from './menu-rows.js'

const HIGH = 2
const LOW = 1
const NOTHING = 0

/**
 * A command that does nothing
 * @param {string} id - Its id
 * @param {Partial<Command>} [more] - Anything else it has
 * @returns {Command} The command
 */
function command(id, more = {}) {
  return { execute: () => undefined, id, label: id, ...more }
}

/**
 * The ids of a menu's rows
 * @param {readonly Command[]} commands - The commands
 * @param {string} menu - The menu's tag
 * @returns {string[]} The ids of the commands it shows
 */
function idsIn(commands, menu) {
  return menuRows(commands, { context: {}, menu }).map((found) => found.command.id)
}

/**
 * A command's score from a table
 * @param {ReadonlyMap<string, number>} scores - Scores by id
 * @param {Command} scored - The command
 * @returns {number} Its score, nothing if the table hasn't it
 */
function scoreIn(scores, scored) {
  return scores.get(scored.id) ?? NOTHING
}

describe("a menu's rows", () => {
  test('are the commands its tag picks, or every one not hidden', () => {
    const commands = [command('a', { menu: 'edit' }), command('b', { hidden: true }), command('c')]
    expect(idsIn(commands, 'edit')).toEqual(['a'])
    expect(idsIn(commands, '')).toEqual(['a', 'c'])
  })

  test('rank those that apply first, then by score, keeping their order otherwise', () => {
    const commands = [command('off', { when: () => false }), command('low'), command('high'), command('also-low')]
    const scores = new Map([
      ['also-low', LOW],
      ['high', HIGH],
      ['low', LOW],
      ['off', HIGH],
    ])
    const ranked = rankedRows(menuRows(commands, { context: {}, menu: '' }), {
      context: {},
      scorer: (scored) => scoreIn(scores, scored),
    })
    expect(ranked.map((found) => found.command.id)).toEqual(['high', 'low', 'also-low', 'off'])
  })

  test('leave out a command with a condition that the scorer gives nothing, and keep one without', () => {
    const commands = [command('when', { when: () => true }), command('always')]
    const ranked = rankedRows(menuRows(commands, { context: {}, menu: '' }), { context: {}, scorer: () => NOTHING })
    expect(ranked.map((found) => found.command.id)).toEqual(['always'])
  })
})
