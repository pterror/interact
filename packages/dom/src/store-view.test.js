/** @import { EffectType } from '@interact/core/state' */

import { describe, expect, test } from 'bun:test'

import { Store, defineEffect, defineField } from '@interact/core'

import { component } from './component.js'
import { css } from './css.js'
import { register } from './register.js'
import { storeView, viewContent, viewPlugin } from './store-view.js'
import { html } from './template.js'

/** @type {EffectType<number>} */
const set = defineEffect()

const count = defineField({
  create: () => 0,
  update: (value, transaction) => transaction.effectsOf(set).at(-1) ?? value,
})

const styles = css`
  @layer test {
    :where(:scope) {
      display: block;
    }
  }
`

describe('storeView', () => {
  test('renders the state, and runs view plugins with the element, told what applied since each render', async () => {
    /** @type {string[]} */
    const log = []
    const watching = viewPlugin((_store, root) => {
      log.push(`made in ${root.dataset['interact'] ?? root.tagName.toLowerCase()}`)
      return {
        destroy: () => {
          log.push('destroyed')
        },
        rendered: (transactions) => {
          log.push(`rendered "${root.textContent}" after ${String(transactions.length)}`)
        },
      }
    })
    const store = new Store([count, watching, viewContent.of((state) => html`<b>${state.field(count)}</b>`)])
    const view = storeView({ kind: 'counted', styles })
    register([component(view, () => store)], { mode: 'light', prefix: 'store' })
    const element = document.createElement('store-counted')
    document.body.append(element)
    store.dispatch({ effects: set.of(1) })
    store.dispatch({ effects: set.of(2) })
    await Promise.resolve()
    element.remove()
    expect(log).toEqual(['made in counted', 'rendered "0" after 0', 'rendered "2" after 2', 'destroyed'])
  })
})

describe('a store view with nothing saying what it shows', () => {
  test('is an error that names what to include', () => {
    const view = storeView({ kind: 'empty', styles })
    expect(() => view.render(new Store([count]))).toThrow('include an extension giving viewContent')
  })
})
