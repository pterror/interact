import { describe, expect, test } from 'bun:test'

import { register, renderComponent } from '@interact/dom'

import { listboxElement } from './listbox-element.js'
import { listboxView } from './listbox-view.js'
import { TEN_BILLION, numbers, tenBillionListbox } from './test-helpers.js'

const FIVE_BILLION = 5_000_000_000
const ROWS = 10
const OVERSCAN = 5

describe('listboxElement', () => {
  test('is a class the app registers, each instance making its listbox from its element', () => {
    /** @type {HTMLElement[]} */
    const hosts = []
    const Element = listboxElement((host) => {
      hosts.push(host)
      return tenBillionListbox(numbers(TEN_BILLION).source, FIVE_BILLION)
    })
    register([Element], { prefix: 'el' })
    const element = document.createElement('el-listbox')
    document.body.append(element)
    expect(hosts).toEqual([element])
    expect(element.shadowRoot?.querySelectorAll('[role="option"]')).toHaveLength(ROWS + OVERSCAN + OVERSCAN)
  })
})

describe('the listbox on the server', () => {
  test('renders the options in the window, named for assistive technology', () => {
    const markup = renderComponent(listboxView(), tenBillionListbox(numbers(TEN_BILLION).source, FIVE_BILLION), {
      mode: 'light',
      prefix: 'x',
    })
    expect(markup).toContain('role="listbox"')
    expect(markup).toContain('aria-label="Numbers"')
    expect(markup).toContain('aria-multiselectable="true"')
    expect(markup).toContain('aria-setsize="10000000000"')
    expect(markup).toContain('>Item 5000000000<')
    expect(markup.match(/role="option"/gu)).toHaveLength(ROWS + OVERSCAN + OVERSCAN)
  })
})
