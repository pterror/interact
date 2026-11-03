import { describe, expect, test } from 'bun:test'

import { renderComponent } from './render-component.js'
import { Counter, counterView } from './test-helpers.js'

describe('renderComponent', () => {
  test('puts a shadow instance in a declarative shadow root, with a link to its stylesheet', () => {
    const markup = renderComponent(counterView, new Counter(), {
      mode: 'shadow',
      prefix: 'app',
      styles: { href: '/c.css' },
    })
    expect(markup).toStartWith(
      '<app-counter data-interact="counter"><template shadowrootmode="open"><link rel="stylesheet" href="/c.css" data-interact-styles="counter"><!--i[-->',
    )
    expect(markup).toEndWith('<!--i]--></template></app-counter>')
  })

  test('puts a light instance in the element, marked as light', () => {
    expect(renderComponent(counterView, new Counter(), { mode: 'light', prefix: 'app' })).toStartWith(
      '<app-counter data-interact="counter" dom-mode="light"><!--i[-->',
    )
  })

  test('asks where a shadow instance gets its styles', () => {
    expect(() => renderComponent(counterView, new Counter(), { mode: 'shadow', prefix: 'app' })).toThrow('needs styles')
  })
})
