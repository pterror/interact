/** @import { Command } from './command.js' */

import { afterEach, beforeAll, describe, expect, mock, test } from 'bun:test'

import { createComponent } from './create-component.js'
import { CommandPalette } from './palette.js'
import { defineOnce, partOf, sortedTextsOf, textsOf, typeInto } from './test-components.js'
import { kbd, keybinds } from './test-helpers.js'

const DELAY = 5
const PAUSE = 30
const FIRST = 0
const LABELS = '.palette__item-label'

/** @type {Element[]} */
const placed = []

afterEach(() => {
  for (const element of placed.splice(FIRST)) {
    element.remove()
  }
})

/**
 * Puts an element in the page until the test ends
 * @template {Element} E
 * @param {E} element - The element
 * @returns {E} The same element
 */
function place(element) {
  document.body.append(element)
  placed.push(element)
  return element
}

/**
 * A palette in the page until the test ends, and its search field
 * @returns {Readonly<{ element: CommandPalette, field: HTMLInputElement }>} The palette, and its field
 */
function placedPalette() {
  const element = place(createComponent(CommandPalette))
  return { element, field: partOf(element, 'input', HTMLInputElement) }
}

/**
 * A command that does nothing
 * @param {string} id - Its id
 * @param {string} label - Its label
 * @returns {Command} The command
 */
function command(id, label) {
  return { execute: () => undefined, id, label }
}

/**
 * An open palette whose source answers, noting what it was asked
 * @param {readonly Command[]} answer - What the source answers
 * @returns {Readonly<{ asked: readonly string[], element: CommandPalette, field: HTMLInputElement }>} The palette, its
 *   field, and what was asked
 */
function asking(answer) {
  const { element, field } = placedPalette()
  /** @type {string[]} */
  const asked = []
  /**
   * Notes what it's asked, and answers
   * @param {string} query - What was typed
   * @returns {readonly Command[]} The answer
   */
  function source(query) {
    asked.push(query)
    return answer
  }
  element.sourceDelay = DELAY
  element.source = source
  element.open = true
  return { asked, element, field }
}

/**
 * Types a query into an open palette's field, and waits for its source to be asked
 * @param {HTMLInputElement} field - The palette's field
 * @param {string} query - What to type
 * @returns {Promise<void>} When it's been asked
 */
async function search(field, query) {
  typeInto(field, query)
  await Bun.sleep(PAUSE)
}

/**
 * An open palette whose source answers only when the test says
 * @returns {Readonly<{ answer: PromiseWithResolvers<readonly Command[]>, element: CommandPalette, field:
 *   HTMLInputElement }>} The palette, its field, and its source's answer to give
 */
function waiting() {
  const { element, field } = placedPalette()
  /** @type {PromiseWithResolvers<readonly Command[]>} */
  const answer = Promise.withResolvers()
  element.sourceDelay = FIRST
  element.source = async () => answer.promise
  element.open = true
  return { answer, element, field }
}

describe('a palette with a source', () => {
  test('merges what source answers for the typed query, after the delay', async () => {
    const { asked, element, field } = asking([command('b', 'Alphabet'), command('a', 'Alpha dup')])
    element.commands = [command('a', 'Alpha')]
    typeInto(field, 'al')
    typeInto(field, 'alp')
    expect(textsOf(element, LABELS)).toEqual(['Alpha'])
    await Bun.sleep(PAUSE)
    expect(asked).toEqual(['alp'])
    expect(sortedTextsOf(element, LABELS)).toEqual(['Alpha', 'Alphabet'])
  })

  test('keeps the answer, without asking again, when its commands change', async () => {
    const { asked, element, field } = asking([command('b', 'Alphabet')])
    await search(field, 'alp')
    element.commands = [command('a', 'Alpha')]
    await Bun.sleep(PAUSE)
    expect(asked).toEqual(['alp'])
    expect(sortedTextsOf(element, LABELS)).toEqual(['Alpha', 'Alphabet'])
  })

  test('drops an answer for a query no longer typed', async () => {
    const { answer, element, field } = waiting()
    typeInto(field, 'x')
    await Bun.sleep(DELAY)
    field.value = 'y'
    answer.resolve([command('x', 'Xylophone')])
    await Bun.sleep(DELAY)
    expect(textsOf(element, LABELS)).toEqual([])
  })

  test('runs what source answers when it is chosen, by click or Enter', async () => {
    /** @type {string[]} */
    const ran = []
    const { element, field } = asking([{ execute: () => ran.push('b'), id: 'b', label: 'Bravo' }])
    await search(field, 'br')
    partOf(element, '.palette__item', HTMLElement).click()
    element.open = true
    await search(field, 'br')
    field.dispatchEvent(kbd('keydown', { key: 'Enter' }))
    expect(ran).toEqual(['b', 'b'])
  })
})

describe('an open palette', () => {
  beforeAll(() => {
    defineOnce('keybinds-command-palette', CommandPalette)
    defineOnce('my-own-palette', class extends CommandPalette {})
  })

  test.each(['keybinds-command-palette', 'my-own-palette'])('holds keys back, registered as %s', (name) => {
    const target = place(document.createElement('div'))
    const execute = mock(() => undefined)
    const stop = keybinds([{ execute, id: 's', keys: ['ctrl+s'], label: 'S' }], undefined, { target })
    const element = document.createElement(name)
    target.append(element)
    element.toggleAttribute('open', true)
    expect(element.dataset['keybinds']).toBe('command-palette')
    element.dispatchEvent(kbd('keydown', { code: 'KeyS', ctrlKey: true, key: 's' }))
    expect(execute).not.toHaveBeenCalled()
    stop()
  })

  test('told to hide inactive commands, lists only those that apply', () => {
    const { element, field } = placedPalette()
    element.toggleAttribute('hide-inactive', true)
    element.commands = [
      { execute: () => undefined, id: 'a', label: 'Delete this page', when: () => false },
      command('b', 'Delete this story'),
    ]
    element.open = true
    typeInto(field, 'delete')
    expect(textsOf(element, LABELS)).toEqual(['Delete this story'])
  })
})
