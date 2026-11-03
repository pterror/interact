/**
 * Comboboxes for the tests, the same on the server and in the page: a handful of fruit as fixed options or suggested
 * by what is typed, and ten billion numbered items.
 * @import { Span } from '@interact/core/memory-source'
 * @import { Numbered, Range } from './test-helpers.js'
 */

import { MemorySource, startsWithTyped } from '@interact/core'

import { Combobox } from './combobox.js'
import { TEN_BILLION, numberText, numbers } from './test-helpers.js'

const FRUIT = ['Apple', 'Apricot', 'Banana', 'Blueberry', 'Cherry', 'Date']
const ROWS = 4

/**
 * What identifies a fruit, and what it is called: itself.
 * @param {string} fruit - The fruit
 * @returns {string} It
 */
function itself(fruit) {
  return fruit
}

/**
 * The fruit, as a source that can search and place them.
 * @param {readonly string[]} [fruit] - Which
 * @returns {MemorySource<string>} The source
 */
function fruitSource(fruit = FRUIT) {
  return new MemorySource(fruit, itself, itself)
}

/**
 * The fruit whose names start with what was typed, at once.
 * @param {string} text - What was typed
 * @returns {MemorySource<string>} The fruit
 */
function suggestFruit(text) {
  return fruitSource(FRUIT.filter((fruit) => startsWithTyped(fruit, text)))
}

/**
 * A select-only combobox over the fruit.
 * @param {string} [value] - The fruit chosen to start with
 * @returns {Combobox<string, Span>} The combobox
 */
function fruitSelect(value) {
  return new Combobox({
    id: 'fruit',
    kind: 'select-only',
    label: 'Fruit',
    placeholder: 'Choose a fruit',
    rows: ROWS,
    source: fruitSource(),
    ...(value === undefined ? {} : { value }),
  })
}

/**
 * An editable combobox suggesting fruit by what is typed.
 * @param {'list' | 'both'} autocomplete - How it autocompletes
 * @param {'manual' | 'automatic'} [selection] - How list autocomplete selects
 * @returns {Combobox<string, Span>} The combobox
 */
function fruitSearch(autocomplete, selection = 'manual') {
  return new Combobox({
    autocomplete,
    id: 'fruit',
    kind: 'editable',
    label: 'Fruit',
    rows: ROWS,
    selection,
    suggest: suggestFruit,
  })
}

/**
 * A select-only combobox over ten billion numbered items.
 * @param {number} [chosen] - The number chosen to start with
 * @returns {Combobox<Numbered, Range>} The combobox
 */
function numberSelect(chosen) {
  return new Combobox({
    id: 'number',
    kind: 'select-only',
    label: 'Number',
    rows: ROWS,
    source: numbers(TEN_BILLION).source,
    text: numberText,
    ...(chosen === undefined ? {} : { value: { id: chosen } }),
  })
}

export { FRUIT, fruitSearch, fruitSelect, fruitSource, numberSelect }
