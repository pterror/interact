import { expect, test } from 'bun:test'

import { cheatsheetRow } from './cheatsheet-row.js'

test('the app decorates a filled row with its own entry metadata, and can clear it on update', () => {
  /** @type {Readonly<{ label: string, className: string }>} */
  let entry = { label: 'Remove', className: 'custom-action' }
  /** @type {(string | null)[]} */
  const seen = []
  const facet = cheatsheetRow({
    decorate: (value, element) => {
      seen.push(element.textContent)
      element.className = value.className
    },
    entryOf: () => entry,
    parts: () => [['Del']],
    watch: () => () => undefined,
  })
  const element = document.createElement('div')
  facet.apply('action', element)
  expect(element.className).toBe('custom-action')
  expect(element.querySelector('kbd')?.textContent).toBe('Del')
  entry = { label: 'Keep', className: '' }
  facet.apply('action', element)
  expect(element.className).toBe('')
  expect(seen).toEqual(['RemoveDel', 'KeepDel'])
  facet.apply({ category: 'Header' }, element)
  expect(seen).toHaveLength(2)
})
