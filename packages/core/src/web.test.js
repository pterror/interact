import { expect, test } from 'bun:test'

import { attributesOf, idOf } from './web.js'

/** @import { Naming } from './web.js' */

test('a named part can keep an existing application id without changing the other ids', () => {
  /** @type {Naming} */
  const naming = {
    idOf: (target) =>
      target.owner.length === 0 && target.part === 'trigger'
        ? 'old-setting-id'
        : idOf(target, { id: 'setting', keyId: String }),
  }
  expect(idOf({ owner: [], part: 'trigger', item: null }, naming)).toBe('old-setting-id')
  expect(idOf({ owner: ['list'], part: 'root', item: null }, naming)).toBe('setting-list-root')
})

test('a reference and the referenced element use the same application naming resolver', () => {
  /** @type {Naming} */
  const naming = {
    idOf: (target) =>
      target.owner.length === 1 && target.owner[0] === 'list' && target.part === 'root'
        ? 'existing-list'
        : idOf(target, { id: 'setting', keyId: String }),
  }
  const target = { owner: ['list'], part: 'root', item: null }
  const attributes = attributesOf(
    {
      role: 'combobox',
      aria: { controls: target },
      data: {},
      tabindex: 0,
      hidden: false,
      popup: null,
      listens: [],
      content: [],
      target: { owner: [], part: 'trigger', item: null },
    },
    naming,
    null,
  )
  expect(attributes.get('aria-controls')).toBe(idOf(target, naming))
  expect(attributes.get('aria-controls')).toBe('existing-list')
})
