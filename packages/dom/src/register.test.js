import { describe, expect, test } from 'bun:test'

import { register } from './register.js'
import { testElements } from './test-helpers.js'

describe('register', () => {
  test('registers under a prefix, and the same class again under another', () => {
    const { CounterElement } = testElements()
    expect(register([CounterElement], { prefix: 'first' })).toEqual(new Map([['counter', 'first-counter']]))
    expect(register([CounterElement], { prefix: 'second' })).toEqual(new Map([['counter', 'second-counter']]))
    expect(customElements.get('first-counter')).not.toBe(customElements.get('second-counter'))
  })

  test("gives instances the app's DOM mode unless they choose one", () => {
    const { CounterElement } = testElements()
    register([CounterElement], { mode: 'light', prefix: 'lit' })
    const chosen = document.createElement('lit-counter')
    chosen.setAttribute('dom-mode', 'shadow')
    const defaulted = document.createElement('lit-counter')
    document.body.append(chosen, defaulted)
    expect([chosen.shadowRoot === null, defaulted.shadowRoot === null]).toEqual([false, true])
    expect(defaulted.dataset['interact']).toBe('counter')
    chosen.remove()
    defaulted.remove()
  })
})
