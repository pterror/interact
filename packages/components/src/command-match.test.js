/** @import { BridgeCommand } from './command-bridge.js' */
/** @import { FoundCommand } from './command-match.js' */

import { describe, expect, test } from 'bun:test'

import { matchCommands } from './command-match.js'

/**
 * A command that can run, by its label.
 * @param {string} label - Its label
 * @returns {BridgeCommand} The command
 */
function command(label) {
  return { enabled: true, id: label.toLowerCase(), label }
}

/**
 * The characters of a found command's label where it matched.
 * @param {FoundCommand} found - The command
 * @returns {string} Those characters
 */
function matched(found) {
  return (found.positions ?? []).map((index) => found.label.charAt(index)).join('')
}

const COMMANDS = [
  command('Reopen file'),
  command('Open file'),
  command('Save'),
  command('Go to file'),
  command('Éditer'),
]

describe('finding commands by what was typed', () => {
  test('puts labels starting with it first, then words starting with it, then the rest, each in list order', () => {
    const found = matchCommands(COMMANDS, 'open')
    expect(found.map(({ label }) => label)).toEqual(['Open file', 'Reopen file'])
    expect(matchCommands(COMMANDS, 'fil').map(({ label }) => label)).toEqual(['Reopen file', 'Open file', 'Go to file'])
  })

  test('says where it matched, and ignores case and accents', () => {
    expect(matchCommands(COMMANDS, 'open').map((found) => matched(found))).toEqual(['Open', 'open'])
    expect(matchCommands(COMMANDS, 'edi').map(({ label }) => label)).toEqual(['Éditer'])
  })

  test('finds every command, in order, for nothing typed, and nothing for what no label has', () => {
    expect(matchCommands(COMMANDS, '  ')).toEqual(COMMANDS)
    expect(matchCommands(COMMANDS, 'zzz')).toEqual([])
  })
})
