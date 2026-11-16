/**
 * The elements' types, checked by the type checker: what this module writes is typed by them, and what it writes
 * wrong is an error they report
 */

import { expect, test } from 'bun:test'

import { register } from './register.js'

/** @import { JSX as ReactJSX } from 'react' */
/** @import { JSX as SolidJSX } from 'solid-js' */
/** @import { SvelteHTMLElements } from 'svelte/elements' */

test('type each element by its tag, in the DOM and in each framework', () => {
  register()
  const select = document.createElement('interact-select')
  select.items = [{ key: 'apple', text: 'Apple' }, 'banana']
  select.label = 'Fruit'
  // @ts-expect-error -- rows is a number
  select.rows = 'four'
  /** @type {string | number | null} */
  const value = select.value
  /** @type {ReactJSX.IntrinsicElements['interact-select']} */
  const react = { items: ['apple'], label: 'Fruit', name: 'fruit' }
  /** @type {SolidJSX.IntrinsicElements['interact-menu']} */
  const solid = { disabled: [], label: 'Edit' }
  /** @type {SvelteHTMLElements['interact-dialog']} */
  // @ts-expect-error -- the dialog's open is a flag
  const svelte = { open: 'yes' }
  expect([value, react.label, solid.label, svelte.open]).toEqual([null, 'Fruit', 'Edit', 'yes'])
})
