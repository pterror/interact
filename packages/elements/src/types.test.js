/**
 * The elements' types, checked by the type checker: each `true` below is typed by a comparison of them that only
 * holds while they are as the test says
 */

import { expect, test } from 'bun:test'

import { register } from './register.js'

/** @import { JSX as ReactJSX } from 'react' */
/** @import { JSX as SolidJSX } from 'solid-js' */
/** @import { SvelteHTMLElements } from 'svelte/elements' */
/** @import { Item, Key } from '@pterror/interact-core' */

/**
 * Whether two types are the same
 * @template A, B
 * @typedef {[A] extends [B] ? ([B] extends [A] ? true : false) : false} Same
 */

/** @typedef {HTMLElementTagNameMap['interact-select']} SelectElement */

/** @type {Same<SelectElement['rows'], number>} */
const rows = true

/** @type {Same<SelectElement['value'], Key | null>} */
const value = true

/** @type {Same<SelectElement['items'], readonly Item[] | undefined>} */
const items = true

/** @type {Same<NonNullable<SvelteHTMLElements['interact-dialog']['open']>, boolean>} */
const open = true

/** @type {Same<NonNullable<ReactJSX.IntrinsicElements['interact-select']['label']>, string>} */
const reactLabel = true

/** @type {Same<NonNullable<SolidJSX.IntrinsicElements['interact-menu']['disabled']>, readonly Key[]>} */
const solidDisabled = true

test('type each element by its tag, in the DOM and in each framework', () => {
  register()
  const select = document.createElement('interact-select')
  select.items = [{ key: 'apple', text: 'Apple' }, 'banana']
  select.label = 'Fruit'
  expect([rows, value, items, open, reactLabel, solidDisabled, select.label]).toEqual([
    true,
    true,
    true,
    true,
    true,
    true,
    'Fruit',
  ])
})
