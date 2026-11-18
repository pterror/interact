/**
 * Renders the dialog around a select on a server, for the hydration test: run with Svelte's server build (`bun
 * --conditions node`), it prints the HTML
 */

import { arraySource } from '@pterror/interact-core'

import { compiled, load, MAJOR } from './test-svelte.js'

const FRUIT = ['Apple', 'Banana', 'Cherry', 'Date', 'Elderberry', 'Fig']
const server = await load(await compiled('server'))
const props = {
  closeLabel: 'Close',
  ignoreOutside: false,
  content: {
    disabled: false,
    defaultValue: 'Banana',
    label: 'Fruit',
    placeholder: 'Choose a fruit',
    rows: 4,
    source: 'fruit',
  },
  of: { content: server['select'], initialFocus: ['content', 'trigger'] },
  open: true,
  sources: { fruit: arraySource(FRUIT) },
  title: 'Pick a fruit',
}
/**
 * Whether a compiled module's export is a Svelte 5 component: a function
 * @param {unknown} value - The export
 * @returns {value is import('svelte').Component<Record<string, unknown>>} Whether it is
 */
function isComponent(value) {
  return typeof value === 'function'
}

/**
 * Whether a value is Svelte 4's server render
 * @param {unknown} value - The value
 * @returns {value is (props: Readonly<Record<string, unknown>>) => unknown} Whether it is a function
 */
function isRender(value) {
  return typeof value === 'function'
}

const { Dialog } = server
if (MAJOR >= 5) {
  const { render } = await import('svelte/server')
  if (!isComponent(Dialog)) {
    throw new TypeError('No dialog')
  }
  process.stdout.write(render(Dialog, { props }).body)
} else {
  /** @type {unknown} */
  const render = typeof Dialog === 'object' && Dialog !== null && 'render' in Dialog ? Dialog.render : null
  const rendered = isRender(render) ? render(props) : null
  process.stdout.write(
    typeof rendered === 'object' && rendered !== null && 'html' in rendered ? String(rendered.html) : '',
  )
}
