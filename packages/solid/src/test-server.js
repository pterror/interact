/**
 * Renders the dialog around a select on a server, for the hydration test: run with Solid's server build (`bun
 * --conditions node`, and the conditions its version's tests are given), it prints the HTML
 */

import { arraySource } from '@pterror/interact-core'
import { createComponent } from 'solid-js'

import { dialog, renderToString, Select } from '#test-solid'

const FRUIT = ['Apple', 'Banana', 'Cherry', 'Date', 'Elderberry', 'Fig']
const PickDialog = dialog(Select, ['content', 'trigger'])

const html = renderToString(() =>
  createComponent(PickDialog, {
    closeLabel: 'Close',
    ignoreOutside: false,
    content: { defaultValue: 'Banana', label: 'Fruit', placeholder: 'Choose a fruit', rows: 4, source: 'fruit' },
    defaultOpen: true,
    sources: { fruit: arraySource(FRUIT) },
    title: 'Pick a fruit',
  }),
)
process.stdout.write(html)
